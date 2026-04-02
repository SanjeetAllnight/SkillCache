import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from "@/lib/auth";
import type { BackendUser } from "@/lib/mockUser";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api";

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
  token: string;
  user: BackendUser;
};

type SignupResponse = {
  message: string;
  user: BackendUser;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStoredToken() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredUser() {
  if (!isBrowser()) {
    return null;
  }

  const storedUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as BackendUser;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: AuthResponse) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, auth.token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(auth.user));
  window.localStorage.setItem(AUTH_STORAGE_KEY, "1");
}

export function clearStoredAuth() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "Something went wrong.";

    try {
      const data = (await response.json()) as { message?: string };
      errorMessage = data.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

export async function login(credentials: LoginInput) {
  const auth = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  setStoredAuth(auth);
  return auth;
}

export async function signup(payload: SignupInput) {
  return apiFetch<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMentors(skill?: string) {
  const query = skill ? `?skill=${encodeURIComponent(skill)}` : "";
  return apiFetch<BackendUser[]>(`/mentors${query}`);
}

export async function getSessions() {
  return apiFetch<ApiSession[]>("/sessions");
}

export async function getSessionById(id: string) {
  return apiFetch<ApiSession>(`/sessions/${id}`);
}
