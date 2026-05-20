"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  DEFAULT_AUTH_REDIRECT,
  isProtectedPath,
  resolveAuthRedirect,
  setBrowserAuthCookie,
  clearAllAuthStorage,
} from "@/lib/auth";
import type { BackendUser } from "@/lib/mockUser";
import {
  createUserProfile,
  getUserProfile,
  updateLastLoginAt,
} from "@/lib/firebaseServices";

type AuthContextValue = {
  user: BackendUser | null;
  isLoggedIn: boolean;
  isAuthReady: boolean;
  login: (credentials: { email: string; password: string }, redirectTo?: string) => Promise<void>;
  signup: (payload: { name: string; email: string; password: string; skillsOffered?: string[]; skillsWanted?: string[] }, redirectTo?: string) => Promise<void>;
  googleLogin: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  isAuthReady: false,
  login: async () => undefined,
  signup: async () => undefined,
  googleLogin: async () => undefined,
  logout: async () => undefined,
});

export function AuthProvider({
  initialIsLoggedIn,
  children,
}: Readonly<{
  initialIsLoggedIn: boolean;
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  // isAuthReady = false until onAuthStateChanged fires for the first time.
  // This prevents ANY redirect logic from running before we know the truth.
  const [isAuthReady, setIsAuthReady] = useState(false);

  // We use initialIsLoggedIn only as a UI hint (avoids layout flash on first
  // paint). Routing decisions always wait for isAuthReady === true.
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [user, setUser] = useState<BackendUser | null>(null);

  // Keep refs so the onAuthStateChanged closure always sees the latest values
  // without needing to be re-registered on every route change.
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { routerRef.current = router; }, [router]);

  // ─── Sync Firestore profile into context user ──────────────────────────────
  const syncUserFromFirestore = useCallback(async (uid: string, email: string | null) => {
    const profile = await getUserProfile(uid);
    if (profile) {
      setUser({
        _id: uid,
        name: profile.name || "SkillCache Member",
        email: profile.email || email || "",
        skillsOffered: profile.skillsOffered || [],
        skillsWanted: profile.skillsWanted || [],
        firstLoginCompleted: profile.firstLoginCompleted ?? false,
      });
    } else {
      setUser({
        _id: uid,
        name: "SkillCache Member",
        email: email || "",
        skillsOffered: [],
        skillsWanted: [],
        firstLoginCompleted: false,
      });
    }
  }, []);

  // ─── Single source of truth: onAuthStateChanged ────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ── Authenticated ──────────────────────────────────────────────────
        await syncUserFromFirestore(firebaseUser.uid, firebaseUser.email);
        // Stamp lastLoginAt (fire-and-forget; non-blocking)
        void updateLastLoginAt(firebaseUser.uid);
        setIsLoggedIn(true);
        setBrowserAuthCookie(true);

        // Profile-completion gate
        const currentPath = pathnameRef.current;
        if (currentPath && !currentPath.startsWith("/complete-profile")) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            if (!profile || profile.profileComplete === false) {
              routerRef.current.replace("/complete-profile");
            }
          } catch {
            // Non-fatal — profile check failed, don't redirect
          }
        }

        // If auth is ready and user lands on /auth while logged in → dashboard
        if (currentPath === "/auth") {
          routerRef.current.replace(DEFAULT_AUTH_REDIRECT);
        }
      } else {
        // ── Unauthenticated ────────────────────────────────────────────────
        // Wipe user state first so no stale data leaks to the next account.
        setUser(null);
        setIsLoggedIn(false);
        // Ensure cookie is killed (belt-and-suspenders in case the explicit
        // logout path was bypassed, e.g. token expired server-side).
        setBrowserAuthCookie(false);

        const currentPath = pathnameRef.current;
        if (currentPath && isProtectedPath(currentPath)) {
          const params = new URLSearchParams({ next: currentPath }).toString();
          routerRef.current.replace(`/auth?${params}`);
        }
      }

      // Mark auth as resolved — now the UI can render gated content.
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUserFromFirestore]); // intentionally omit pathname/router — use refs

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (
    credentials: { email: string; password: string },
    redirectTo = DEFAULT_AUTH_REDIRECT,
  ) => {
    await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    router.replace(resolveAuthRedirect(redirectTo));
    router.refresh();
  }, [router]);

  // ─── Signup ────────────────────────────────────────────────────────────────
  const signup = useCallback(async (
    payload: { name: string; email: string; password: string; skillsOffered?: string[]; skillsWanted?: string[] },
    _redirectTo = DEFAULT_AUTH_REDIRECT,
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    await createUserProfile(cred.user.uid, { name: payload.name, email: payload.email });
    router.replace("/complete-profile");
    router.refresh();
  }, [router]);

  // ─── Google Login ──────────────────────────────────────────────────────────
  const googleLogin = useCallback(async (redirectTo = DEFAULT_AUTH_REDIRECT) => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    await createUserProfile(cred.user.uid, {
      name: cred.user.displayName || "SkillCache Member",
      email: cred.user.email || "",
    });

    const profile = await getUserProfile(cred.user.uid);
    if (!profile || profile.profileComplete === false) {
      router.replace("/complete-profile");
    } else {
      router.replace(resolveAuthRedirect(redirectTo));
    }
    router.refresh();
  }, [router]);

  // ─── Logout ────────────────────────────────────────────────────────────────
  // Order is critical:
  //   1. Clear all browser storage so the middleware cookie is gone immediately.
  //   2. Null out React state so no stale user data flashes.
  //   3. Call Firebase signOut (which triggers onAuthStateChanged → null).
  //   4. Only then navigate — the middleware will see no cookie and allow /auth.
  const logout = useCallback(async () => {
    // Step 1 — Wipe cookie + localStorage + sessionStorage + IndexedDB.
    await clearAllAuthStorage();

    // Step 2 — Eagerly clear React state so UI updates instantly.
    setUser(null);
    setIsLoggedIn(false);

    // Step 3 — Tell Firebase to invalidate the session.
    await signOut(auth);

    // Step 4 — Navigate. Middleware will now see no cookie → allow /auth.
    router.replace("/auth");
    // Force a full server-component re-render so the root layout re-reads
    // the (now absent) cookie and passes initialIsLoggedIn=false.
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      isAuthReady,
      login,
      signup,
      googleLogin,
      logout,
    }),
    [user, isLoggedIn, isAuthReady, login, signup, googleLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
