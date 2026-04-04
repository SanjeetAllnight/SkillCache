/**
 * lib/callSignaling.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firestore-backed WebRTC signaling layer.
 *
 * Firestore schema
 * ────────────────
 * calls/{callId}
 *   ├─ offer          : RTCSessionDescriptionInit | null
 *   ├─ answer         : RTCSessionDescriptionInit | null
 *   ├─ participants   : string[]          (array of uid strings)
 *   ├─ status         : CallStatus
 *   ├─ createdAt      : Timestamp
 *   └─ updatedAt      : Timestamp
 *
 * calls/{callId}/candidates/{candidateId}
 *   ├─ uid            : string            (who sent this candidate)
 *   ├─ candidate      : RTCIceCandidateInit
 *   └─ createdAt      : Timestamp
 *
 * Usage
 * ─────
 *   // Caller
 *   const callId = sessionId;
 *   await createCall(callId, callerUid, offer);
 *   const unsub = listenForSignals(callId, callerUid, { onAnswer, onCandidate });
 *
 *   // Callee
 *   await joinCall(callId, calleeUid, answer);
 *   const unsub = listenForSignals(callId, calleeUid, { onOffer, onCandidate });
 *
 *   // Both
 *   await sendSignal(callId, myUid, iceCandidate);
 *
 *   // Cleanup
 *   unsub();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const CALLS_COLLECTION = "calls";
const CANDIDATES_SUBCOLLECTION = "candidates";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallStatus = "ringing" | "active" | "ended";

export interface CallDocument {
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  participants: string[];
  status: CallStatus;
  createdAt: ReturnType<typeof serverTimestamp>;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

export interface CandidateDocument {
  uid: string;
  candidate: RTCIceCandidateInit;
  createdAt: ReturnType<typeof serverTimestamp>;
}

export interface SignalListenerOptions {
  /**
   * Fires when the remote side's SDP offer arrives (callee side).
   * Will NOT fire for the participant who originally sent the offer.
   */
  onOffer?: (offer: RTCSessionDescriptionInit) => void;
  /**
   * Fires when the remote side's SDP answer arrives (caller side).
   * Will NOT fire for the participant who originally sent the answer.
   */
  onAnswer?: (answer: RTCSessionDescriptionInit) => void;
  /**
   * Fires for every new ICE candidate from the *remote* peer.
   * Candidates sent by `myUid` are filtered out automatically.
   */
  onCandidate?: (candidate: RTCIceCandidateInit) => void;
  /** Fires when the call status changes. */
  onStatusChange?: (status: CallStatus) => void;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function callDocRef(callId: string) {
  return doc(db, CALLS_COLLECTION, callId);
}

function candidatesRef(callId: string) {
  return collection(db, CALLS_COLLECTION, callId, CANDIDATES_SUBCOLLECTION);
}

// ─── createCall ───────────────────────────────────────────────────────────────

/**
 * Called by the **initiator** (caller).
 * Creates the call document with the SDP offer and marks the caller as a participant.
 *
 * @param callId   Firestore document ID to use (typically the session ID).
 * @param callerUid Firebase Auth UID of the initiator.
 * @param offer    SDP offer produced by simple-peer.
 */
export async function createCall(
  callId: string,
  callerUid: string,
  offer: RTCSessionDescriptionInit
): Promise<void> {
  const payload: CallDocument = {
    offer,
    answer: null,
    participants: [callerUid],
    status: "ringing",
    createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
    updatedAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
  };

  await setDoc(callDocRef(callId), payload);
}

// ─── joinCall ─────────────────────────────────────────────────────────────────

/**
 * Called by the **callee** (joiner).
 * Writes the SDP answer and adds the callee to the participants list.
 *
 * @param callId    The existing call document ID.
 * @param calleeUid Firebase Auth UID of the answerer.
 * @param answer    SDP answer produced by simple-peer.
 */
export async function joinCall(
  callId: string,
  calleeUid: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  await updateDoc(callDocRef(callId), {
    answer,
    status: "active",
    participants: arrayUnion(calleeUid),
    updatedAt: serverTimestamp(),
  });
}

// ─── sendSignal ───────────────────────────────────────────────────────────────

/**
 * Sends an ICE candidate to Firestore so the remote peer can receive it.
 * Both caller and callee call this whenever simple-peer emits a new candidate.
 *
 * @param callId    The call document ID.
 * @param senderUid Firebase Auth UID of the sender (so we can filter on listen).
 * @param candidate RTCIceCandidateInit from simple-peer's `signal` event.
 */
export async function sendSignal(
  callId: string,
  senderUid: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  const payload: CandidateDocument = {
    uid: senderUid,
    candidate,
    createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
  };

  await addDoc(candidatesRef(callId), payload);
}

// ─── endCall ──────────────────────────────────────────────────────────────────

/**
 * Marks the call as ended. Either participant can call this.
 */
export async function endCall(callId: string): Promise<void> {
  await updateDoc(callDocRef(callId), {
    status: "ended",
    updatedAt: serverTimestamp(),
  });
}

// ─── getCallOffer ─────────────────────────────────────────────────────────────

/**
 * One-time fetch of the offer stored in a call document.
 * Useful for the callee who joins after the offer was already written.
 */
export async function getCallOffer(
  callId: string
): Promise<RTCSessionDescriptionInit | null> {
  const snap = await getDoc(callDocRef(callId));
  if (!snap.exists()) return null;
  return (snap.data() as CallDocument).offer ?? null;
}

// ─── listenForSignals ────────────────────────────────────────────────────────

/**
 * Attaches **two** real-time Firestore listeners for a given call:
 *
 * 1. `onSnapshot` on `calls/{callId}` — watches for offer / answer / status changes.
 * 2. `onSnapshot` on `calls/{callId}/candidates` — watches for new ICE candidates,
 *    automatically **filtering out** candidates sent by `myUid`.
 *
 * Returns an unsubscribe function that tears down both listeners at once.
 *
 * @param callId  The call document ID.
 * @param myUid   Your own Firebase Auth UID (used to skip self-sent candidates).
 * @param options Callbacks for the events you care about.
 */
export function listenForSignals(
  callId: string,
  myUid: string,
  options: SignalListenerOptions
): Unsubscribe {
  const { onOffer, onAnswer, onCandidate, onStatusChange } = options;

  // ── 1. Watch the call document (offer / answer / status) ──────────────────
  const unsubDoc = onSnapshot(callDocRef(callId), (snap) => {
    if (!snap.exists()) return;

    const data = snap.data() as DocumentData;

    // Only deliver the offer if we didn't write it
    if (onOffer && data.offer && !data.participants?.includes(myUid)) {
      onOffer(data.offer as RTCSessionDescriptionInit);
    }

    // Only deliver the answer to the original caller (who wrote the offer)
    if (onAnswer && data.answer) {
      onAnswer(data.answer as RTCSessionDescriptionInit);
    }

    if (onStatusChange && data.status) {
      onStatusChange(data.status as CallStatus);
    }
  });

  // ── 2. Watch the candidates sub-collection ────────────────────────────────
  const unsubCandidates = onSnapshot(candidatesRef(callId), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== "added") return;

      const data = change.doc.data() as CandidateDocument;

      // Ignore candidates we sent ourselves
      if (data.uid === myUid) return;

      if (onCandidate && data.candidate) {
        onCandidate(data.candidate);
      }
    });
  });

  // Return a combined unsubscribe
  return () => {
    unsubDoc();
    unsubCandidates();
  };
}
