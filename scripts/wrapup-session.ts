/**
 * Longer-session WRAP_UP validation (A4).
 *
 * Runs a 15-turn full-graph teaching script until policy emits WRAP_UP
 * (session → wrapping), then POST /end.
 *
 *   npm run drill:wrapup
 *
 * Requires: ECHO_MODE=false, LLM_MOCK=false, server up.
 * Tunables: APP_BASE_URL, TURN_PACE_MS (default 4000), PARALLEL_EVAL via body.
 */

import wrapup from "../src/llm/harness/wrapup-session.json";
import { consumeTurnStream } from "../src/lib/sse";
import type { Session, TurnSSEEvent } from "../src/lib/types";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? "4000");
const PARALLEL = process.env.PARALLEL_EVAL === "true";

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function createSession(topic: string): Promise<string> {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error(`create: ${res.status} ${await res.text()}`);
  const { session_id } = await res.json();
  return session_id;
}

async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/session/${id}`);
  if (!res.ok) throw new Error(`get: ${res.status}`);
  return res.json();
}

async function postTurn(sessionId: string, userText: string) {
  const res = await fetch(`${BASE}/api/session/${sessionId}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_text: userText, parallel_eval: PARALLEL }),
  });
  if (!res.ok) throw new Error(`turn: ${res.status} ${await res.text()}`);
  const events: TurnSSEEvent[] = [];
  let studentText = "";
  for await (const event of consumeTurnStream(res)) {
    events.push(event);
    if (event.event === "token") studentText += event.data.text;
  }
  return { events, studentText };
}

async function endSession(sessionId: string) {
  const res = await fetch(`${BASE}/api/session/${sessionId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`end: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main(): Promise<void> {
  console.log(`\n=== WRAP_UP validation @ ${BASE} ===`);
  console.log(`mode=${PARALLEL ? "parallel" : "sequential"} turns≤${wrapup.turns.length} pace=${TURN_PACE_MS}ms\n`);

  if (process.env.ECHO_MODE === "true") {
    console.error("Set ECHO_MODE=false");
    process.exit(1);
  }

  const sessionId = await createSession(wrapup.topic);
  log("✓", `session ${sessionId}`);

  let wrapUpAt: number | null = null;
  let wrappingStatus = false;

  for (let i = 0; i < wrapup.turns.length; i++) {
    const userText = wrapup.turns[i];
    if (i > 0 && TURN_PACE_MS > 0) await delay(TURN_PACE_MS);

    console.log(`\n--- turn ${i + 1}/${wrapup.turns.length} ---`);
    console.log(`user: ${userText.slice(0, 90)}${userText.length > 90 ? "…" : ""}`);

    const { events, studentText } = await postTurn(sessionId, userText);
    const done = events.find((e) => e.event === "done");
    if (!done) throw new Error("no done event");

    const d = done.data.directive;
    log(
      "→",
      `directive=${d?.type ?? "?"}${d?.node_id ? `(${d.node_id})` : ""} status=${done.data.session_status}`
    );
    log("→", `student: ${studentText.slice(0, 110)}${studentText.length > 110 ? "…" : ""}`);

    if (d?.type === "WRAP_UP") wrapUpAt = i + 1;
    if (done.data.session_status === "wrapping") wrappingStatus = true;

    // Parallel: WRAP_UP is computed one turn before it's spoken — keep going
    // until wrapping status appears (or we exhaust the script).
    if (wrappingStatus || (wrapUpAt !== null && !PARALLEL)) {
      log("✓", `policy ended the session at turn ${wrapUpAt ?? i + 1} (WRAP_UP → wrapping)`);
      break;
    }
  }

  const mid = await getSession(sessionId);
  const states = mid.graph.nodes.map((n) => `${n.id}:${n.state}`).join(", ");
  log("→", `node states: ${states}`);
  const unvisited = mid.graph.nodes.filter(
    (n) => n.state === "unvisited" || n.state === "touched"
  );
  if (unvisited.length) {
    log("⚠️", `still open: ${unvisited.map((n) => `${n.id}(${n.name})`).join(", ")}`);
  }

  const { gap_map } = await endSession(sessionId);
  const ended = await getSession(sessionId);
  log("✓", `POST /end → status=${ended.status}`);
  log("→", `one_liner: "${gap_map.one_liner}"`);

  const ok = wrapUpAt !== null && (wrappingStatus || ended.status === "ended");
  if (!ok) {
    log("✗", "WRAP_UP never fired — session did not end by policy");
    process.exit(1);
  }

  console.log(
    `\n=== PASS — WRAP_UP at turn ${wrapUpAt}, then /end (policy decided it was over) ===\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
