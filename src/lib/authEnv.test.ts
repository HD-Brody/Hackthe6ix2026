import { describe, expect, it, afterEach } from "vitest";

import {
  isAuthConfigured,
  prepareAuthEnvForSdk,
  resolveAppBaseUrl,
  sanitizeAuth0Domain,
} from "./authEnv";

const ENV_KEYS = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "APP_BASE_URL",
  "VERCEL",
  "NODE_ENV",
] as const;

function clearAuthEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("sanitizeAuth0Domain", () => {
  afterEach(clearAuthEnv);

  it("strips scheme and trailing slash", () => {
    expect(sanitizeAuth0Domain("https://tenant.us.auth0.com/")).toBe(
      "tenant.us.auth0.com",
    );
  });

  it("returns undefined for empty values", () => {
    expect(sanitizeAuth0Domain("  ")).toBeUndefined();
  });
});

describe("resolveAppBaseUrl", () => {
  afterEach(clearAuthEnv);

  it("returns undefined on Vercel so the SDK infers the request host", () => {
    process.env.VERCEL = "1";
    process.env.APP_BASE_URL = "http://localhost:3000";
    expect(resolveAppBaseUrl()).toBeUndefined();
  });

  it("adds a scheme for bare hostnames in local dev", () => {
    process.env.APP_BASE_URL = "localhost:3000";
    expect(resolveAppBaseUrl()).toBe("http://localhost:3000");
  });

  it("returns undefined for invalid URLs instead of throwing", () => {
    process.env.APP_BASE_URL = "not a url!!!";
    expect(resolveAppBaseUrl()).toBeUndefined();
  });
});

describe("prepareAuthEnvForSdk", () => {
  afterEach(clearAuthEnv);

  it("clears invalid APP_BASE_URL on Vercel before the SDK reads it", () => {
    process.env.VERCEL = "1";
    process.env.APP_BASE_URL = "professor-me.vercel.app";
    process.env.AUTH0_DOMAIN = "https://tenant.us.auth0.com/";

    prepareAuthEnvForSdk();

    expect(process.env.APP_BASE_URL).toBeUndefined();
    expect(process.env.AUTH0_DOMAIN).toBe("tenant.us.auth0.com");
  });
});

describe("isAuthConfigured", () => {
  afterEach(clearAuthEnv);

  it("requires all four Auth0 env vars", () => {
    process.env.AUTH0_DOMAIN = "tenant.us.auth0.com";
    process.env.AUTH0_CLIENT_ID = "cid";
    process.env.AUTH0_CLIENT_SECRET = "secret";
    process.env.AUTH0_SECRET = "a".repeat(32);
    expect(isAuthConfigured()).toBe(true);
  });

  it("is false when domain is missing", () => {
    process.env.AUTH0_CLIENT_ID = "cid";
    process.env.AUTH0_CLIENT_SECRET = "secret";
    process.env.AUTH0_SECRET = "a".repeat(32);
    expect(isAuthConfigured()).toBe(false);
  });
});
