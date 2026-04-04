"use client";
/**
 * hooks/useWebRTC.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained WebRTC hook.
 *
 * What it does
 * ────────────
 * • Acquires camera + microphone via mediaDevices.getUserMedia
 * • Uses simple-peer to negotiate the WebRTC connection
 * • Uses Firestore (callSignaling.ts) to exchange SDP + ICE candidates
 *
 * Public API
 * ──────────
 *   const {
 *     localStream,   // MediaStream | null  → attach to <video muted autoPlay>
 *     remoteStream,  // MediaStream | null  → attach to <video autoPlay>
 *     isConnected,   // boolean
 *     callStatus,    // "ringing" | "active" | "ended" | null
 *     error,         // string | null
 *     startCall,     // () => Promise<void>  — caller side
 *     joinCall,      // () => Promise<void>  — callee side
 *     endCall,       // () => Promise<void>  — either side
 *   } = useWebRTC({ callId, myUid });
 *
 * Typical usage
 * ─────────────
 *   // Attach streams to <video> elements
 *   useEffect(() => {
 *     if (localVideoEl.current)  localVideoEl.current.srcObject  = localStream;
 *     if (remoteVideoEl.current) remoteVideoEl.current.srcObject = remoteStream;
 *   }, [localStream, remoteStream]);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import SimplePeer, { type Instance, type SignalData } from "simple-peer";
import {
  createCall,
  endCall as firestoreEndCall,
  getCallOffer,
  joinCall as firestoreJoinCall,
  listenForSignals,
  sendSignal,
  type CallStatus,
} from "@/lib/callSignaling";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseWebRTCOptions {
  /** Firestore document ID – use the session ID so the call is scoped to it. */
  callId: string;
  /** Firebase Auth UID of the current user. */
  myUid: string;
  /** getUserMedia constraints. Defaults to camera + microphone. */
  mediaConstraints?: MediaStreamConstraints;
  /** STUN / TURN server list. Defaults to Google's public STUN servers. */
  iceServers?: RTCIceServer[];
}

export interface UseWebRTCReturn {
  /** Local camera + mic stream. Attach to a `<video muted autoPlay playsInline>`. */
  localStream: MediaStream | null;
  /** Remote peer's stream. Attach to a `<video autoPlay playsInline>`. */
  remoteStream: MediaStream | null;
  /** True once the peer data-channel is open. */
  isConnected: boolean;
  /** Tracks the Firestore call document's status field. */
  callStatus: CallStatus | null;
  /** Human-readable error message, or null when everything is fine. */
  error: string | null;
  /**
   * **Caller side.** Acquires media → creates a simple-peer initiator →
   * writes the SDP offer to Firestore → listens for the callee's answer + ICE.
   */
  startCall: () => Promise<void>;
  /**
   * **Callee side.** Acquires media → reads the SDP offer from Firestore →
   * creates a simple-peer receiver → writes the SDP answer → listens for ICE.
   */
  joinCall: () => Promise<void>;
  /**
   * **Either side.** Tears down the peer, stops all media tracks,
   * and marks the Firestore document as ended.
   */
  endCall: () => Promise<void>;
}

