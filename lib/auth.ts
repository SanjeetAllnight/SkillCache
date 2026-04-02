export const AUTH_COOKIE_NAME = "skillcache_auth";
export const AUTH_COOKIE_VALUE = "1";
export const AUTH_STORAGE_KEY = "skillcache_auth";
export const AUTH_TOKEN_STORAGE_KEY = "skillcache_token";
export const AUTH_USER_STORAGE_KEY = "skillcache_user";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const DEFAULT_AUTH_REDIRECT = "/dashboard";

export function resolveAuthRedirect(pathname?: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return pathname;
}
