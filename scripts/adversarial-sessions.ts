/**
 * B4 adversarial sessions — rambler / confident-wrong / derailer.
 *
 * Run (dev server up, ECHO_MODE=false, LLM_MOCK=false, PARALLEL_EVAL=true):
 *   npm run drill:adversarial
 *
 * Watches:
 *   - persona ≤2 sentences, no parroting of user fragments
 *   - policy: no probe loops, ADVANCE past wrong/dodge/derail
 *   - parallel one-turn lag: logs spoken directive vs this-turn verdict
 *   - gap map projector bar: one_liner stings, quotes verbatim
 *
 * Tunables: TURN_PACE_MS (default 8000), APP_BASE_URL
 */

import adversarial from "../src/llm/harness/adversarial-scripts.json";
import { consumeTurnStream } from "../src/lib/sse";
import type { GapMap, Session, TurnSSEEvent, Directive } from "../src/lib/types";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? "8000");
const SCRIPT_FILTER = process.argv.find((a) => a.startsWith("--script="))?.slice(9);

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
}

/** Heuristic: persona pasted a ≥4-word user fragment back. */
function looksLikeParrot(userText: string, studentText: string): string | null {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const u = normalize(userText);
  const s = normalize(studentText);
  const words = u.split(" ").filter((w) => w.length > 2);
  for (let len = Math.min(8, words.length); len >= 4; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const frag = words.slice(i, i + len).join(" ");
      if (frag.length >= 18 && s.includes(frag)) return frag;
    }
  }
  return null;
}

function oneLinerStings(line: string): boolean {
  if (!line.trim()) return false;
  const flat =
    /\b(pretty well|some gaps|needs more depth|struggle with others|overall solid|a few vague|did well but)\b/i;
  return !flat.test(line);
}

async function freeSessionSlots(): Promise<void> {
  // Session cap is per user_id (Auth0 sub, or anon:<uuid> cookie when logged out).
  // raise MAX_SESSIONS_PER_USER in .env.local (drills create many sessions).
  log("→", "session cap: using user_id=dev (raise MAX_SESSIONS_PER_USER if 429)");
}

async function createSession(topic: string): Promise<string> {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error(`create session: ${res.status} ${await res.text()}`);
  const { session_id } = await res.json();
  return session_id;
}

async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/session/${id}`);
  if (!res.ok) throw new Error(`get session: ${res.status}`);
  return res.json();
}

async function postTurn(
  sessionId: string,
  userText: string
): Promise<{ events: TurnSSEEvent[]; studentText: string }> {
  const res = await fetch(`${BASE}/api/session/${sessionId}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_text: userText, parallel_eval: true }),
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

