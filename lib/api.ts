import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { setBrowserAuthCookie } from "@/lib/auth";
import {
  getFirebaseAuth,
  getFirebaseConfigurationError,
  getFirestoreDb,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { dashboardData, mentorsData, profileData } from "@/lib/mock-data";
import type { BackendUser } from "@/lib/mockUser";

const USERS_COLLECTION = "users";
const SESSIONS_COLLECTION = "sessions";

export type ApiSessionStatus = "live" | "upcoming" | "completed";

export type ApiSession = {
  _id: string;
  title: string;
  mentor: BackendUser;
  learner: BackendUser;
  date: string;
  status: ApiSessionStatus;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = LoginInput & {
  name: string;
  skillsOffered?: string[];
  skillsWanted?: string[];
};

export type AuthResponse = {
  message: string;
  user: BackendUser;
};

type SignupResponse = AuthResponse;

type FirestoreUserRecord = {
  name: string;
  email: string;
  skillsOffered: string[];
  skillsWanted: string[];
  createdAt: string;
  updatedAt: string;
};

type FirestoreSessionRecord = {
  title: string;
  mentorId: string;
  learnerId: string;
  date: string;
  status: ApiSessionStatus;
};

type SeedSession = FirestoreSessionRecord & {
  id: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const fallbackCurrentUser: BackendUser = {
  _id: "julian-thorne",
  name: profileData.name,
  email: "julian@skillcache.demo",
  skillsOffered: dashboardData.teaching,
  skillsWanted: dashboardData.learning,
};

const fallbackUsers: BackendUser[] = [
  fallbackCurrentUser,
  ...mentorsData.mentors.map((mentor) => ({
    _id: mentor.id,
    name: mentor.name,
    email: `${mentor.id}@skillcache.demo`,
    skillsOffered: mentor.tags,
    skillsWanted: [],
  })),
];

let firestoreSeedPromise: Promise<void> | null = null;

function getNowIso() {
  return new Date().toISOString();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferNameFromEmail(email?: string | null) {
  const localPart = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (!localPart) {
    return "SkillCache Member";
  }

  return localPart.replace(/\b\w/g, (character) => character.toUpperCase());
}

function resolveUserName(
  ...candidates: Array<string | null | undefined>
) {
  return candidates.map((value) => value?.trim()).find(Boolean) ?? "SkillCache Member";
}

function isApiSessionStatus(value: unknown): value is ApiSessionStatus {
  return value === "live" || value === "upcoming" || value === "completed";
}

function sortUsersByName(users: BackendUser[]) {
  return [...users].sort((firstUser, secondUser) =>
    firstUser.name.localeCompare(secondUser.name),
  );
}

function toBackendUser(id: string, record?: Partial<FirestoreUserRecord> | null): BackendUser {
  const email = record?.email?.trim().toLowerCase() || `${id}@skillcache.demo`;
  const name = resolveUserName(record?.name, inferNameFromEmail(email));

  return {
    _id: id,
    name,
    email,
    skillsOffered: normalizeStringArray(record?.skillsOffered),
    skillsWanted: normalizeStringArray(record?.skillsWanted),
  };
}

function toFirestoreUserRecord(user: BackendUser): FirestoreUserRecord {
  const now = getNowIso();

  return {
    name: user.name.trim(),
    email: user.email.trim().toLowerCase(),
    skillsOffered: normalizeStringArray(user.skillsOffered),
    skillsWanted: normalizeStringArray(user.skillsWanted),
    createdAt: now,
    updatedAt: now,
  };
}

function buildFallbackSeedSessions(): SeedSession[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      id: "mastering-organic-layouts",
      title: "Mastering Organic Layouts",
      mentorId: "elena-vance",
      learnerId: fallbackCurrentUser._id,
      date: new Date(now - 15 * 60 * 1000).toISOString(),
      status: "live",
    },
    {
      id: "advanced-clay-glazing-techniques",
      title: "Advanced Clay Glazing Techniques",
      mentorId: "julian-ray",
      learnerId: fallbackCurrentUser._id,
      date: new Date(now + 2 * hour).toISOString(),
      status: "upcoming",
    },
    {
      id: "sustainable-dyeing-techniques",
      title: "Sustainable Dyeing Techniques",
      mentorId: "sophia-laine",
      learnerId: fallbackCurrentUser._id,
      date: new Date(now + 26 * hour).toISOString(),
      status: "upcoming",
    },
    {
      id: "typographic-systems",
      title: "Typographic Systems",
      mentorId: "elena-vance",
      learnerId: fallbackCurrentUser._id,
      date: new Date(now - 48 * hour).toISOString(),
      status: "completed",
    },
    {
      id: "foundations-of-woodworking",
      title: "Foundations of Woodworking",
      mentorId: "marcus-thorne",
      learnerId: fallbackCurrentUser._id,
      date: new Date(now - 7 * 24 * hour).toISOString(),
      status: "completed",
    },
  ];
}

function buildFallbackSessions(): ApiSession[] {
  const usersById = new Map(fallbackUsers.map((user) => [user._id, user]));

  return buildFallbackSeedSessions()
    .map((session) => ({
      _id: session.id,
      title: session.title,
      mentor: usersById.get(session.mentorId) ?? fallbackCurrentUser,
      learner: usersById.get(session.learnerId) ?? fallbackCurrentUser,
      date: session.date,
      status: session.status,
    }))
    .sort(
      (firstSession, secondSession) =>
        new Date(firstSession.date).getTime() - new Date(secondSession.date).getTime(),
    );
}

function normalizeMentors(users: BackendUser[], skill?: string) {
  const normalizedSkill = skill?.trim().toLowerCase();

  return sortUsersByName(
    users.filter((user) => {
      const offeredSkills = normalizeStringArray(user.skillsOffered);

      if (offeredSkills.length === 0) {
        return false;
      }

      if (!normalizedSkill) {
        return true;
      }

      return offeredSkills.some(
        (offeredSkill) => offeredSkill.toLowerCase() === normalizedSkill,
      );
    }),
  );
}

function buildAuthenticatedUserFallback(firebaseUser: FirebaseUser) {
  return toBackendUser(firebaseUser.uid, {
    name: resolveUserName(firebaseUser.displayName, inferNameFromEmail(firebaseUser.email)),
    email: firebaseUser.email ?? `${firebaseUser.uid}@skillcache.demo`,
    skillsOffered: [],
    skillsWanted: [],
  });
}

function mapFirebaseError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error;
  }

  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code.replace(/^.*\//, "")
      : null;

  switch (errorCode) {
    case "email-already-in-use":
      return new ApiError("A user with that email already exists.", 409);
    case "invalid-email":
      return new ApiError("Enter a valid email address.", 400);
    case "weak-password":
      return new ApiError("Choose a stronger password.", 400);
    case "wrong-password":
    case "user-not-found":
    case "invalid-credential":
    case "invalid-login-credentials":
      return new ApiError("Invalid email or password.", 401);
    case "permission-denied":
      return new ApiError("Firestore permissions blocked this request.", 403);
    case "unavailable":
      return new ApiError("Firebase is temporarily unavailable.", 503);
    default:
      return new ApiError(fallbackMessage, 500);
  }
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured()) {
    throw new ApiError(getFirebaseConfigurationError(), 500);
  }
}

