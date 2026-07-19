import { describe, expect, it } from "vitest";
import {
  formatAnonUserId,
  isValidAnonCookieValue,
  resolveUserId,
} from "./anonIdentity";

describe("anonIdentity", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts only UUID cookie values", () => {
    expect(isValidAnonCookieValue(uuid)).toBe(true);
    expect(isValidAnonCookieValue("dev")).toBe(false);
    expect(isValidAnonCookieValue("not-a-uuid")).toBe(false);
    expect(isValidAnonCookieValue("")).toBe(false);
  });

  it("formats anon user ids with a stable prefix", () => {
    expect(formatAnonUserId(uuid)).toBe(`anon:${uuid}`);
  });

  it("prefers Auth0 sub over the anon cookie", () => {
    expect(resolveUserId("auth0|abc", uuid)).toEqual({
      userId: "auth0|abc",
      needsAnonCookie: null,
    });
  });

  it("uses the anon cookie when logged out", () => {
    expect(resolveUserId(null, uuid)).toEqual({
      userId: `anon:${uuid}`,
      needsAnonCookie: null,
    });
  });

  it("never falls back to the shared legacy 'dev' pool", () => {
    const missing = resolveUserId(null, undefined);
    expect(missing.userId).not.toBe("dev");
    expect(missing.needsAnonCookie).toBe("mint");

    const legacy = resolveUserId(null, "dev");
    expect(legacy.userId).not.toBe("dev");
    expect(legacy.needsAnonCookie).toBe("mint");
  });
});
