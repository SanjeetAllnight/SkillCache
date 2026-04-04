"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
} from "@/lib/auth";
import type { BackendUser } from "@/lib/mockUser";
import {
  createUserProfile,
  getUserProfile,
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
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<BackendUser | null>(null);

  const syncUserFromFirestore = useCallback(async (uid: string, email: string | null) => {
    const profile = await getUserProfile(uid);
    if (profile) {
      setUser({
        _id: uid,
        name: profile.name || "SkillCache Member",
        email: profile.email || email || "",
        skillsOffered: profile.skillsOffered || [],
        skillsWanted: profile.skillsWanted || [],
      });
    } else {
      setUser({
        _id: uid,
        name: "SkillCache Member",
        email: email || "",
        skillsOffered: [],
        skillsWanted: [],
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await syncUserFromFirestore(firebaseUser.uid, firebaseUser.email);
        setIsLoggedIn(true);
        setBrowserAuthCookie(true);

        // Gate: if no Firestore doc or profileComplete === false → redirect
        if (pathname && !pathname.startsWith("/complete-profile")) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (!profile || profile.profileComplete === false) {
            router.replace("/complete-profile");
          }
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setBrowserAuthCookie(false);

        if (pathname && isProtectedPath(pathname)) {
          const params = new URLSearchParams({ next: pathname }).toString();
          router.replace(`/auth?${params}`);
        }
      }

      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [pathname, router, syncUserFromFirestore]);

  const login = useCallback(async (credentials: { email: string; password: string }, redirectTo = DEFAULT_AUTH_REDIRECT) => {
    await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    router.replace(resolveAuthRedirect(redirectTo));
    router.refresh();
  }, [router]);

  const signup = useCallback(async (payload: { name: string; email: string; password: string; skillsOffered?: string[]; skillsWanted?: string[] }, redirectTo = DEFAULT_AUTH_REDIRECT) => {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    // Write initial profile to Firestore
    await createUserProfile(cred.user.uid, { name: payload.name, email: payload.email });
    // Redirect new users to complete their profile
    router.replace("/complete-profile");
    router.refresh();
  }, [router]);

  const googleLogin = useCallback(async (redirectTo = DEFAULT_AUTH_REDIRECT) => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    // Write initial profile only if the Firestore doc doesn't exist yet
    await createUserProfile(cred.user.uid, {
      name: cred.user.displayName || "SkillCache Member",
      email: cred.user.email || "",
    });

    // Check completion and redirect accordingly
    const profile = await getUserProfile(cred.user.uid);
    if (!profile || profile.profileComplete === false) {
      router.replace("/complete-profile");
    } else {
      router.replace(resolveAuthRedirect(redirectTo));
    }
    router.refresh();
  }, [router]);

  const logout = useCallback(async () => {
    await signOut(auth);
    router.replace("/auth");
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
