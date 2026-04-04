"use client";
/**
 * hooks/useWebRTC.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained WebRTC hook with strict role enforcement.
 *
 * Roles
 * ─────
 *   • Mentor  = initiator  → calls startCall() → createOffer only
 *   • Learner = receiver   → calls joinCall()  → createAnswer only
 *
 * Key guarantees
 * ──────────────
 *   1. hasStartedRef prevents both sides from initiating simultaneously.
 *   2. joinCall() watches Firestore in real-time and auto-connects the
 *      moment the mentor's offer lands — no manual polling required.
 *   3. The `connectionPhase` field gives the UI a richer status than
 *      the raw `isConnected` boolean.
 *
 * Public API
 * ──────────
 *   const {
 *     localStream,      // MediaStream | null
 *     remoteStream,     // MediaStream | null
 *     isConnected,      // boolean
 *     connectionPhase,  // "idle"|"waiting"|"joining"|"connected"|"ended"
 *     callStatus,       // "ringing"|"active"|"ended"|null  (Firestore)
 *     error,            // string | null
 *     startCall,        // () => Promise<void>  — mentor / initiator
 *     joinCall,         // () => Promise<void>  — learner / receiver
 *     endCall,          // () => Promise<void>  — either side
 *   } = useWebRTC({ callId, myUid });
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

/** Fine-grained phase driven by this hook — maps 1-to-1 to the UI overlay states. */
export type ConnectionPhase = "idle" | "waiting" | "joining" | "connected" | "ended";

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
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  /** True once the WebRTC data-channel / ICE is fully connected. */
  isConnected: boolean;
  /** Rich UX phase — use this to drive overlays and control bar states. */
  connectionPhase: ConnectionPhase;
  /** Raw Firestore call-document status (ringing / active / ended). */
  callStatus: CallStatus | null;
  error: string | null;
  startCall: () => Promise<void>;
  joinCall: () => Promise<void>;
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

  // ── Stable refs ───────────────────────────────────────────────────────────
  const peerRef        = useRef<Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const unsubRef       = useRef<(() => void) | null>(null);
  /**
   * Prevents both startCall() and joinCall() from running simultaneously.
   * Reset to null in endCall() so a fresh call can start.
   */
  const hasStartedRef  = useRef<"initiator" | "receiver" | null>(null);
  /**
   * Prevent the receiver from creating multiple peer instances if the
   * Firestore offer snapshot fires more than once.
   */
  const receiverPeerBuiltRef = useRef(false);

  // ── Reactive state ────────────────────────────────────────────────────────
  const [localStream,     setLocalStream]     = useState<MediaStream | null>(null);
  const [remoteStream,    setRemoteStream]    = useState<MediaStream | null>(null);
  const [isConnected,     setIsConnected]     = useState(false);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>("idle");
  const [callStatus,      setCallStatus]      = useState<CallStatus | null>(null);
  const [error,           setError]           = useState<string | null>(null);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      unsubRef.current?.();
      destroyPeer(peerRef.current);
      stopAllTracks(localStreamRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Acquires camera + mic (idempotent). */
  async function acquireLocalStream(): Promise<MediaStream> {
    if (localStreamRef.current) return localStreamRef.current;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    } catch (err) {
      throw new Error(`Camera / microphone access denied: ${(err as Error).message}`);
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }

  /**
   * Builds a SimplePeer instance with event listeners.
   * @param initiator  true = mentor (creates offer), false = learner (creates answer).
   */
  function buildPeer(
    stream: MediaStream,
    initiator: boolean,
    onSignal: (data: SignalData) => void
  ): Instance {
    destroyPeer(peerRef.current);
    unsubRef.current?.();

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream,
      config: { iceServers },
    });

    peer.on("signal",  onSignal);
    peer.on("stream",  (s: MediaStream) => setRemoteStream(s));
    peer.on("connect", () => {
      setIsConnected(true);
      setConnectionPhase("connected");
    });
    peer.on("close",   () => {
      setIsConnected(false);
    });
    peer.on("error",   (e: Error) => setError(e.message));

    peerRef.current = peer;
    return peer;
  }

  /**
   * Subscribes to Firestore real-time signals for this call.
   * Role-specific: initiator only handles answer, receiver only handles offer.
   */
  function attachFirestoreListeners(role: "initiator" | "receiver") {
    unsubRef.current?.();

    const unsub = listenForSignals(callId, myUid, {
      // Receiver: when offer arrives (real-time), build peer + answer
      onOffer:
        role === "receiver"
          ? (offer) => {
              if (receiverPeerBuiltRef.current) return; // idempotent
              receiverPeerBuiltRef.current = true;
              setConnectionPhase("joining");
              void buildReceiverPeer(offer);
            }
          : undefined,

      // Initiator: when answer arrives, feed it into the peer
      onAnswer:
        role === "initiator"
          ? (answer) => peerRef.current?.signal(answer as unknown as SignalData)
          : undefined,

      // Both: exchange ICE candidates
      onCandidate: (candidate) =>
        peerRef.current?.signal(candidate as unknown as SignalData),

      // Both: watch Firestore status
      onStatusChange: (status) => {
        setCallStatus(status);
        if (status === "ended") void tearDown(false);
      },
    });

    unsubRef.current = unsub;
  }

  /**
   * Helper: builds the receiver (learner) peer from a known offer.
   * Separated so it can be called both from joinCall() (when offer exists)
   * and from the onOffer Firestore listener (reactive join).
   */
  async function buildReceiverPeer(offer: RTCSessionDescriptionInit) {
    const stream = await acquireLocalStream();
    let answerSaved = false;

    const peer = buildPeer(stream, false, async (data: SignalData) => {
      if (data.type === "answer" && !answerSaved) {
        answerSaved = true;
        await firestoreJoinCall(callId, myUid, data as RTCSessionDescriptionInit);
        return;
      }
      if (!data.type) {
        await sendSignal(callId, myUid, data as RTCIceCandidateInit);
      }
    });

    // Feed the offer → triggers peer to generate an answer
    peer.signal(offer as unknown as SignalData);
  }

  /** Tears down the peer + media. Pass true only when we're initiating the end. */
  async function tearDown(updateFirestore: boolean) {
    unsubRef.current?.();
    unsubRef.current = null;

    destroyPeer(peerRef.current);
    peerRef.current = null;

    stopAllTracks(localStreamRef.current);
    localStreamRef.current = null;

    hasStartedRef.current       = null;
    receiverPeerBuiltRef.current = false;

    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);
    setConnectionPhase("ended");

    if (updateFirestore) {
      try { await firestoreEndCall(callId); } catch { /* best-effort */ }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * **startCall** — MENTOR / INITIATOR only.
   *
   * Flow:
   *   getUserMedia → build initiator peer (creates SDP offer automatically)
   *   → offer signal → createCall() writes offer to Firestore
   *   → attachFirestoreListeners("initiator") waits for learner's answer + ICE
   *   → ICE exchange → connected
   */
  const startCall = useCallback(async () => {
    if (hasStartedRef.current) {
      setError("Call already started.");
      return;
    }
    hasStartedRef.current = "initiator";
    setError(null);
    setConnectionPhase("waiting"); // mentor is waiting for learner to join

    try {
      const stream = await acquireLocalStream();
      let offerSaved = false;

      buildPeer(stream, true, async (data: SignalData) => {
        if (data.type === "offer" && !offerSaved) {
          offerSaved = true;
          await createCall(callId, myUid, data as RTCSessionDescriptionInit);
          // Now listen for the learner's answer + ICE candidates
          attachFirestoreListeners("initiator");
          return;
        }
        if (!data.type) {
          await sendSignal(callId, myUid, data as RTCIceCandidateInit);
        }
      });
    } catch (err) {
      hasStartedRef.current = null;
      setConnectionPhase("idle");
      setError((err as Error).message);
    }
  }, [callId, myUid, iceServers]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * **joinCall** — LEARNER / RECEIVER only.
   *
   * Flow (two branches):
   *   A) Offer already exists in Firestore → immediately build peer + answer.
   *   B) Offer not yet written → attach Firestore listener; `onOffer` callback
   *      fires reactively when the mentor's offer arrives, then buildReceiverPeer().
   *
   * In both cases the learner NEVER calls createOffer().
   */
  const joinCall = useCallback(async () => {
    if (hasStartedRef.current) {
      setError("Already joining the call.");
      return;
    }
    hasStartedRef.current = "receiver";
    setError(null);
    setConnectionPhase("waiting"); // waiting for offer to arrive
    receiverPeerBuiltRef.current = false;

    try {
      // Speculatively acquire media so local video appears immediately
      await acquireLocalStream();

      // Check if offer already exists
      const existingOffer = await getCallOffer(callId);

      if (existingOffer) {
        // Offer is ready — connect immediately
        receiverPeerBuiltRef.current = true;
        setConnectionPhase("joining");
        await buildReceiverPeer(existingOffer);
        // Still attach listeners for ICE + status changes (no need for onOffer)
        attachFirestoreListeners("receiver");
      } else {
        // Offer not yet available — listen reactively via Firestore
        // The onOffer callback inside attachFirestoreListeners will build the peer
        attachFirestoreListeners("receiver");
        // Phase stays "waiting" until offer arrives
      }
    } catch (err) {
      hasStartedRef.current        = null;
      receiverPeerBuiltRef.current = false;
      setConnectionPhase("idle");
      setError((err as Error).message);
    }
  }, [callId, myUid, iceServers]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * **endCall** — either side.
   * Stops all media, destroys the peer, writes "ended" to Firestore.
   */
  const endCall = useCallback(async () => {
    await tearDown(true);
  }, [callId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    localStream,
    remoteStream,
    isConnected,
    connectionPhase,
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
