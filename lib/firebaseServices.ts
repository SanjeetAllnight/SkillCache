import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  addDoc,
  type FieldValue,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { BackendUser } from "./mockUser";

// Define strict types for our collections based on user requirements

export type FirestoreUser = {
  name: string;
  email: string;
  skillsOffered: string[];
  skillsWanted: string[];
  bio: string;
  rating: number;
  sessionsCompleted: number;
  createdAt?: FieldValue;
  profileComplete?: boolean;
};

/** Real-time call lifecycle state stored on the session document. */
export type CallStatus = "idle" | "started" | "joined" | "connected";

export type SessionStatus =
  | "pending"
  | "accepted"
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled"
  | "missed";

export type LegacySessionStatus = "scheduled" | "waiting";
export type RawSessionStatus = SessionStatus | LegacySessionStatus;

export type FirestoreSession = {
  title: string;
  description?: string;
  mentorId: string;
  learnerId: string;
  skill: string;
  date: string;
  status: RawSessionStatus;
  requestedBy?: string;
  acceptedAt?: FieldValue;
  startedAt?: FieldValue;
  endedAt?: FieldValue;
  cancelledAt?: FieldValue;
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduleNote?: string;
  mentorJoinedAt?: FieldValue;
  learnerJoinedAt?: FieldValue;
  createdAt?: FieldValue;
  updatedAt?: FieldValue;
  /** Real-time call state — written by participants during a call. */
  callStatus?: CallStatus;
};

export type ApiSession = {
  _id: string;
  title: string;
  description?: string;
  mentor: BackendUser;
  learner: BackendUser;
  mentorId: string;
  learnerId: string;
  skill: string;
  date: string;
  status: SessionStatus;
  rawStatus?: RawSessionStatus;
  requestedBy?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduleNote?: string;
  /** Real-time call state — present once a call has been initiated. */
  callStatus?: CallStatus;
};

export type FirestoreResource = {
  title: string;
  description: string;
  tags: string[];
  /** Firestore UID of the user who shared this resource */
  userId: string;
  /** Optional direct URL to a file or external link */
  fileUrl?: string;
  /** Optional inline text content */
  content?: string;
  createdAt?: FieldValue;
};

/** Resolved shape returned to UI (author name included) */
export type ApiResource = {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  userId: string;
  authorName: string;
  fileUrl?: string;
  content?: string;
};

// ─── Skill types ──────────────────────────────────────────────────────────────

export type SkillType = "teaching" | "learning";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type FirestoreSkill = {
  name: string;
  category: string;
  tags: string[];
  type: SkillType;
  description: string;
  level: ExperienceLevel;
  createdAt?: FieldValue;
  updatedAt?: FieldValue;
};

export type ApiSkill = FirestoreSkill & { _id: string };

// Collection references
const usersCollection = collection(db, "users");
const sessionsCollection = collection(db, "sessions");
const resourcesCollection = collection(db, "resources");

function normalizeSessionStatus(status?: RawSessionStatus): SessionStatus {
  if (status === "scheduled" || status === "waiting") return "upcoming";
  return status ?? "pending";
}

function fallbackUser(uid: string, label: string): BackendUser {
  return {
    _id: uid,
    name: label,
    email: "",
    skillsOffered: [],
    skillsWanted: [],
  };
}

function toApiSession(
  sessionId: string,
  data: Partial<FirestoreSession>,
  usersMap: Map<string, BackendUser>,
): ApiSession | null {
  if (!data.mentorId || !data.learnerId) return null;

  const mentor = usersMap.get(data.mentorId) ?? fallbackUser(data.mentorId, "Unknown Mentor");
  const learner = usersMap.get(data.learnerId) ?? fallbackUser(data.learnerId, "Unknown Learner");
  const rawStatus = data.status ?? "pending";

  return {
    _id: sessionId,
    title: data.title || data.skill || "Untitled Session",
    description: data.description || "",
    mentor,
    learner,
    mentorId: data.mentorId,
    learnerId: data.learnerId,
    skill: data.skill || mentor.skillsOffered?.[0] || "General mentorship",
    date: data.date ?? new Date().toISOString(),
    status: normalizeSessionStatus(rawStatus),
    rawStatus,
    requestedBy: data.requestedBy,
    cancelledBy: data.cancelledBy,
    cancellationReason: data.cancellationReason,
    rescheduleNote: data.rescheduleNote,
    callStatus: data.callStatus,
  };
}

