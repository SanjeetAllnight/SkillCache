"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  DEFAULT_AUTH_REDIRECT,
  isProtectedPath,
  resolveAuthRedirect,
} from "@/lib/auth";
import {
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
  subscribeToAuthState,
  type LoginInput,
  type SignupInput,
} from "@/lib/api";
import { mockUser, toDisplayUser, type MockUser } from "@/lib/mockUser";

type MockUserContextValue = {
  user: MockUser;
  isLoggedIn: boolean;
  isAuthReady: boolean;
  login: (credentials: LoginInput, redirectTo?: string) => Promise<void>;
  signup: (payload: SignupInput, redirectTo?: string) => Promise<void>;
  logout: () => void;
};

const MockUserContext = createContext<MockUserContextValue>({
  user: mockUser,
  isLoggedIn: false,
  isAuthReady: false,
  login: async () => undefined,
  signup: async () => undefined,
  logout: () => undefined,
});

export function MockUserProvider({
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
  const [user, setUser] = useState(mockUser);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToAuthState((authenticatedUser) => {
      if (!isMounted) {
        return;
      }

      if (authenticatedUser) {
        setUser(toDisplayUser(authenticatedUser));
        setIsLoggedIn(true);
      } else {
        setUser(mockUser);
        setIsLoggedIn(false);

        if (isProtectedPath(pathname)) {
          const authPath = new URLSearchParams({
            next: pathname,
          }).toString();
          router.replace(`/auth?${authPath}`);
        }
      }

      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [pathname, router]);

  const login = useCallback(async (credentials: LoginInput, redirectTo = DEFAULT_AUTH_REDIRECT) => {
    const auth = await loginRequest(credentials);
    setUser(toDisplayUser(auth.user));
    setIsLoggedIn(true);
    router.replace(resolveAuthRedirect(redirectTo));
    router.refresh();
  }, [router]);

  const signup = useCallback(async (payload: SignupInput, redirectTo = DEFAULT_AUTH_REDIRECT) => {
    const auth = await signupRequest(payload);
    setUser(toDisplayUser(auth.user));
    setIsLoggedIn(true);
    router.replace(resolveAuthRedirect(redirectTo));
    router.refresh();
  }, [router]);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(mockUser);
    void logoutRequest();
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
      logout,
    }),
    [user, isLoggedIn, isAuthReady, login, signup, logout],
  );

  return (
    <MockUserContext.Provider value={value}>{children}</MockUserContext.Provider>
  );
}

export function useMockUser() {
  return useContext(MockUserContext);
}
