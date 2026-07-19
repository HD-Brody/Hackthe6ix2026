import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

import { prepareAuthEnvForSdk } from "./authEnv";
import {
  ANON_COOKIE_NAME,
  anonCookieOptions,
  resolveUserId,
} from "./anonIdentity";

prepareAuthEnvForSdk();

export const auth0 = new Auth0Client();

export interface AuthUser {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
}

/**
 * Current Auth0 user, or null when logged out OR when Auth0 isn't configured.
 * Guarded so the demo never dies because of a missing env var — everything
 * that uses auth must degrade gracefully to a per-browser anonymous identity.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const session = await auth0.getSession();
    const user = session?.user;
    if (!user?.sub) return null;
    return {
      sub: user.sub,
      name: (user.name as string) ?? (user.email as string) ?? "Professor",
      email: user.email as string | undefined,
      picture: user.picture as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * The user_id sessions are stored under: Auth0 sub when logged in, otherwise
 * `anon:<uuid>` from an httpOnly cookie (one browser → one pool).
 *
 * Never use the legacy shared "dev" id — that made every logged-out visitor
 * see every other anonymous session in Mongo.
 */
export async function getUserId(): Promise<string> {
  const user = await getAuthUser();
  const jar = await cookies();
  const existingCookie = jar.get(ANON_COOKIE_NAME)?.value;
  const resolved = resolveUserId(user?.sub, existingCookie);

  if (!resolved.needsAnonCookie) {
    return resolved.userId;
  }

  const minted = randomUUID();
  try {
    jar.set(
      ANON_COOKIE_NAME,
      minted,
      anonCookieOptions(process.env.NODE_ENV === "production")
    );
  } catch {
    // cookies().set throws in Server Components; middleware stamps the cookie
    // on the response for the next request. Using the minted id for this
    // render keeps lists empty instead of leaking the shared "dev" pool.
  }
  return `anon:${minted}`;
}
