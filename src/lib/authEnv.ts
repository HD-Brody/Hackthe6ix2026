/**
 * Normalize Auth0 env vars for local dev and Vercel production.
 *
 * Common production misconfigs that crash middleware with MIDDLEWARE_INVOCATION_FAILED:
 * - APP_BASE_URL copied as http://localhost:3000
 * - APP_BASE_URL set to a bare hostname (no https://) → TypeError: Invalid URL at import
 * - AUTH0_DOMAIN includes https:// → double-scheme issuer URLs
 */

export function sanitizeAuth0Domain(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function resolveAppBaseUrl(): string | undefined {
  // On Vercel, infer the host from each request so preview deploys, domain
  // aliases (hackthe6ix2026 → professor-me), and redirects all work without
  // chasing APP_BASE_URL. Register each host in Auth0 Allowed Callback URLs.
  if (process.env.VERCEL === "1") return undefined;

  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) return undefined;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return undefined;
  }
}

export function isAuthConfigured(): boolean {
  return Boolean(
    sanitizeAuth0Domain(process.env.AUTH0_DOMAIN) &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET,
  );
}

/**
 * Mutate process.env so @auth0/nextjs-auth0 reads sane values. The SDK always
 * falls back to APP_BASE_URL from the environment even when appBaseUrl is
 * omitted from the constructor, so invalid Vercel values must be cleared here.
 */
export function prepareAuthEnvForSdk(): void {
  const domain = sanitizeAuth0Domain(process.env.AUTH0_DOMAIN);
  if (domain) {
    process.env.AUTH0_DOMAIN = domain;
  }

  const appBaseUrl = resolveAppBaseUrl();
  if (appBaseUrl) {
    process.env.APP_BASE_URL = appBaseUrl;
  } else {
    delete process.env.APP_BASE_URL;
  }
}