// ─── Default ICE configuration ────────────────────────────────────────────────

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTC({
  callId,
  myUid,
  mediaConstraints = { video: true, audio: true },
  iceServers = DEFAULT_ICE_SERVERS,
}: UseWebRTCOptions): UseWebRTCReturn {
  // ── Stable refs (mutated without triggering re-renders) ───────────────────
  const peerRef        = useRef<Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const unsubRef       = useRef<(() => void) | null>(null);

  // ── Reactive state (drives the UI) ────────────────────────────────────────
  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);
  const [callStatus,   setCallStatus]   = useState<CallStatus | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      unsubRef.current?.();
      destroyPeer(peerRef.current);
      stopAllTracks(localStreamRef.current);
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ────────────────────────────────────────────────────────────────────────────

  /** Acquires camera + mic (idempotent — reuses the stream if already open). */
  async function acquireLocalStream(): Promise<MediaStream> {
    if (localStreamRef.current) return localStreamRef.current;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    } catch (err) {
      throw new Error(
        `Camera / microphone access denied: ${(err as Error).message}`
      );
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }

  /**
   * Builds a simple-peer instance and attaches all event listeners.
   *
   * @param stream     The local MediaStream to send to the remote.
   * @param initiator  `true` for the caller, `false` for the callee.
   * @param onSignal   Called whenever simple-peer emits a signal (offer / answer / ICE).
   */
  function buildPeer(
    stream: MediaStream,
    initiator: boolean,
    onSignal: (data: SignalData) => void
  ): Instance {
    // Clean up any existing peer first
    destroyPeer(peerRef.current);
    unsubRef.current?.();

    const peer = new SimplePeer({
      initiator,
      trickle: true,               // send ICE candidates incrementally
      stream,
      config: { iceServers },
    });

    peer.on("signal",  onSignal);
    peer.on("stream",  (s: MediaStream) => setRemoteStream(s));
    peer.on("connect", ()             => setIsConnected(true));
    peer.on("close",   ()             => setIsConnected(false));
    peer.on("error",   (e: Error)    => setError(e.message));

    peerRef.current = peer;
    return peer;
  }

  /**
   * Subscribes to Firestore real-time listeners for the current call.
   * ICE candidates, offers, answers, and status changes all flow through here.
   *
   * `peerRef.current` must already be set before calling this.
   */
  function attachFirestoreListeners() {
    unsubRef.current?.();

    const unsub = listenForSignals(callId, myUid, {
      // Callee edge-case: offer arrives via snapshot before joinCall() reads it
      onOffer: (offer) =>
        peerRef.current?.signal(offer as unknown as SignalData),

      // Caller side: receives the callee's SDP answer
      onAnswer: (answer) =>
        peerRef.current?.signal(answer as unknown as SignalData),

      // Both sides: feed remote ICE candidates into the peer
      onCandidate: (candidate) =>
        peerRef.current?.signal(candidate as unknown as SignalData),

      // Track status changes (ringing → active → ended)
      onStatusChange: (status) => {
        setCallStatus(status);
        if (status === "ended") tearDown(/* updateFirestore */ false);
      },
    });

    unsubRef.current = unsub;
  }

  /**
   * Tears down the peer + media without touching Firestore.
   * Pass `true` only when we're the side initiating the end.
   */
  async function tearDown(updateFirestore: boolean) {
    unsubRef.current?.();
    unsubRef.current = null;

    destroyPeer(peerRef.current);
    peerRef.current = null;

    stopAllTracks(localStreamRef.current);
    localStreamRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);

    if (updateFirestore) {
      try { await firestoreEndCall(callId); } catch { /* best-effort */ }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * **startCall** — caller / initiator side.
   *
   * Flow:
   *   getUserMedia → build initiator peer → peer emits "offer" signal
   *   → createCall() writes offer to Firestore → attach Firestore listeners
   *   → when callee answers, onAnswer fires → peer.signal(answer)
   *   → ICE exchange completes → connection established
   */
  const startCall = useCallback(async () => {
    setError(null);
    try {
      const stream = await acquireLocalStream();

      let offerSaved = false;

      buildPeer(stream, /* initiator */ true, async (data: SignalData) => {
        if (data.type === "offer" && !offerSaved) {
          // First signal from initiator is always the SDP offer
          offerSaved = true;
          await createCall(callId, myUid, data as RTCSessionDescriptionInit);
          // Start listening for the callee's answer + their ICE candidates
          attachFirestoreListeners();
          return;
        }

        // Subsequent signals are ICE candidates (no .type field on them)
        if (!data.type) {
          await sendSignal(callId, myUid, data as RTCIceCandidateInit);
        }
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }, [callId, myUid, iceServers]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * **joinCall** — callee / receiver side.
   *
   * Flow:
   *   getUserMedia → fetch offer from Firestore (getCallOffer)
   *   → build receiver peer → peer.signal(offer) → peer emits "answer"
   *   → firestoreJoinCall() writes answer → attach Firestore listeners
   *   → ICE exchange completes → connection established
   */
  const joinCall = useCallback(async () => {
    setError(null);
    try {
      const stream = await acquireLocalStream();

      // Retrieve the SDP offer the caller stored in Firestore
      const offer = await getCallOffer(callId);
      if (!offer) throw new Error(`No offer found for call "${callId}"`);

      let answerSaved = false;

      const peer = buildPeer(stream, /* initiator */ false, async (data: SignalData) => {
        if (data.type === "answer" && !answerSaved) {
          // First signal from receiver is the SDP answer
          answerSaved = true;
          await firestoreJoinCall(callId, myUid, data as RTCSessionDescriptionInit);
          return;
        }

        // Subsequent signals are ICE candidates
        if (!data.type) {
          await sendSignal(callId, myUid, data as RTCIceCandidateInit);
        }
      });

      // Feed the offer into simple-peer — this triggers the "answer" signal above
      peer.signal(offer as unknown as SignalData);

      // Watch for the caller's ICE candidates + any status updates
      attachFirestoreListeners();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [callId, myUid, iceServers]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * **endCall** — either side.
   * Stops media, destroys the peer, and writes "ended" to Firestore
   * so the remote peer knows to hang up too.
   */
  const endCall = useCallback(async () => {
    await tearDown(/* updateFirestore */ true);
  }, [callId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    localStream,
    remoteStream,
    isConnected,
    callStatus,
    error,
    startCall,
    joinCall,
    endCall,
  };
}

// ─── Module-level utilities ───────────────────────────────────────────────────

function destroyPeer(peer: Instance | null | undefined) {
  try { peer?.destroy(); } catch { /* ignore */ }
}

function stopAllTracks(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}