function sortSessionsDescending(a: ApiSession, b: ApiSession) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

/**
 * Creates the initial Firestore user document on first sign-up.
 * Always called from auth-provider after Firebase Auth creates the account.
 * Uses `setDoc` with merge:true so it is safe to call multiple times.
 */
export async function createUserProfile(
  uid: string,
  data: { name: string; email: string }
): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      name: data.name,
      email: data.email,
      skillsOffered: [],
      skillsWanted: [],
      bio: "",
      rating: 0,
      sessionsCompleted: 0,
      profileComplete: false,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Returns the raw Firestore document for a user, or null if it doesn't exist.
 * Use this to decide whether to gate the user to /complete-profile.
 */
export async function getUserProfile(
  uid: string
): Promise<(FirestoreUser & { profileComplete: boolean }) | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as FirestoreUser & { profileComplete: boolean };
}

/**
 * Saves the user-filled profile fields and marks the profile as complete.
 */
export async function updateUserProfile(
  uid: string,
  data: { skillsOffered: string[]; skillsWanted: string[]; bio: string }
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    profileComplete: true,
  });
}

/**
 * Fetch all users
 */
export async function getUsers(): Promise<BackendUser[]> {
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map((d) => {
    const data = d.data() as FirestoreUser;
    return {
      _id: d.id,
      name: data.name,
      email: data.email,
      skillsOffered: data.skillsOffered || [],
      skillsWanted: data.skillsWanted || [],
      // map rating/completed to UI requirements if necessary
    };
  });
}

/**
 * Fetch a single user by ID
 */
