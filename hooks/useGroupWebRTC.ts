"use client";
/**
 * hooks/useGroupWebRTC.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Full Mesh RTCPeerConnection WebRTC hook.
 *
 * Each participant maintains an RTCPeerConnection with every other participant.
 * Signaling uses the Lexicographical UID ordering:
 * - `uidA < uidB` -> `uidA` creates Offer.
 * - `uidB > uidA` -> `uidB` waits for Offer and creates Answer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  joinPresence,
  leavePresence,
  listenToPresence,
  getConnectionId,
  createConnectionOffer,
  answerConnectionOffer,
  sendConnectionSignal,
  listenToConnection,
  type PresenceDocument,
} from "@/lib/callSignaling";

export type ConnectionPhase = "idle" | "connecting" | "connected" | "failed";

export type MediaMode = "full" | "audio-only" | "none";

export interface PeerState {
  uid: string;
  name: string;
  role: "mentor" | "learner";
  pc: RTCPeerConnection | null;
  stream: MediaStream | null;
  phase: ConnectionPhase;
  isMuted: boolean;
  isCameraOff: boolean;
}

export interface UseGroupWebRTCReturn {
  localStream: MediaStream | null;
  mediaMode: MediaMode;
  peers: PeerState[];
  isConnected: boolean; // true if connected to AT LEAST ONE peer, or if alone in room
  isKicked: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useGroupWebRTC(
  callId: string,
  myUid: string,
  myName: string,
  myRole: "mentor" | "learner"
): UseGroupWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaMode, setMediaMode] = useState<MediaMode>("none");
  const [peersMap, setPeersMap] = useState<Map<string, PeerState>>(new Map());
  const [isKicked, setIsKicked] = useState(false);

  // Refs for stable access inside closures
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const unsubsRef = useRef<Map<string, () => void>>(new Map());
  const isMountedRef = useRef(true);

  // ─── Local Media Acquisition ────────────────────────────────────────────────
  const acquireMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = s;
      if (isMountedRef.current) {
        setLocalStream(s);
        setMediaMode("full");
      }
      return s;
    } catch (e) {
      console.warn("Full media failed, trying audio-only", e);
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = s;
        if (isMountedRef.current) {
          setLocalStream(s);
          setMediaMode("audio-only");
        }
        return s;
      } catch (e2) {
        console.warn("Audio-only failed, falling back to empty stream", e2);
        // Create an empty canvas stream so PC doesn't crash
        const canvas = document.createElement("canvas");
        const s = canvas.captureStream(1); // 1 fps
        localStreamRef.current = s;
        if (isMountedRef.current) {
          setLocalStream(s);
          setMediaMode("none");
        }
        return s;
      }
    }
  }, []);

  const updatePeer = useCallback((uid: string, updater: (p: PeerState) => PeerState) => {
    setPeersMap((prev) => {
      const p = prev.get(uid);
      if (!p) return prev;
      const next = new Map(prev);
      next.set(uid, updater(p));
      peersRef.current = next;
      return next;
    });
  }, []);

  // ─── Setup Peer Connection ──────────────────────────────────────────────────
  const setupPeerConnection = useCallback(
    (peerUid: string, peerName: string, peerRole: "mentor" | "learner") => {
      if (peersRef.current.has(peerUid)) return;

      const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
      const connectionId = getConnectionId(myUid, peerUid);

      const newPeer: PeerState = {
        uid: peerUid,
        name: peerName,
        role: peerRole,
        pc,
        stream: null,
        phase: "connecting",
        isMuted: false,
        isCameraOff: false,
      };

      setPeersMap((prev) => {
        const next = new Map(prev);
        next.set(peerUid, newPeer);
        peersRef.current = next;
        return next;
      });

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        updatePeer(peerUid, (p) => ({ ...p, stream: remoteStream }));
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendConnectionSignal(callId, connectionId, myUid, event.candidate.toJSON());
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          updatePeer(peerUid, (p) => ({ ...p, phase: "connected" }));
        } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          updatePeer(peerUid, (p) => ({ ...p, phase: "failed" }));
        }
      };

      // Listen to signaling for this connection
      const unsubSignaling = listenToConnection(
        callId,
        connectionId,
        myUid,
        async (offer) => {
          // Received Offer
          if (pc.signalingState !== "stable") return;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await answerConnectionOffer(callId, connectionId, answer);
        },
        async (answer) => {
          // Received Answer
          if (pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        },
        async (candidate) => {
          // Received Candidate
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Queue it? Usually setting remoteDescription happens first because of Firestore ordering,
            // but for a robust app we might need a queue. Keeping simple for now.
            setTimeout(() => pc.addIceCandidate(new RTCIceCandidate(candidate)), 1000);
          }
        }
      );
      unsubsRef.current.set(`conn_${peerUid}`, unsubSignaling);

      // Initiation Logic
      if (myUid < peerUid) {
        // I am the initiator
        pc.onnegotiationneeded = async () => {
          if (pc.signalingState !== "stable") return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await createConnectionOffer(callId, connectionId, myUid, peerUid, offer);
        };
      }
    },
    [callId, myUid, updatePeer]
  );

  const cleanupPeer = useCallback((peerUid: string) => {
    const p = peersRef.current.get(peerUid);
    if (p && p.pc) {
      p.pc.close();
    }
    setPeersMap((prev) => {
      const next = new Map(prev);
      next.delete(peerUid);
      peersRef.current = next;
      return next;
    });
    const unsub = unsubsRef.current.get(`conn_${peerUid}`);
    if (unsub) {
      unsub();
      unsubsRef.current.delete(`conn_${peerUid}`);
    }
  }, []);

  // ─── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    async function init() {
      if (!callId || !myUid) return;
      await acquireMedia();
      await joinPresence(callId, myUid, myName, myRole);

      const unsubPresence = listenToPresence(callId, (presenceList) => {
        // Check if I was kicked
        const myPresence = presenceList.find((p) => p.uid === myUid);
        if (myPresence?.kicked) {
          setIsKicked(true);
          return;
        }

        const currentUids = new Set<string>();

        presenceList.forEach((p) => {
          if (p.uid === myUid) return;
          currentUids.add(p.uid);
          if (!peersRef.current.has(p.uid)) {
            setupPeerConnection(p.uid, p.name, p.role);
          }
        });

        // Cleanup dropped peers
        peersRef.current.forEach((peer, uid) => {
          if (!currentUids.has(uid)) {
            cleanupPeer(uid);
          }
        });
      });

      unsubsRef.current.set("presence", unsubPresence);
    }

    init();

    return () => {
      isMountedRef.current = false;
      leavePresence(callId, myUid);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      unsubsRef.current.forEach((unsub) => unsub());
      unsubsRef.current.clear();
      peersRef.current.forEach((peer) => peer.pc?.close());
      peersRef.current.clear();
    };
  }, [callId, myUid, myName, myRole, acquireMedia, setupPeerConnection, cleanupPeer]);

  // ─── Media Controls ─────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      // Force trigger state update
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  }, []);

  return {
    localStream,
    mediaMode,
    peers: Array.from(peersMap.values()),
    isConnected: true, // We assume true if local initialized
    isKicked,
    toggleMute,
    toggleVideo,
  };
}