async function endSession(sessionId: string): Promise<GapMap> {
  const res = await fetch(`${BASE}/api/session/${sessionId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`end: ${res.status} ${await res.text()}`);
  const { gap_map } = await res.json();
  return gap_map as GapMap;
}

type ScriptResult = {
  id: string;
  failures: number;
  softFlags: number;
  gapMap?: GapMap;
  projectorOk: boolean;
};

async function runScript(script: (typeof adversarial.scripts)[0]): Promise<ScriptResult> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`SCRIPT: ${script.name} (${script.id})`);
  console.log(`Goal: ${script.goal}`);
  console.log(`${"═".repeat(60)}`);

  const sessionId = await createSession(adversarial.topic);
  log("✓", `session ${sessionId}`);

  let failures = 0;
  let softFlags = 0;
  let prevDirective: Directive | undefined;
  const userTexts: string[] = [];

  for (let i = 0; i < script.turns.length; i++) {
    const userText = script.turns[i];
    userTexts.push(userText);
    console.log(`\n--- turn ${i + 1}/${script.turns.length} ---`);
    console.log(`user: ${userText.slice(0, 100)}${userText.length > 100 ? "…" : ""}`);

    if (i > 0 && TURN_PACE_MS > 0) await delay(TURN_PACE_MS);

    let events: TurnSSEEvent[];
    let studentText: string;
    try {
      ({ events, studentText } = await postTurn(sessionId, userText));
    } catch (err) {
      log("✗", `turn failed: ${err instanceof Error ? err.message : err}`);
      failures++;
      break;
    }

    const done = events.find((e) => e.event === "done");
    if (!done) {
      log("✗", "no done event");
      failures++;
      break;
    }

    const directive = done.data.directive;
    const verdict = done.data.verdict;
    const sentences = sentenceCount(studentText);

    log("→", `spoken directive: ${directive?.type ?? "?"}${directive?.node_id ? `(${directive.node_id})` : ""}`);
    log("→", `this-turn eval → recommended: ${verdict.recommended_directive?.type ?? "?"}${verdict.recommended_directive?.node_id ? `(${verdict.recommended_directive.node_id})` : ""}`);
    log("→", `student (${sentences} sent): ${studentText.slice(0, 140)}${studentText.length > 140 ? "…" : ""}`);

    if (prevDirective && directive) {
      const lagNote =
        directive.type === prevDirective.type &&
        directive.node_id === prevDirective.node_id
          ? "same as prior pending (expected in parallel)"
          : "consumed pending from prior eval";
      log("→", `parallel lag check: ${lagNote}`);
    }

    if (sentences > 2) {
      log("⚠️", `persona guardrail breach: ${sentences} sentences (max 2)`);
      softFlags++;
    }

    const parrot = looksLikeParrot(userText, studentText);
    if (parrot) {
      log("⚠️", `persona parroting tic: echoed "${parrot}"`);
      softFlags++;
    }

    if (verdict.verdicts.length === 0 && directive?.type === "PROBE") {
      log("✗", "policy: PROBE on empty/derail verdict — should ADVANCE");
      failures++;
    }

    const session = await getSession(sessionId);
    for (const [nodeId, count] of Object.entries(session.policy?.probeCounts ?? {})) {
      if (count > 2) {
        log("✗", `probe loop: probeCounts[${nodeId}]=${count}`);
        failures++;
      }
    }

    prevDirective = directive;
  }

  let gapMap: GapMap | undefined;
  let projectorOk = false;
  try {
    gapMap = await endSession(sessionId);
    const session = await getSession(sessionId);

    console.log("\n--- gap map ---");
    log("→", `one_liner: "${gapMap.one_liner}"`);
    log("→", `vaguest_moments: ${gapMap.vaguest_moments.length}`);
    for (const m of gapMap.vaguest_moments) {
      const ok = userTexts.some((t) => t.includes(m.quote));
      log(ok ? "✓" : "✗", `quote [${m.node_id}]: "${m.quote.slice(0, 80)}${m.quote.length > 80 ? "…" : ""}"`);
      if (!ok) failures++;
    }
    log("→", `dodged: ${gapMap.dodged_questions.join(", ") || "(none)"}`);
    log("→", `reteach_order: ${gapMap.reteach_order.join(" → ") || "(empty)"}`);

    const states = session.graph.nodes.map((n) => `${n.id}:${n.state}`).join(", ");
    log("→", `node states: ${states}`);

    projectorOk =
      oneLinerStings(gapMap.one_liner) &&
      gapMap.vaguest_moments.every((m) => userTexts.some((t) => t.includes(m.quote))) &&
      !!gapMap.one_liner.trim();

    if (!oneLinerStings(gapMap.one_liner)) {
      log("✗", "one_liner is flat / generic — not projector-ready");
      failures++;
      projectorOk = false;
    } else {
      log("✓", "one_liner passes projector bar");
    }

    log(projectorOk ? "✓" : "✗", `projector-ready: ${projectorOk}`);
  } catch (err) {
    log("✗", `end/gap map failed: ${err instanceof Error ? err.message : err}`);
    failures++;
  }

  return { id: script.id, failures, softFlags, gapMap, projectorOk };
}

async function main(): Promise<void> {
  console.log(`\n=== B4 adversarial sessions @ ${BASE} ===`);
  console.log(`PARALLEL_EVAL forced per-turn; TURN_PACE_MS=${TURN_PACE_MS}\n`);

  if (process.env.ECHO_MODE === "true") {
    console.error("Set ECHO_MODE=false");
    process.exit(1);
  }
  if (process.env.LLM_MOCK === "true") {
    log("⚠️", "LLM_MOCK=true — adversarial quality checks need real Gemini");
  }

  await freeSessionSlots();

  const scripts = adversarial.scripts.filter(
    (s) => !SCRIPT_FILTER || s.id === SCRIPT_FILTER
  );
  if (scripts.length === 0) {
    throw new Error(`no scripts match --script=${SCRIPT_FILTER}`);
  }

  const results: ScriptResult[] = [];
  for (const script of scripts) {
    results.push(await runScript(script));
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"═".repeat(60)}`);
  let totalFail = 0;
  for (const r of results) {
    totalFail += r.failures;
    log(
      r.projectorOk && r.failures === 0 ? "✓" : "✗",
      `${r.id}: failures=${r.failures} soft=${r.softFlags} projector=${r.projectorOk}` +
        (r.gapMap ? `\n     "${r.gapMap.one_liner}"` : "")
    );
  }

  const allProjector = results.every((r) => r.projectorOk);
  console.log(
    `\n=== ${totalFail === 0 && allProjector ? "PASS — all three gap maps projector-ready" : `FAIL (${totalFail} hard, projector ${allProjector ? "ok" : "not all ready"})`} ===\n`
  );
  process.exit(totalFail === 0 && allProjector ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
