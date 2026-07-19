/**
 * End-to-end tip flow (BILLING_MOCK — no real crypto).
 * Usage: npm run billing-e2e  (dev server on APP_BASE_URL)
 */

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";

const cookieJar = new Map<string, string>();

function storeCookies(res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const pair = line.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  const single = res.headers.get("set-cookie");
  if (single && raw.length === 0) {
    for (const part of single.split(/,(?=[^;]+?=)/)) {
      const pair = part.split(";")[0].trim();
      const eq = pair.indexOf("=");
      if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
}

function cookieHeader(): string {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const cookies = cookieHeader();
  if (cookies) headers.set("cookie", cookies);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  storeCookies(res);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`billing-e2e → ${BASE}`);

  {
    const { res, text } = await api("/support");
    assert(res.ok, `GET /support → ${res.status}`);
    assert(text.includes("Support the developers"), "missing support headline");
    assert(text.includes("Buy us a coffee"), "missing tip CTA");
    console.log("✓ /support");
  }

  {
    const { res } = await api("/pricing");
    assert(
      res.status === 200 || res.status === 307 || res.status === 308,
      `GET /pricing redirect → ${res.status}`
    );
    console.log("✓ /pricing redirects");
  }

  {
    const { res, json } = await api("/api/billing/status");
    assert(res.ok, `status → ${res.status}`);
    assert(json.billingMock === true, "expected BILLING_MOCK=true");
    assert(json.canCheckout === true, "expected canCheckout");
    assert(Array.isArray(json.tipAmounts), "expected tipAmounts");
    console.log("✓ status", json);
  }

  {
    const { res, json } = await api("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ amountUsdc: 5 }),
    });
    assert(res.ok, `checkout → ${res.status}: ${JSON.stringify(json)}`);
    assert(json.mock === true && json.thanks === true, "expected mock thanks");
    assert(json.amountUsdc === 5, "amount mismatch");
    console.log("✓ mock tip recorded");
  }

  {
    const sessionId = crypto.randomUUID();
    const { res, json } = await api("/api/session", {
      method: "POST",
      body: JSON.stringify({
        topic: "Photosynthesis",
        student: "elena",
        session_id: sessionId,
      }),
    });
    assert(
      res.ok,
      `Elena session free → ${res.status}: ${JSON.stringify(json).slice(0, 200)}`
    );
    assert(json.session_id === sessionId, "session_id mismatch");
    console.log("✓ Elena session without Pro gate");
  }

  console.log("\nbilling-e2e PASSED (tip / mock path)");
}

main().catch((err) => {
  console.error("\nbilling-e2e FAILED", err);
  process.exit(1);
});
