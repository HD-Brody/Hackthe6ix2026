import { NextRequest, NextResponse } from "next/server";

import {
  ANON_COOKIE_NAME,
  anonCookieOptions,
  isValidAnonCookieValue,
} from "./lib/anonIdentity";
import { isAuthConfigured } from "./lib/authEnv";
import { auth0 } from "./lib/auth0";

/** Ensure every browser has a private anon id before pages/APIs read history. */
function withAnonCookie(request: NextRequest, response: NextResponse): NextResponse {
  const current = request.cookies.get(ANON_COOKIE_NAME)?.value;
  if (isValidAnonCookieValue(current)) {
    return response;
  }
  // Web Crypto — Edge middleware cannot import Node's `crypto` module.
  response.cookies.set(
    ANON_COOKIE_NAME,
    crypto.randomUUID(),
    anonCookieOptions(process.env.NODE_ENV === "production")
  );
  return response;
}

function skipAuth0Middleware(pathname: string): boolean {
  // Session/notes APIs were historically excluded from Auth0 middleware so
  // SSE/turn traffic isn't wrapped — still stamp the anon cookie on them.
  return (
    pathname.startsWith("/api/session") ||
    pathname.startsWith("/api/sessions") ||
    pathname.startsWith("/api/notes")
  );
}

export async function middleware(request: NextRequest) {
  if (skipAuth0Middleware(request.nextUrl.pathname)) {
    return withAnonCookie(request, NextResponse.next());
  }

  if (!isAuthConfigured()) {
    if (request.nextUrl.pathname.startsWith("/auth/")) {
      return new NextResponse(
        "Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and AUTH0_SECRET in your deployment environment, then redeploy.",
        { status: 503 },
      );
    }
    return withAnonCookie(request, NextResponse.next());
  }

  try {
    // Delegate /auth/* routes and session handling to the Auth0 SDK middleware.
    const authResponse = await auth0.middleware(request);
    return withAnonCookie(request, authResponse as NextResponse);
  } catch (error) {
    console.error("[auth middleware]", error);
    if (request.nextUrl.pathname.startsWith("/auth/")) {
      return new NextResponse(
        "Authentication failed. Check Vercel logs and Auth0 env configuration (AUTH0_DOMAIN must not include https://).",
        { status: 500 },
      );
    }
    return withAnonCookie(request, NextResponse.next());
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|audio/|images/).*)",
  ],
};
