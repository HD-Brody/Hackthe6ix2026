import { Auth0Client } from "@auth0/nextjs-auth0/server";

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
 * that uses auth must degrade gracefully to the anonymous "dev" identity.
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

/** The user_id sessions are stored under: Auth0 sub, or "dev" when anonymous. */
export async function getUserId(): Promise<string> {
  const user = await getAuthUser();
  return user?.sub ?? "dev";
}
