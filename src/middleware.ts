import { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  // Delegate handling of auth routes (/auth/login, /auth/logout, etc.) to the Auth0 SDK.
  // It handles these routes and returns a response, otherwise it falls through
  // and allows the request to proceed.
  return await auth0.middleware(request);
}

export const config = {
  // Run middleware on all paths except static files, public folder files, images, favicon
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|audio/|images/|api/session).*)",
  ],
};
