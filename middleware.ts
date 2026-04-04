import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, isProtectedPath } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isLoggedIn = Boolean(sessionToken);

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/dashboard" : "/auth", request.url),
    );
  }

  // Logged-in users don't need the auth page
  if (pathname === "/auth" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /complete-profile requires auth (but is not a "shell" protected path)
  if (pathname.startsWith("/complete-profile") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // All other protected paths require auth
  if (isProtectedPath(pathname) && !isLoggedIn) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/auth",
    "/complete-profile/:path*",
    "/dashboard/:path*",
    "/mentors/:path*",
    "/sessions/:path*",
    "/repository/:path*",
    "/profile/:path*",
    "/call/:path*",
  ],
};