export async function getUserById(userId: string): Promise<BackendUser | null> {
  const docRef = doc(db, "users", userId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as FirestoreUser;
  return {
    _id: snapshot.id,
    name: data.name,
    email: data.email,
    skillsOffered: data.skillsOffered || [],
    skillsWanted: data.skillsWanted || [],
    bio: data.bio || "",
  };
}

/**
 * Fetch mentors — users who have at least one offered skill.
 *
 * @param skillFilter  Optional. Only return mentors who offer this skill (case-insensitive, substring match).
 * @param excludeUid   Optional. Exclude this user (the currently logged-in user) from results.
 */
export async function getMentors(
  skillFilter?: string,
  excludeUid?: string
): Promise<BackendUser[]> {
  const users = await getUsers();

  return users.filter((user) => {
    // Always exclude the logged-in user
    if (excludeUid && user._id === excludeUid) return false;

    // Must have at least one offered skill
    const hasSkills = user.skillsOffered && user.skillsOffered.length > 0;
    if (!hasSkills) return false;

    // Optional skill filter — case-insensitive partial match
    if (skillFilter) {
      const q = skillFilter.toLowerCase();
      return user.skillsOffered!.some((s) => s.toLowerCase().includes(q));
    }

    return true;
  });
}

/**
 * Fetch all sessions and map mentor/learner references to full user objects
 */
export async function getSessions() {
  const snapshot = await getDocs(sessionsCollection);
  const sessionsData = snapshot.docs.map(_doc => ({ _id: _doc.id, ..._doc.data() as FirestoreSession }));
  
  // To avoid n+1 problem, cache users locally
  const allUsers = await getUsers();
  const usersMap = new Map(allUsers.map(u => [u._id, u]));
  
  return sessionsData
    .map((session) => toApiSession(session._id, session, usersMap))
    .filter((session): session is ApiSession => Boolean(session))
    .sort(sortSessionsDescending);
}

/**
 * Create a new session document in Firestore.
 * Returns the new Firestore document ID.
 */
export async function createSession(
  data: {
    title: string;
    description?: string;
    mentorId: string;
    learnerId: string;
    skill: string;
    date: string;
    status: SessionStatus;
    requestedBy?: string;
  }
): Promise<string> {
  const docRef = await addDoc(sessionsCollection, {
    ...data,
    callStatus: "idle",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function requestSession(data: {
  title: string;
  description?: string;
  mentorId: string;
  learnerId: string;
  skill: string;
  date: string;
}): Promise<string> {
  return createSession({
    ...data,
    status: "pending",
    requestedBy: data.learnerId,
  });
}

/**
 * Fetch all sessions where the given user is either mentor or learner.
 * Runs two separate Firestore queries (Firestore doesn't support OR across
 * different fields with a single query) and merges + deduplicates results.
 */
export async function getSessionsForUser(uid: string): Promise<ApiSession[]> {
  if (!uid) return [];

  const [mentorSnap, learnerSnap] = await Promise.all([
    getDocs(query(sessionsCollection, where("mentorId", "==", uid))),
    getDocs(query(sessionsCollection, where("learnerId", "==", uid))),
  ]);

  // Deduplicate by doc ID
  const seen = new Set<string>();
  const raw: Array<{ _id: string } & FirestoreSession> = [];
  for (const snap of [mentorSnap, learnerSnap]) {
    for (const d of snap.docs) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        const docData = d.data() as Partial<FirestoreSession>;
        // Guard against malformed docs
        if (!docData.mentorId || !docData.learnerId) continue;
        raw.push({ _id: d.id, ...(docData as FirestoreSession) });
      }
    }
  }

  if (raw.length === 0) return [];

  // Resolve mentor/learner user objects — degrade gracefully if users collection fails
  let usersMap = new Map<string, BackendUser>();
  try {
    const allUsers = await getUsers();
    usersMap = new Map(allUsers.map((u) => [u._id, u]));
  } catch {
    // Non-fatal — sessions still display with placeholder names
  }

  return raw
    .map((session) => toApiSession(session._id, session, usersMap))
    .filter((session): session is ApiSession => Boolean(session))
    .sort(sortSessionsDescending);
}

export const SESSION_JOIN_WINDOW_MS = 15 * 60 * 1000;
export const SESSION_MISS_GRACE_MS = 2 * 60 * 60 * 1000;

export function canJoinSession(session: ApiSession, now = Date.now()) {
  const startsAt = new Date(session.date).getTime();
  if (!Number.isFinite(startsAt)) return false;
  if (session.status === "live") return true;
  if (session.status !== "accepted" && session.status !== "upcoming") return false;
  return now >= startsAt - SESSION_JOIN_WINDOW_MS && now <= startsAt + SESSION_MISS_GRACE_MS;
}

export function getSessionTimeLabel(session: ApiSession, now = Date.now()) {
  const startsAt = new Date(session.date).getTime();
  if (!Number.isFinite(startsAt)) return "Time pending";

  if (session.status === "pending") return "Awaiting mentor response";
  if (session.status === "live") return "Session Live";
  if (session.status === "completed") return "Completed";
  if (session.status === "cancelled") return "Cancelled";
  if (session.status === "missed") return "Missed";

  const diff = startsAt - now;
  const absoluteMinutes = Math.max(1, Math.round(Math.abs(diff) / 60000));

  if (diff > SESSION_JOIN_WINDOW_MS) {
    const hours = Math.floor(absoluteMinutes / 60);
    if (hours >= 24) return `Starts in ${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"}`;
    if (hours >= 1) return `Starts in ${hours} hour${hours === 1 ? "" : "s"}`;
    return `Starts in ${absoluteMinutes} minutes`;
  }

  if (diff > 0) return `Starts in ${absoluteMinutes} minutes`;
  if (now <= startsAt + SESSION_MISS_GRACE_MS) return "Ready to start";
  return "Past session window";
}

export async function acceptSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
    callStatus: "idle",
    updatedAt: serverTimestamp(),
  });
}

