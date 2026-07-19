/**
 * Anonymous visitor identity — one cookie per browser, never a shared pool.
 *
 * Historically getUserId() fell back to "dev" for every logged-out visitor,
 * so profile/analytics listed every teammate's anonymous sessions. Anonymous
 * sessions are now scoped as `anon:<uuid>` from the pm_anon_uid cookie.
 */

export const ANON_COOKIE_NAME = "pm_anon_uid";

/** One year — survives typical local-dev and demo revisits. */
export const ANON_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidAnonCookieValue(value: string | undefined | null): boolean {
  return Boolean(value && UUID_RE.test(value));
}

/** Stable Mongo user_id for an anonymous browser. */
export function formatAnonUserId(cookieValue: string): string {
  return `anon:${cookieValue}`;
}

/**
 * Resolve the sessions user_id from Auth0 sub + optional anon cookie.
 * Never returns the legacy shared "dev" pool.
 */
export function resolveUserId(
  authSub: string | null | undefined,
  anonCookieValue: string | null | undefined
): { userId: string; needsAnonCookie: string | null } {
  if (authSub) {
    return { userId: authSub, needsAnonCookie: null };
  }
  if (isValidAnonCookieValue(anonCookieValue)) {
    return {
      userId: formatAnonUserId(anonCookieValue!),
      needsAnonCookie: null,
    };
  }
  // Caller must mint + persist a new cookie value.
  return { userId: "", needsAnonCookie: "mint" };
}

export function anonCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ANON_COOKIE_MAX_AGE_SEC,
    secure,
  };
}
