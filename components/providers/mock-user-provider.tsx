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
import { useRouter } from "next/navigation";

import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  DEFAULT_AUTH_REDIRECT,
  resolveAuthRedirect,
} from "@/lib/auth";
import {
  clearStoredAuth,
  getStoredUser,
  login as loginRequest,
  signup as signupRequest,
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
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState(mockUser);

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser) {
      setUser(toDisplayUser(storedUser));
      setIsLoggedIn(true);
    }

    setIsAuthReady(true);
  }, []);

  const login = useCallback(async (credentials: LoginInput, redirectTo = DEFAULT_AUTH_REDIRECT) => {
    const auth = await loginRequest(credentials);
    setUser(toDisplayUser(auth.user));
    setIsLoggedIn(true);
    document.cookie = `${AUTH_COOKIE_NAME}=${AUTH_COOKIE_VALUE}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`;
    router.replace(resolveAuthRedirect(redirectTo));
    router.refresh();
  }, [router]);

  const signup = useCallback(async (payload: SignupInput, redirectTo = DEFAULT_AUTH_REDIRECT) => {
    await signupRequest(payload);
    await login(
      {
        email: payload.email,
        password: payload.password,
      },
      redirectTo,
    );
  }, [login]);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(mockUser);
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
    clearStoredAuth();
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