async function ensureFirestoreSeedData() {
  if (!isFirebaseConfigured()) {
    return;
  }

  if (firestoreSeedPromise) {
    return firestoreSeedPromise;
  }

  firestoreSeedPromise = (async () => {
    const db = getFirestoreDb();
    const usersCollection = collection(db, USERS_COLLECTION);
    const sessionsCollection = collection(db, SESSIONS_COLLECTION);
    const [usersSnapshot, sessionsSnapshot] = await Promise.all([
      getDocs(query(usersCollection, limit(1))),
      getDocs(query(sessionsCollection, limit(1))),
    ]);

    if (!usersSnapshot.empty && !sessionsSnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);

    if (usersSnapshot.empty) {
      for (const user of fallbackUsers) {
        batch.set(doc(usersCollection, user._id), toFirestoreUserRecord(user));
      }
    }

    if (sessionsSnapshot.empty) {
      for (const session of buildFallbackSeedSessions()) {
        batch.set(doc(sessionsCollection, session.id), {
          title: session.title,
          mentorId: session.mentorId,
          learnerId: session.learnerId,
          date: session.date,
          status: session.status,
        });
      }
    }

    await batch.commit();
  })();

  try {
    await firestoreSeedPromise;
  } catch (error) {
    firestoreSeedPromise = null;
    throw error;
  }
}

async function syncAuthenticatedUser(
  firebaseUser: FirebaseUser,
  overrides: Partial<Pick<FirestoreUserRecord, "name" | "skillsOffered" | "skillsWanted">> = {},
) {
  assertFirebaseConfigured();

  const db = getFirestoreDb();
  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  const userSnapshot = await getDoc(userRef);
  const existingRecord = userSnapshot.exists()
    ? (userSnapshot.data() as Partial<FirestoreUserRecord>)
    : null;
  const now = getNowIso();
  const nextRecord: FirestoreUserRecord = {
    name: resolveUserName(
      overrides.name,
      existingRecord?.name,
      firebaseUser.displayName,
      inferNameFromEmail(firebaseUser.email),
    ),
    email: (firebaseUser.email ?? existingRecord?.email ?? "").trim().toLowerCase(),
    skillsOffered:
      overrides.skillsOffered !== undefined
        ? normalizeStringArray(overrides.skillsOffered)
        : normalizeStringArray(existingRecord?.skillsOffered),
    skillsWanted:
      overrides.skillsWanted !== undefined
        ? normalizeStringArray(overrides.skillsWanted)
        : normalizeStringArray(existingRecord?.skillsWanted),
    createdAt:
      typeof existingRecord?.createdAt === "string" && existingRecord.createdAt
        ? existingRecord.createdAt
        : now,
    updatedAt: now,
  };

  await setDoc(userRef, nextRecord, { merge: true });
  return toBackendUser(firebaseUser.uid, nextRecord);
}

