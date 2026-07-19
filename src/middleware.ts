import { NextRequest, NextResponse } from "next/server";

import { isAuthConfigured } from "./lib/authEnv";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  if (!isAuthConfigured()) {
    if (request.nextUrl.pathname.startsWith("/auth/")) {
      return new NextResponse(
        "Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and AUTH0_SECRET in your deployment environment, then redeploy.",
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  try {
    // Delegate /auth/* routes and session handling to the Auth0 SDK middleware.
    return await auth0.middleware(request);
  } catch (error) {
    console.error("[auth middleware]", error);
    if (request.nextUrl.pathname.startsWith("/auth/")) {
      return new NextResponse(
        "Authentication failed. Check Vercel logs and Auth0 env configuration (AUTH0_DOMAIN must not include https://).",
        { status: 500 },
      );
    }
    return NextResponse.next();
  }
}

export const config = {
  // Run middleware on all paths except static files, public folder files, images, favicon
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|audio/|images/|api/session).*)",
  ],
};
