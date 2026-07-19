export const AUTH_COOKIE_NAME = "skillcache_auth";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const DEFAULT_AUTH_REDIRECT = "/dashboard";
export const AUTH_COOKIE_OPTIONS = `path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`;
export const protectedPrefixes = [
  "/dashboard",
  "/mentors",
  "/sessions",
  "/repository",
  "/profile",
  "/call",
] as const;

export function resolveAuthRedirect(pathname?: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return pathname;
}

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function setBrowserAuthCookie(isAuthenticated: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = isAuthenticated
    ? `${AUTH_COOKIE_NAME}=1; ${AUTH_COOKIE_OPTIONS}`
    : `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Nuclear-clear every Firebase auth artefact from the browser so that no
 * stale session survives a logout or an account-switch.
 *
 * Firebase stores auth tokens in:
 *   - localStorage  (firebase:authUser:*, firebase:pendingRedirect, etc.)
 *   - sessionStorage (same pattern)
 *   - IndexedDB     (firebaseLocalStorageDb / firebase-heartbeat-database)
 *
 * We wipe the recognisable localStorage/sessionStorage entries here.
 * The IndexedDB stores are cleared by deleting the known database names.
 */
export async function clearAllAuthStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Kill the browser cookie immediately.
  setBrowserAuthCookie(false);

  // 2. localStorage — remove any key that looks like it belongs to Firebase.
  const localKeysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith("firebase:") ||
        key.startsWith("firebaseui:") ||
        key.includes("firebaseLocalStorage"))
    ) {
      localKeysToDelete.push(key);
    }
  }
  localKeysToDelete.forEach((k) => localStorage.removeItem(k));

  // 3. sessionStorage — same pass.
  const sessionKeysToDelete: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (
      key &&
      (key.startsWith("firebase:") || key.startsWith("firebaseui:"))
    ) {
      sessionKeysToDelete.push(key);
    }
  }
  sessionKeysToDelete.forEach((k) => sessionStorage.removeItem(k));

  // 4. IndexedDB — delete the two databases Firebase creates.
  const dbNames = ["firebaseLocalStorageDb", "firebase-heartbeat-database"];
  await Promise.allSettled(
    dbNames.map(
      (name) =>
        new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve(); // non-fatal
          req.onblocked = () => resolve(); // non-fatal
        }),
    ),
  );
}
