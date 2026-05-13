"use client";
/**
 * hooks/useWebRTC.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Native RTCPeerConnection WebRTC hook — NO simple-peer.
 *
 * Roles
 * ─────
 *   • Mentor  = initiator → startCall() → createOffer ONLY
 *   • Learner = receiver  → joinCall()  → createAnswer ONLY
 *
 * Guards
 * ──────
 *   isInitializedRef      — prevents double-init
 *   hasCreatedOfferRef    — mentor creates offer exactly once
 *   hasProcessedOfferRef  — learner processes offer exactly once
 *   hasProcessedAnswerRef — mentor processes answer exactly once
 *   iceCandidateQueueRef  — buffers ICE until remoteDescription is set
 *
 * Media fallback (never blocks peer connection)
 * ─────────────────────────────────────────────
 *   1. Try video + audio (full)
 *   2. If camera unavailable → try audio-only
 *   3. If all media unavailable → empty MediaStream (still connects)
 *   mediaMode reflects which tier was used.
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
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

export type ConnectionPhase =
  | "idle"        // not started
  | "waiting"     // mentor: waiting for learner
  | "ringing"     // learner: mentor started, awaiting join tap
  | "connecting"  // SDP exchange in progress
  | "connected"   // ICE connected, streams flowing
  | "ended";

export interface UseWebRTCOptions {
  callId: string;
  myUid: string;
  mediaConstraints?: MediaStreamConstraints;
  iceServers?: RTCIceServer[];
}

/** What media tier was acquired for the local stream. */
export type MediaMode = "full" | "audio-only" | "none";

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  connectionPhase: ConnectionPhase;
  callStatus: CallStatus | null;
  /** Indicates which media tier is active — drives UI banners. */
  mediaMode: MediaMode;
  error: string | null;
  startCall: () => Promise<void>;
  joinCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const log = (msg: string, ...a: unknown[]) =>
  console.log(`[WebRTC] ${msg}`, ...a);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTC({
  callId,
  myUid,
  mediaConstraints = { video: true, audio: true },
  iceServers = DEFAULT_ICE,
}: UseWebRTCOptions): UseWebRTCReturn {

  // ── Stable refs ───────────────────────────────────────────────────────────
  const pcRef              = useRef<RTCPeerConnection | null>(null);
  const localStreamRef     = useRef<MediaStream | null>(null);
  const unsubsRef          = useRef<Array<() => void>>([]);
  const iceCandidateQueue  = useRef<RTCIceCandidateInit[]>([]);
  const isMountedRef       = useRef(true);

  // Signal-flow guards
  const isInitializedRef      = useRef(false);
  const hasCreatedOfferRef    = useRef(false);
  const hasProcessedOfferRef  = useRef(false);
  const hasProcessedAnswerRef = useRef(false);
  const addedCandidatesRef    = useRef<Set<string>>(new Set());

  // ── Reactive state ────────────────────────────────────────────────────────
  const [localStream,     setLocalStream]     = useState<MediaStream | null>(null);
  const [remoteStream,    setRemoteStream]    = useState<MediaStream | null>(null);
  const [isConnected,     setIsConnected]     = useState(false);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>("idle");
  const [callStatus,      setCallStatus]      = useState<CallStatus | null>(null);
  const [mediaMode,       setMediaMode]       = useState<MediaMode>("none");
  const [error,           setError]           = useState<string | null>(null);

  // ── Unmount cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      _cleanup(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Internal helpers — all use only stable refs so closure-capture is safe
  // ─────────────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function safeSet(setter: Dispatch<SetStateAction<any>>, v: unknown) {
    if (isMountedRef.current) setter(v);
  }

  /**
   * Tiered media acquisition — NEVER throws, always returns a MediaStream.
   *
   * Tier 1: video + audio  → mediaMode "full"
   * Tier 2: audio only     → mediaMode "audio-only" (camera in use / missing)
   * Tier 3: empty stream   → mediaMode "none"  (no devices at all)
   */
  async function acquireMedia(): Promise<MediaStream> {
    if (localStreamRef.current) return localStreamRef.current;
    log("Acquiring local media — trying video+audio first");

    // Tier 1: full media
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = s;
      safeSet(setLocalStream, s);
      safeSet(setMediaMode, "full");
      log("Media acquired: full (video+audio)");
      return s;
    } catch (e1) {
      log("Full media failed:", (e1 as Error).message, "— trying audio-only");
    }

    // Tier 2: audio only
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      localStreamRef.current = s;
      safeSet(setLocalStream, s);
      safeSet(setMediaMode, "audio-only");
      log("Media acquired: audio-only");
      return s;
    } catch (e2) {
      log("Audio-only also failed:", (e2 as Error).message, "— using empty stream");
    }

    // Tier 3: empty stream — peer connection still works, remote stream still receives
    const empty = new MediaStream();
    localStreamRef.current = empty;
    safeSet(setLocalStream, empty);
    safeSet(setMediaMode, "none");
    log("Media acquired: none (empty stream)");
    return empty;
  }

  function buildPC(): RTCPeerConnection {
    _closePC(); // destroy any existing connection first
    log("Creating RTCPeerConnection");
    const pc = new RTCPeerConnection({ iceServers });

    pc.ontrack = (ev) => {
      log("Remote track received:", ev.track.kind);
      const [stream] = ev.streams;
      if (stream) safeSet(setRemoteStream, stream);
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) { log("ICE gathering complete"); return; }
      log("Sending ICE candidate");
      sendSignal(callId, myUid, ev.candidate.toJSON()).catch(
        (e) => console.error("[WebRTC] sendSignal failed:", e)
      );
    };

    pc.oniceconnectionstatechange = () => {
      log("ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        safeSet(setIsConnected, true);
        safeSet(setConnectionPhase, "connected" as ConnectionPhase);
      } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        safeSet(setIsConnected, false);
        safeSet(setConnectionPhase, "ended" as ConnectionPhase);
      } else if (pc.iceConnectionState === "disconnected") {
        safeSet(setIsConnected, false);
      }
    };

    pc.onconnectionstatechange = () => log("Connection state:", pc.connectionState);
    pc.onsignalingstatechange  = () => log("Signaling state:", pc.signalingState);

    pcRef.current = pc;
    return pc;
  }

  function _closePC() {
    const pc = pcRef.current;
    if (!pc) return;
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.oniceconnectionstatechange = null;
    pc.onconnectionstatechange = null;
    pc.onsignalingstatechange = null;
    try { pc.close(); } catch { /* ignore */ }
    pcRef.current = null;
  }

  function _unsubAll() {
    unsubsRef.current.forEach((u) => { try { u(); } catch { /* ignore */ } });
    unsubsRef.current = [];
  }

  function _resetGuards() {
    isInitializedRef.current      = false;
    hasCreatedOfferRef.current    = false;
    hasProcessedOfferRef.current  = false;
    hasProcessedAnswerRef.current = false;
    iceCandidateQueue.current     = [];
    addedCandidatesRef.current.clear();
  }

  function _cleanup(notifyFirestore: boolean) {
    log("Cleanup — notifyFirestore:", notifyFirestore);
    _unsubAll();
    _closePC();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    _resetGuards();
    safeSet(setLocalStream,     null);
    safeSet(setRemoteStream,    null);
    safeSet(setIsConnected,     false);
    safeSet(setMediaMode,       "none");
    safeSet(setConnectionPhase, "ended" as ConnectionPhase);
    if (notifyFirestore) firestoreEndCall(callId).catch(() => { /* best-effort */ });
  }

  async function drainICEQueue(pc: RTCPeerConnection) {
    const queued = iceCandidateQueue.current.splice(0);
    if (!queued.length) return;
    log(`Draining ${queued.length} buffered ICE candidates`);
    for (const c of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.error("[WebRTC] Queued ICE failed:", e); }
    }
  }

  async function handleICE(candidate: RTCIceCandidateInit) {
    const pc = pcRef.current;
    if (!pc) return;

    const candidateStr = JSON.stringify(candidate);
    if (addedCandidatesRef.current.has(candidateStr)) return;
    addedCandidatesRef.current.add(candidateStr);

    if (!pc.remoteDescription) {
      log("ICE buffered (no remoteDescription yet)");
      iceCandidateQueue.current.push(candidate);
      return;
    }
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); log("ICE applied"); }
    catch (e) { console.error("[WebRTC] addIceCandidate failed:", e); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * MENTOR / INITIATOR — creates offer, writes to Firestore, waits for answer.
   */
  const startCall = useCallback(async () => {
    if (isInitializedRef.current) { log("startCall: already running"); return; }
    if (!callId || !myUid) { setError("Missing callId or uid"); return; }

    isInitializedRef.current = true;
    safeSet(setError, null);
    safeSet(setConnectionPhase, "waiting" as ConnectionPhase);

    try {
      const stream = await acquireMedia(); // never throws
      const pc     = buildPC();

      // Only add tracks if the stream has them (skip for empty stream)
      const tracks = stream.getTracks();
      if (tracks.length > 0) {
        tracks.forEach((t) => { pc.addTrack(t, stream); log("Track added:", t.kind); });
      } else {
        log("No local tracks — proceeding with receive-only offer");
      }

      // Create offer — guarded
      if (hasCreatedOfferRef.current) { log("Offer already created"); return; }
      hasCreatedOfferRef.current = true;
      log("Mentor: creating offer");

      // offerToReceiveVideo/Audio ensures mentor can receive learner stream
      // even if learner joins without camera
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      if (pc.signalingState !== "stable") {
        throw new Error(`Bad signalingState for offer: ${pc.signalingState}`);
      }
      await pc.setLocalDescription(offer);
      log("Mentor: local description (offer) set");

      await createCall(callId, myUid, { type: offer.type, sdp: offer.sdp! });
      log("Offer written to Firestore");

      // Listen for learner's answer + ICE
      const unsub = listenForSignals(callId, myUid, {
        onAnswer: async (answer) => {
          if (hasProcessedAnswerRef.current) { log("Answer duplicate — ignored"); return; }
          const p = pcRef.current;
          if (!p) return;

          if (p.signalingState !== "have-local-offer") {
            log(`Cannot apply answer: signalingState is ${p.signalingState}`);
            return;
          }

          hasProcessedAnswerRef.current = true;
          log("Mentor: applying remote description (answer)");
          try {
            await p.setRemoteDescription(new RTCSessionDescription(answer));
            log("Mentor: remote description set");
            safeSet(setConnectionPhase, "connecting" as ConnectionPhase);
            await drainICEQueue(p);
          } catch (e) {
            console.error("[WebRTC] setRemoteDescription (answer) failed:", e);
            safeSet(setError, `Connection failed: ${(e as Error).message}`);
            _cleanup(false);
          }
        },
        onCandidate: handleICE,
        onStatusChange: (s) => {
          safeSet(setCallStatus, s);
          if (s === "ended") _cleanup(false);
        },
      });

      unsubsRef.current.push(unsub);
    } catch (e) {
      log("startCall error:", e);
      _cleanup(false);
      safeSet(setConnectionPhase, "idle" as ConnectionPhase);
      safeSet(setError, (e as Error).message);
    }
  }, [callId, myUid]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * LEARNER / RECEIVER — waits for offer (or reads immediately), creates answer.
   */
  const joinCall = useCallback(async () => {
    if (isInitializedRef.current) { log("joinCall: already running"); return; }
    if (!callId || !myUid) { setError("Missing callId or uid"); return; }

    isInitializedRef.current = true;
    safeSet(setError, null);
    safeSet(setConnectionPhase, "ringing" as ConnectionPhase);

    try {
      const stream = await acquireMedia(); // never throws
      const pc     = buildPC();

      // Only add tracks if the stream has them
      const tracks = stream.getTracks();
      if (tracks.length > 0) {
        tracks.forEach((t) => { pc.addTrack(t, stream); log("Learner track added:", t.kind); });
      } else {
        log("Learner: no local tracks — proceeding receive-only");
      }

      // Process offer → create answer
      async function processOffer(offer: RTCSessionDescriptionInit) {
        if (hasProcessedOfferRef.current) { log("Offer duplicate — ignored"); return; }
        const p = pcRef.current;
        if (!p) return;

        if (p.signalingState !== "stable") {
          log(`Cannot process offer: signalingState is ${p.signalingState}`);
          return;
        }

        hasProcessedOfferRef.current = true;
        safeSet(setConnectionPhase, "connecting" as ConnectionPhase);
        log("Learner: applying remote description (offer)");

        try {
          await p.setRemoteDescription(new RTCSessionDescription(offer));
          log("Learner: remote description set (offer)");
          await drainICEQueue(p);

          log("Learner: creating answer");
          const answer = await p.createAnswer();

          if ((p.signalingState as string) !== "have-remote-offer") {
            log(`Cannot set local answer: signalingState is ${p.signalingState}`);
            return;
          }

          await p.setLocalDescription(answer);
          log("Learner: local description set (answer)");

          await firestoreJoinCall(callId, myUid, { type: answer.type, sdp: answer.sdp! });
          log("Answer written to Firestore");
        } catch (e) {
          console.error("[WebRTC] processOffer failed:", e);
          safeSet(setError, `Connection failed: ${(e as Error).message}`);
          _cleanup(false);
        }
      }

      // Check if offer already exists in Firestore
      const existingOffer = await getCallOffer(callId);

      if (existingOffer) {
        log("Existing offer found — processing immediately");
        await processOffer(existingOffer);

        const unsub = listenForSignals(callId, myUid, {
          onCandidate: handleICE,
          onStatusChange: (s) => {
            safeSet(setCallStatus, s);
            if (s === "ended") _cleanup(false);
          },
        });
        unsubsRef.current.push(unsub);
      } else {
        log("No offer yet — listening reactively");
        const unsub = listenForSignals(callId, myUid, {
          onOffer: processOffer,
          onCandidate: handleICE,
          onStatusChange: (s) => {
            safeSet(setCallStatus, s);
            if (s === "ended") _cleanup(false);
          },
        });
        unsubsRef.current.push(unsub);
      }
    } catch (e) {
      log("joinCall error:", e);
      _cleanup(false);
      safeSet(setConnectionPhase, "idle" as ConnectionPhase);
      safeSet(setError, (e as Error).message);
    }
  }, [callId, myUid]); // eslint-disable-line react-hooks/exhaustive-deps

  const endCall = useCallback(async () => {
    log("endCall triggered");
    _cleanup(true);
  }, [callId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    localStream,
    remoteStream,
    isConnected,
    connectionPhase,
    callStatus,
    mediaMode,
    error,
    startCall,
    joinCall,
    endCall,
  };
}