async function loadUsersFromFirestore() {
  await ensureFirestoreSeedData();

  const snapshot = await getDocs(collection(getFirestoreDb(), USERS_COLLECTION));
  return sortUsersByName(
    snapshot.docs.map((documentSnapshot) =>
      toBackendUser(
        documentSnapshot.id,
        documentSnapshot.data() as Partial<FirestoreUserRecord>,
      ),
    ),
  );
}

async function loadSessionsFromFirestore() {
  await ensureFirestoreSeedData();

  const db = getFirestoreDb();
  const [usersSnapshot, sessionsSnapshot] = await Promise.all([
    getDocs(collection(db, USERS_COLLECTION)),
    getDocs(collection(db, SESSIONS_COLLECTION)),
  ]);

  const usersById = new Map(
    usersSnapshot.docs.map((documentSnapshot) => [
      documentSnapshot.id,
      toBackendUser(
        documentSnapshot.id,
        documentSnapshot.data() as Partial<FirestoreUserRecord>,
      ),
    ]),
  );

  return sessionsSnapshot.docs
    .map((documentSnapshot) => {
      const data = documentSnapshot.data() as Partial<FirestoreSessionRecord>;

      return {
        _id: documentSnapshot.id,
        title:
          typeof data.title === "string" && data.title.trim()
            ? data.title.trim()
            : "Untitled Session",
        mentor:
          usersById.get(data.mentorId ?? "") ??
          toBackendUser(data.mentorId ?? "mentor", {
            name: "Unknown Mentor",
            email: "mentor@skillcache.demo",
          }),
        learner:
          usersById.get(data.learnerId ?? "") ??
          toBackendUser(data.learnerId ?? "learner", {
            name: "Unknown Learner",
            email: "learner@skillcache.demo",
          }),
        date:
          typeof data.date === "string" && data.date
            ? data.date
            : new Date().toISOString(),
        status: isApiSessionStatus(data.status) ? data.status : "upcoming",
      } satisfies ApiSession;
    })
    .sort(
      (firstSession, secondSession) =>
        new Date(firstSession.date).getTime() - new Date(secondSession.date).getTime(),
    );
}

export function subscribeToAuthState(
  onUserChange: (user: BackendUser | null) => void,
) {
  if (!isFirebaseConfigured()) {
    setBrowserAuthCookie(false);
    onUserChange(null);
    return () => undefined;
  }

  return onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
    if (!firebaseUser) {
      setBrowserAuthCookie(false);
      onUserChange(null);
      return;
    }

    void syncAuthenticatedUser(firebaseUser)
      .then((user) => {
        setBrowserAuthCookie(true);
        onUserChange(user);
      })
      .catch(() => {
        setBrowserAuthCookie(true);
        onUserChange(buildAuthenticatedUserFallback(firebaseUser));
      });
  });
}

export async function login(credentials: LoginInput) {
  const normalizedEmail = credentials.email.trim().toLowerCase();

  if (!normalizedEmail || !credentials.password) {
    throw new ApiError("Email and password are required.", 400);
  }

  try {
    assertFirebaseConfigured();

    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      credentials.password,
    );
    const user = await syncAuthenticatedUser(credential.user);

    setBrowserAuthCookie(true);

    return {
      message: "Login successful.",
      user,
    } satisfies AuthResponse;
  } catch (error) {
    throw mapFirebaseError(error, "Failed to log in.");
  }
}

export async function signup(payload: SignupInput) {
  const name = payload.name.trim();
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (!name || !normalizedEmail || !payload.password) {
    throw new ApiError("Name, email, and password are required.", 400);
  }

  try {
    assertFirebaseConfigured();

    const auth = getFirebaseAuth();
    const credential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      payload.password,
    );

    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }

    const user = await syncAuthenticatedUser(credential.user, {
      name,
      skillsOffered: payload.skillsOffered ?? [],
      skillsWanted: payload.skillsWanted ?? [],
    });

    setBrowserAuthCookie(true);

    return {
      message: "User created successfully.",
      user,
    } satisfies SignupResponse;
  } catch (error) {
    throw mapFirebaseError(error, "Failed to create user.");
  }
}

export async function logout() {
  try {
    if (!isFirebaseConfigured()) {
      return;
    }

    await signOut(getFirebaseAuth());
  } finally {
    setBrowserAuthCookie(false);
  }
}

export async function getMentors(skill?: string) {
  try {
    if (!isFirebaseConfigured()) {
      return normalizeMentors(fallbackUsers, skill);
    }

    const users = await loadUsersFromFirestore();
    return normalizeMentors(users, skill);
  } catch {
    return normalizeMentors(fallbackUsers, skill);
  }
}

export async function getSessions() {
  try {
    if (!isFirebaseConfigured()) {
      return buildFallbackSessions();
    }

    return await loadSessionsFromFirestore();
  } catch {
    return buildFallbackSessions();
  }
}

export async function getSessionById(id: string) {
  const sessions = await getSessions();
  const session = sessions.find((item) => item._id === id);

  if (!session) {
    throw new ApiError("Session not found.", 404);
  }

  return session;
}
