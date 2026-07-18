/**
 * Production SSE streaming drill — verify Vercel deploy seam (A3 step 4).
 *
 * Run against prod (ECHO_MODE=true recommended on Vercel for this drill):
 *   npm run prod-sse-drill
 *
 * Or with curl only:
 *   PROD=https://professor-me.vercel.app npm run prod-sse-drill -- --curl
 *
 * Env:
 *   PROD_BASE_URL — defaults to https://professor-me.vercel.app
 */

import { consumeTurnStream } from "../src/lib/sse";
import { spawn } from "child_process";

const PROD = process.env.PROD_BASE_URL ?? "https://professor-me.vercel.app";
const USE_CURL = process.argv.includes("--curl");

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

async function createSession(): Promise<string> {
  const res = await fetch(`${PROD}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "TCP congestion control" }),
  });
  if (!res.ok) {
    throw new Error(`create session failed: ${res.status} ${await res.text()}`);
  }
  const { session_id } = await res.json();
  return session_id;
}

async function drillWithFetch(sessionId: string): Promise<{
  tokenCount: number;
  hasDone: boolean;
  firstTokenMs: number;
  spanMs: number;
  incremental: boolean;
}> {
  const t0 = Date.now();
  const res = await fetch(`${PROD}/api/session/${sessionId}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_text: "prod SSE drill — streaming check" }),
  });

  if (!res.ok) {
    throw new Error(`turn failed: ${res.status} ${await res.text()}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    throw new Error(`expected text/event-stream, got: ${contentType}`);
  }

  let tokenCount = 0;
  let hasDone = false;
  let firstTokenMs = -1;
  const tokenTimes: number[] = [];

  for await (const event of consumeTurnStream(res)) {
    const now = Date.now();
    if (event.event === "token") {
      tokenCount++;
      tokenTimes.push(now);
      if (firstTokenMs < 0) firstTokenMs = now - t0;
    }
    if (event.event === "done") hasDone = true;
  }

  const spanMs = tokenTimes.length > 0 ? tokenTimes[tokenTimes.length - 1] - tokenTimes[0] : 0;
  const incremental =
    tokenCount >= 2 &&
    spanMs > 0 &&
    tokenTimes.some((t, i) => i > 0 && t > tokenTimes[i - 1]);

  return { tokenCount, hasDone, firstTokenMs, spanMs, incremental };
}

function drillWithCurl(sessionId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const child = spawn(
      "curl",
      [
        "-sN",
        "-X",
        "POST",
        `${PROD}/api/session/${sessionId}/turn`,
        "-H",
        "Content-Type: application/json",
        "-d",
        JSON.stringify({ user_text: "prod SSE drill — curl -N check" }),
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    child.stdout.on("data", (buf: Buffer) => chunks.push(buf.toString()));
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`curl exited ${code}`));
      else resolve(chunks.join(""));
    });
    child.on("error", reject);
  });
}

async function main(): Promise<void> {
  console.log(`\n=== Prod SSE drill @ ${PROD} ===\n`);

  let failures = 0;
  const sessionId = await createSession();
  log("✓", `session ${sessionId}`);

  if (USE_CURL) {
    const body = await drillWithCurl(sessionId);
    const tokenEvents = (body.match(/^event: token$/gm) ?? []).length;
    const hasDone = body.includes("event: done");

    console.log("\n--- curl -N output (first 500 chars) ---");
    console.log(body.slice(0, 500));
    console.log("---\n");

    log(tokenEvents >= 2 ? "✓" : "✗", `curl: ${tokenEvents} token event(s)`);
    log(hasDone ? "✓" : "✗", `curl: done event ${hasDone ? "present" : "missing"}`);
    if (tokenEvents < 2) failures++;
    if (!hasDone) failures++;
  } else {
    const result = await drillWithFetch(sessionId);
    log("✓", `content-type is text/event-stream`);
    log(result.tokenCount >= 2 ? "✓" : "✗", `${result.tokenCount} token event(s)`);
    log(result.hasDone ? "✓" : "✗", `done event ${result.hasDone ? "present" : "missing"}`);
    log(
      result.incremental ? "✓" : "⚠️",
      `incremental delivery: first token @ ${result.firstTokenMs}ms, token span ${result.spanMs}ms` +
        (result.incremental ? "" : " (may be buffered or echo too fast — check with ECHO_MODE)")
    );
    if (result.tokenCount < 2) failures++;
    if (!result.hasDone) failures++;
  }

  console.log(`\n=== ${failures === 0 ? "PASS" : `FAIL (${failures})`} ===`);
  console.log(
    "\nNote: set ECHO_MODE=true on Vercel for predictable echo streaming during this drill."
  );
  console.log(`Turn route maxDuration=60s — redeploy required after code change.\n`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
