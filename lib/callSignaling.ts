/**
 * lib/callSignaling.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firestore-backed WebRTC Mesh signaling layer.
 *
 * For a full mesh network, we use:
 * 1. Presence Collection: Discover who is in the room.
 * 2. Connection Documents: Store Offer/Answer per peer-to-peer link.
 * 3. Candidates Subcollections: Exchange ICE candidates per link.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const CALLS_COLLECTION = "calls";
const PRESENCE_SUBCOLLECTION = "presence";
const CONNECTIONS_SUBCOLLECTION = "connections";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceDocument {
  uid: string;
  name: string;
  role: "mentor" | "learner";
  kicked: boolean;
  joinedAt: ReturnType<typeof serverTimestamp>;
}

export interface ConnectionDocument {
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  initiatorUid: string;
  receiverUid: string;
}

export interface CandidateDocument {
  uid: string;
  candidate: RTCIceCandidateInit;
  createdAt: ReturnType<typeof serverTimestamp>;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export async function joinPresence(
  callId: string,
  uid: string,
  name: string,
  role: "mentor" | "learner"
): Promise<void> {
  await setDoc(doc(db, CALLS_COLLECTION, callId, PRESENCE_SUBCOLLECTION, uid), {
    uid,
    name,
    role,
    kicked: false,
    joinedAt: serverTimestamp(),
  });
}

export async function leavePresence(callId: string, uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CALLS_COLLECTION, callId, PRESENCE_SUBCOLLECTION, uid));
  } catch {
    // Best-effort
  }
}

export async function kickParticipant(callId: string, targetUid: string): Promise<void> {
  try {
    await updateDoc(doc(db, CALLS_COLLECTION, callId, PRESENCE_SUBCOLLECTION, targetUid), {
      kicked: true,
    });
  } catch {
    // Best-effort
  }
}

export function listenToPresence(
  callId: string,
  onUpdate: (presenceList: PresenceDocument[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, CALLS_COLLECTION, callId, PRESENCE_SUBCOLLECTION), (snap) => {
    const list: PresenceDocument[] = [];
    snap.forEach((doc) => {
      list.push(doc.data() as PresenceDocument);
    });
    onUpdate(list);
  });
}

// ─── Connections ──────────────────────────────────────────────────────────────

export function getConnectionId(uidA: string, uidB: string): string {
  // Lexicographical sort to ensure consistent connection ID for both peers
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

export async function createConnectionOffer(
  callId: string,
  connectionId: string,
  initiatorUid: string,
  receiverUid: string,
  offer: RTCSessionDescriptionInit
): Promise<void> {
  await setDoc(doc(db, CALLS_COLLECTION, callId, CONNECTIONS_SUBCOLLECTION, connectionId), {
    initiatorUid,
    receiverUid,
    offer,
    answer: null,
  });
}

export async function answerConnectionOffer(
  callId: string,
  connectionId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  await updateDoc(doc(db, CALLS_COLLECTION, callId, CONNECTIONS_SUBCOLLECTION, connectionId), {
    answer,
  });
}

export async function sendConnectionSignal(
  callId: string,
  connectionId: string,
  senderUid: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  await addDoc(
    collection(db, CALLS_COLLECTION, callId, CONNECTIONS_SUBCOLLECTION, connectionId, "candidates"),
    {
      uid: senderUid,
      candidate,
      createdAt: serverTimestamp(),
    }
  );
}

export function listenToConnection(
  callId: string,
  connectionId: string,
  myUid: string,
  onOffer: (offer: RTCSessionDescriptionInit) => void,
  onAnswer: (answer: RTCSessionDescriptionInit) => void,
  onCandidate: (candidate: RTCIceCandidateInit) => void
): Unsubscribe {
  let offerHandled = false;
  let answerHandled = false;

  const unsubDoc = onSnapshot(
    doc(db, CALLS_COLLECTION, callId, CONNECTIONS_SUBCOLLECTION, connectionId),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as ConnectionDocument;

      // I am the receiver waiting for an offer
      if (data.offer && !offerHandled && data.receiverUid === myUid) {
        offerHandled = true;
        onOffer(data.offer);
      }

      // I am the initiator waiting for an answer
      if (data.answer && !answerHandled && data.initiatorUid === myUid) {
        answerHandled = true;
        onAnswer(data.answer);
      }
    }
  );

  const unsubCandidates = onSnapshot(
    collection(db, CALLS_COLLECTION, callId, CONNECTIONS_SUBCOLLECTION, connectionId, "candidates"),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as CandidateDocument;
          // Only process candidates from the remote peer
          if (data.uid !== myUid && data.candidate) {
            onCandidate(data.candidate);
          }
        }
      });
    }
  );

  return () => {
    unsubDoc();
    unsubCandidates();
  };
}
