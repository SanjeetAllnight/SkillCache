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