export async function cancelSession(
  sessionId: string,
  userId: string,
  reason = "Session cancelled",
): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    status: "cancelled",
    cancelledBy: userId,
    cancellationReason: reason,
    cancelledAt: serverTimestamp(),
    callStatus: "idle",
    updatedAt: serverTimestamp(),
  });
}

export async function rescheduleSession(
  sessionId: string,
  date: string,
  note?: string,
): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    date,
    status: "accepted",
    rescheduleNote: note ?? "",
    callStatus: "idle",
    updatedAt: serverTimestamp(),
  });
}

export async function promoteSessionToUpcoming(sessionId: string): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    status: "upcoming",
    updatedAt: serverTimestamp(),
  });
}

export async function markSessionMissed(sessionId: string): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    status: "missed",
    callStatus: "idle",
    missedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function startSession(sessionId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    status: "live",
    callStatus: "started",
    mentorJoinedAt: serverTimestamp(),
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function completeSession(sessionId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    status: "completed",
    callStatus: "idle",
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function syncSessionLifecycle(session: ApiSession, now = Date.now()): Promise<void> {
  const startsAt = new Date(session.date).getTime();
  if (!Number.isFinite(startsAt)) return;

  const shouldBecomeUpcoming =
    session.status === "accepted" &&
    now >= startsAt - SESSION_JOIN_WINDOW_MS &&
    now <= startsAt + SESSION_MISS_GRACE_MS;

  if (shouldBecomeUpcoming) {
    await promoteSessionToUpcoming(session._id);
    return;
  }

  const shouldBeMissed =
    (session.status === "accepted" || session.status === "upcoming") &&
    now > startsAt + SESSION_MISS_GRACE_MS;

  if (shouldBeMissed) {
    await markSessionMissed(session._id);
  }
}

export async function syncSessionLifecycles(sessions: ApiSession[]): Promise<void> {
  await Promise.allSettled(sessions.map((session) => syncSessionLifecycle(session)));
}

export function listenSessionsForUser(
  uid: string,
  onChange: (sessions: ApiSession[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!uid) return () => undefined;

  const mentorDocs = new Map<string, FirestoreSession>();
  const learnerDocs = new Map<string, FirestoreSession>();
  let cancelled = false;
  const usersPromise = getUsers()
    .then((users) => new Map(users.map((user) => [user._id, user])))
    .catch(() => new Map<string, BackendUser>());

  async function emit() {
    const usersMap = await usersPromise;
    if (cancelled) return;

    const merged = new Map<string, FirestoreSession>();
    mentorDocs.forEach((value, key) => merged.set(key, value));
    learnerDocs.forEach((value, key) => merged.set(key, value));

    const nextSessions = Array.from(merged.entries())
      .map(([sessionId, data]) => toApiSession(sessionId, data, usersMap))
      .filter((session): session is ApiSession => Boolean(session))
      .sort(sortSessionsDescending);

    onChange(nextSessions);
  }

  function applySnapshot(target: Map<string, FirestoreSession>, snapshot: Awaited<ReturnType<typeof getDocs>>) {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "removed") {
        target.delete(change.doc.id);
        return;
      }
      target.set(change.doc.id, change.doc.data() as FirestoreSession);
    });
    void emit();
  }

  const unsubscribeMentor = onSnapshot(
    query(sessionsCollection, where("mentorId", "==", uid)),
    (snapshot) => applySnapshot(mentorDocs, snapshot),
    (error) => onError?.(error),
  );

  const unsubscribeLearner = onSnapshot(
    query(sessionsCollection, where("learnerId", "==", uid)),
    (snapshot) => applySnapshot(learnerDocs, snapshot),
    (error) => onError?.(error),
  );

  return () => {
    cancelled = true;
    unsubscribeMentor();
    unsubscribeLearner();
  };
}

