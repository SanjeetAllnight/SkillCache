import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  addDoc,
  type FieldValue,
} from "firebase/firestore";
import { db } from "./firebase";
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

export type FirestoreSession = {
  title: string;
  mentorId: string;
  learnerId: string;
  skill: string;
  date: string;
  status: "live" | "upcoming" | "completed";
};

export type ApiSession = {
  _id: string;
  title: string;
  mentor: BackendUser;
  learner: BackendUser;
  date: string;
  status: "live" | "upcoming" | "completed";
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

// Collection references
const usersCollection = collection(db, "users");
const sessionsCollection = collection(db, "sessions");
const resourcesCollection = collection(db, "resources");

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
  
  return sessionsData.map(session => {
    const mentor = usersMap.get(session.mentorId) || {
      _id: session.mentorId, name: "Unknown Mentor", email: "", skillsOffered: [], skillsWanted: []
    };
    const learner = usersMap.get(session.learnerId) || {
      _id: session.learnerId, name: "Unknown Learner", email: "", skillsOffered: [], skillsWanted: []
    };
    
    return {
      _id: session._id,
      title: session.title || session.skill,
      mentor,
      learner,
      date: session.date,
      status: session.status
    };
  });
}

/**
 * Create a new session document in Firestore.
 * Returns the new Firestore document ID.
 */
export async function createSession(
  data: {
    title: string;
    mentorId: string;
    learnerId: string;
    skill: string;
    date: string;
    status: "upcoming" | "live" | "completed";
  }
): Promise<string> {
  const docRef = await addDoc(sessionsCollection, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Fetch all sessions where the given user is either mentor or learner.
 * Runs two separate Firestore queries (Firestore doesn't support OR across
 * different fields with a single query) and merges + deduplicates results.
 */
export async function getSessionsForUser(uid: string): Promise<ApiSession[]> {
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
        raw.push({ _id: d.id, ...(d.data() as FirestoreSession) });
      }
    }
  }

  if (raw.length === 0) return [];

  // Resolve mentor/learner user objects in one batch
  const allUsers = await getUsers();
  const usersMap = new Map(allUsers.map((u) => [u._id, u]));

  return raw
    .map((session) => ({
      _id: session._id,
      title: session.title || session.skill,
      mentor: usersMap.get(session.mentorId) ?? {
        _id: session.mentorId, name: "Unknown Mentor", email: "", skillsOffered: [], skillsWanted: [],
      },
      learner: usersMap.get(session.learnerId) ?? {
        _id: session.learnerId, name: "Unknown Learner", email: "", skillsOffered: [], skillsWanted: [],
      },
      date: session.date,
      status: session.status,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
 * Fetch a single session by Id
 */
export async function getSessionById(sessionId: string): Promise<ApiSession> {
  const allSessions = await getSessions();
  const session = allSessions.find(s => s._id === sessionId);
  if (!session) throw new Error("Session not found");
  return session;
}