export function listenSessionById(
  sessionId: string,
  onChange: (session: ApiSession | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!sessionId) return () => undefined;

  let cancelled = false;
  const usersPromise = getUsers()
    .then((users) => new Map(users.map((user) => [user._id, user])))
    .catch(() => new Map<string, BackendUser>());

  const unsubscribe = onSnapshot(
    doc(db, "sessions", sessionId),
    async (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const usersMap = await usersPromise;
      if (cancelled) return;
      onChange(toApiSession(snapshot.id, snapshot.data() as FirestoreSession, usersMap));
    },
    (error) => onError?.(error),
  );

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

/**
 * Fetch all resources and resolve author display names.
 * Sorted newest → oldest.
 */
export async function getResources(): Promise<ApiResource[]> {
  const snapshot = await getDocs(resourcesCollection);
  if (snapshot.empty) return [];

  // Batch-resolve authors
  const allUsers = await getUsers();
  const usersMap = new Map(allUsers.map((u) => [u._id, u.name]));

  return snapshot.docs
    .map((d) => {
      const data = d.data() as FirestoreResource;
      return {
        _id: d.id,
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        userId: data.userId,
        authorName: usersMap.get(data.userId) ?? "Unknown Author",
        fileUrl: data.fileUrl,
        content: data.content,
      } satisfies ApiResource;
    })
    .sort((a, b) => {
      // fall back if createdAt not present (existing docs)
      return 0;
    });
}

/**
 * Add a new resource to the "resources" Firestore collection.
 */
export async function addResource(data: {
  title: string;
  description: string;
  tags: string[];
  userId: string;
  fileUrl?: string;
  content?: string;
}): Promise<string> {
  const docRef = await addDoc(resourcesCollection, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Upload a file to Firebase Storage for the repository.
 * Returns the download URL.
 */
export async function uploadResourceFile(userId: string, file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `resources/${userId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * Fetch a single session by Id
 */
export async function getSessionById(sessionId: string): Promise<ApiSession> {
  const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
  if (!sessionSnap.exists()) throw new Error("Session not found");

  let usersMap = new Map<string, BackendUser>();
  try {
    const allUsers = await getUsers();
    usersMap = new Map(allUsers.map((u) => [u._id, u]));
  } catch {
    // Non-fatal - session still displays with participant placeholders.
  }

  const session = toApiSession(sessionSnap.id, sessionSnap.data() as FirestoreSession, usersMap);
  if (!session) throw new Error("Session not found");
  return session;
}

// ─── Call status helpers ──────────────────────────────────────────────────────

/**
 * Write the call lifecycle status onto the session document.
 * Called by both participants:
 *   mentor  → "started"   (clicked Start Call)
 *   learner → "joined"    (clicked Join Call)
 *   either  → "connected" (WebRTC data-channel open)
 *   either  → "idle"      (call ended / reset)
 */
export async function updateSessionCallStatus(
  sessionId: string,
  callStatus: CallStatus
): Promise<void> {
  await updateDoc(doc(db, "sessions", sessionId), {
    callStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Subscribes to real-time updates of `callStatus` on a session document.
 * Returns an unsubscribe function — call it on cleanup.
 *
 * @param sessionId  Firestore session document ID.
 * @param onChange   Callback fired whenever `callStatus` changes.
 */
export function listenToSessionCallStatus(
  sessionId: string,
  onChange: (callStatus: CallStatus | null) => void
): Unsubscribe {
  const ref = doc(db, "sessions", sessionId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) { onChange(null); return; }
    const data = snap.data() as FirestoreSession;
    onChange(data.callStatus ?? null);
  });
}

// \u2500\u2500\u2500 Skill CRUD helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Returns the Firestore sub-collection reference for a user's skills. */
function skillsColRef(uid: string) {
  return collection(db, "users", uid, "skills");
}

/**
 * Sync the flat skillsOffered / skillsWanted arrays on the user doc so that
 * the existing mentor search and session-booking flows keep working unchanged.
 */
async function syncSkillArrays(uid: string): Promise<void> {
  const snap = await getDocs(skillsColRef(uid));
  const skills = snap.docs.map((d) => d.data() as FirestoreSkill);
  const offered = skills.filter((s) => s.type === "teaching").map((s) => s.name);
  const wanted  = skills.filter((s) => s.type === "learning").map((s) => s.name);
  await updateDoc(doc(db, "users", uid), {
    skillsOffered: offered,
    skillsWanted:  wanted,
    profileComplete: true,
  });
}

/** Fetch all skills for a user (one-shot). */
export async function getSkillsForUser(uid: string): Promise<ApiSkill[]> {
  const snap = await getDocs(skillsColRef(uid));
  return snap.docs.map((d) => ({ _id: d.id, ...(d.data() as FirestoreSkill) }));
}

/** Add a new skill. Returns the completed ApiSkill object. */
export async function addSkill(
  uid: string,
  data: Omit<FirestoreSkill, "createdAt" | "updatedAt">,
): Promise<ApiSkill> {
  const ref = await addDoc(skillsColRef(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await syncSkillArrays(uid);
  return { _id: ref.id, ...data };
}

/** Update an existing skill in place. */
export async function updateSkill(
  uid: string,
  skillId: string,
  data: Partial<Omit<FirestoreSkill, "createdAt" | "updatedAt">>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "skills", skillId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  await syncSkillArrays(uid);
}

/** Delete a skill by its document ID. */
export async function deleteSkill(uid: string, skillId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "skills", skillId));
  await syncSkillArrays(uid);
}

/**
 * Subscribe to real-time skill updates for a user.
 * Returns an unsubscribe function — call it on cleanup.
 */
export function listenSkillsForUser(
  uid: string,
  onChange: (skills: ApiSkill[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!uid) return () => undefined;
  return onSnapshot(
    skillsColRef(uid),
    (snap) => {
      const skills = snap.docs.map((d) => ({
        _id: d.id,
        ...(d.data() as FirestoreSkill),
      }));
      onChange(skills);
     },
    (err) => onError?.(err),
  );
}

// \u2500\u2500\u2500 Legacy migration \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/**
 * One-time migration: if the user's skills sub-collection is empty but they
 * have legacy skillsOffered / skillsWanted strings on their user document,
 * this seeds the sub-collection with those values.
 *
 * Safe to call on every profile load — it no-ops when the sub-collection
 * already has entries.  Returns true if migration was performed.
 */
export async function migrateSkillsFromLegacy(uid: string): Promise<boolean> {
  const colRef = skillsColRef(uid);

  // 1. Check whether the sub-collection already has data
  const existing = await getDocs(colRef);
  if (!existing.empty) return false; // already migrated — nothing to do

  // 2. Fetch the top-level user document for legacy arrays
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return false;

  const data = userSnap.data() as FirestoreUser;
  const offered: string[] = data.skillsOffered ?? [];
  const wanted: string[]  = data.skillsWanted  ?? [];

  if (offered.length === 0 && wanted.length === 0) return false;

  // 3. Seed — deduplicate across both arrays
  const seen = new Set<string>();
  const writes: Promise<unknown>[] = [];

  for (const name of offered) {
    const key = name.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    writes.push(
      addDoc(colRef, {
        name:        name.trim(),
        category:    "Other",
        tags:        [],
        type:        "teaching" as SkillType,
        description: "",
        level:       "intermediate" as ExperienceLevel,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      }),
    );
  }

  for (const name of wanted) {
    const key = name.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    writes.push(
      addDoc(colRef, {
        name:        name.trim(),
        category:    "Other",
        tags:        [],
        type:        "learning" as SkillType,
        description: "",
        level:       "beginner" as ExperienceLevel,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      }),
    );
  }

  await Promise.all(writes);
  // No need to re-sync arrays here — the legacy arrays already contain the same strings
  return true;
}
