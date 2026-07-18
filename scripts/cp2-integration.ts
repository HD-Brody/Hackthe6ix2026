/**
 * Real-loop drill — CP2 seam verification + sequential/parallel latency A/B.
 *
 * Phase 1 (seam): one sequential session, verbose checks per turn —
 *   verdict shape, verbatim quotes, node-state evolution, policy sanity,
 *   persona guardrails (≤2 sentences, non-empty, no fallback), gap map.
 * Phase 2 (A/B): sequential vs parallel session on the same utterances,
 *   perceived-first-token comparison + paste-ready latency README block.
 *
 * Run (dev server must be up; both server and this script read .env.local —
 * restart the dev server after changing it):
 *   npm run cp2:integration            # both phases
 *   npm run drill:real                 # phase 1 only (seam)
 *   npm run drill:ab                   # phase 2 only (latency A/B)
 *
 * Required server env for the REAL run (.env.local):
 *   ECHO_MODE=false  LLM_MOCK=false  GEMINI_API_KEY=<real>  GEMINI_MODEL_FAST/STRONG set
 * Mock run (A-side plumbing only): LLM_MOCK=true ECHO_MODE=false.
 *
 * Tunables:
 *   DRILL_TURNS      turns per session (default 6 real / all utterances mock)
 *   TURN_PACE_MS     delay between turns (default 15000 real / 0 mock —
 *                    free-tier Gemini 429s at ~5 req/min and each turn is
 *                    2 calls; set 0 if on a paid key or Vertex)
 *   CP2_MIN_TURNS    legacy floor, still honored in mock mode
 */

import testUtterances from "../src/llm/harness/test-utterances.json";
import verdictVagueFixture from "../fixtures/verdict-vague.json";
import verdictSolidFixture from "../fixtures/verdict-solid.json";
import { consumeTurnStream } from "../src/lib/sse";
import type {
  GapMap,
  Session,
  Verdict,
  TurnSSEEvent,
  Directive,
  PolicyState,
  TurnTiming,
} from "../src/lib/types";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const LLM_MOCK = process.env.LLM_MOCK === "true";
const SEAM_ONLY = process.argv.includes("--seam-only");
const AB_ONLY = process.argv.includes("--ab-only");

const DRILL_TURNS = Number(
  process.env.DRILL_TURNS ?? (LLM_MOCK ? "0" : "6") // 0 = all utterances
);
const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? (LLM_MOCK ? "0" : "15000"));
const MIN_TURNS = Number(process.env.CP2_MIN_TURNS ?? "5");

/** Quotes the mock evaluator emits — seeing these in a "real" run means the
 * server is actually in LLM_MOCK=true. */
const FIXTURE_QUOTES = new Set(
  [...verdictVagueFixture.verdicts, ...verdictSolidFixture.verdicts]
    .map((v) => (v as { quote?: string }).quote)
    .filter((q): q is string => !!q)
);

const FALLBACK_LINE = "sorry, zoned out for a second — say that again?";

type CheckResult = { ok: boolean; detail: string; soft?: boolean };

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── per-turn checks ──────────────────────────────────────────────

function quotesVerbatim(
  userText: string,
  verdict: Verdict,
  allUserTexts: string[]
): CheckResult {
  for (const nv of verdict.verdicts) {
    const quote = nv.quote;
    if (!quote) continue;
    const inCurrent = userText.includes(quote);
    const inHistory = allUserTexts.some((t) => t.includes(quote));
    if (!inCurrent && !inHistory) {
      const hint = FIXTURE_QUOTES.has(quote)
        ? " (this is a FIXTURE quote — server is likely running LLM_MOCK=true)"
        : "";
      return { ok: false, detail: `quote not verbatim: "${quote}"${hint}` };
    }
  }
  return { ok: true, detail: "quotes verbatim (string-includes)" };
}

function verdictSane(verdict: Verdict): CheckResult {
  if (!verdict.recommended_directive?.type) {
    return { ok: false, detail: "missing recommended_directive" };
  }
  if (!Array.isArray(verdict.verdicts)) {
    return { ok: false, detail: "verdicts not an array" };
  }
  return { ok: true, detail: `directive=${verdict.recommended_directive.type}` };
}

function policySane(
  policyBefore: PolicyState,
  directive: Directive | undefined,
  turn: number
): CheckResult {
  for (const [nodeId, count] of Object.entries(policyBefore.probeCounts)) {
    if (count > 2) {
      return { ok: false, detail: `probeCounts[${nodeId}]=${count} exceeds 2 at turn ${turn}` };
    }
  }
  if (!directive) {
    return { ok: false, detail: "missing policy directive in done event" };
  }
  if (directive.type === "PROBE" && directive.node_id) {
    const count = policyBefore.probeCounts[directive.node_id] ?? 0;
    if (count >= 2) {
      return { ok: false, detail: `PROBE ${directive.node_id} but probeCount already ${count}` };
    }
  }
  return { ok: true, detail: "policy ok" };
}

function nodesChanged(before: Session, after: Session): CheckResult {
  const states = (s: Session) => s.graph.nodes.map((n) => `${n.id}:${n.state}`).join(",");
  if (states(before) === states(after)) {
    if (before.utterances.length < 2) {
      return { ok: true, detail: "first turn (states may be unchanged)" };
    }
    // Off-topic derails legitimately touch nothing — soft, not hard.
    return { ok: true, soft: true, detail: "node states unchanged (ok if derail turn)" };
  }
  return { ok: true, detail: "node states evolved" };
}

/** Persona guardrail #1 (max 2 sentences) + basic liveness. Soft checks:
 * conversation quality is B's turf, but the drill should surface breaks. */
function personaSane(studentText: string): CheckResult[] {
  const results: CheckResult[] = [];
  if (!studentText.trim()) {
    results.push({ ok: false, detail: "persona reply is empty" });
    return results;
  }
  if (studentText.trim() === FALLBACK_LINE) {
    results.push({
      ok: true,
      soft: true,
      detail: "persona fell back to canned line (LLM call failed twice — check server logs)",
    });
    return results;
  }
  const sentences = studentText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  results.push(
    sentences.length <= 3
      ? { ok: true, detail: `persona length ok (${sentences.length} sentence(s))` }
      : {
          ok: true,
          soft: true,
          detail: `persona monologuing: ${sentences.length} sentences (guardrail says ≤2) — flag to B`,
        }
  );
  return results;
}

// ── gap map checks (seam phase only) ─────────────────────────────

function checkGapMap(gm: GapMap, session: Session, allUserTexts: string[]): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push(
    gm.one_liner?.trim()
      ? { ok: true, detail: `one_liner: "${gm.one_liner}"` }
      : { ok: false, detail: "gap map one_liner missing/empty" }
  );
  checks.push(
    gm.nodes?.length === session.graph.nodes.length
      ? { ok: true, detail: `gap map covers all ${gm.nodes.length} nodes` }
      : {
          ok: false,
          detail: `gap map has ${gm.nodes?.length ?? 0} nodes, graph has ${session.graph.nodes.length}`,
        }
  );
  for (const m of gm.vaguest_moments ?? []) {
    if (!allUserTexts.some((t) => t.includes(m.quote))) {
      checks.push({
        ok: false,
        detail: `gap map quote not verbatim: "${m.quote}" — this is the credibility bar, flag to B`,
      });
    }
  }
  if ((gm.vaguest_moments ?? []).every((m) => allUserTexts.some((t) => t.includes(m.quote)))) {
    checks.push({ ok: true, detail: `${gm.vaguest_moments?.length ?? 0} vaguest-moment quote(s) verbatim` });
  }
  return checks;
}

// ── HTTP helpers ─────────────────────────────────────────────────

async function createSession(topic: string): Promise<{ session_id: string; graph: Session["graph"] }> {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error(`create session failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/session/${id}`);
  if (!res.ok) throw new Error(`get session failed: ${res.status}`);
  return res.json();
}

async function postTurn(
  sessionId: string,
  userText: string,
  parallelEval: boolean
): Promise<{ events: TurnSSEEvent[]; studentText: string }> {
  const res = await fetch(`${BASE}/api/session/${sessionId}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_text: userText, parallel_eval: parallelEval }),
  });
  if (res.status === 409) throw new Error("turn already in progress (409)");
  if (!res.ok) throw new Error(`turn failed: ${res.status} ${await res.text()}`);

  const events: TurnSSEEvent[] = [];
  let studentText = "";
  for await (const event of consumeTurnStream(res)) {
    events.push(event);
    if (event.event === "token") studentText += event.data.text;
  }
  return { events, studentText };
}

async function endSession(sessionId: string): Promise<{ gap_map: GapMap }> {
  const res = await fetch(`${BASE}/api/session/${sessionId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`end failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── utterance selection ──────────────────────────────────────────

interface TestUtterance {
  kind: string;
  text: string;
}

/** Round-robin across kinds so a short real run still covers clean/vague/
 * wrong/ramble/derail instead of three clean-corrects in a row. */
function pickDiverse(all: TestUtterance[], n: number): TestUtterance[] {
  if (n <= 0 || n >= all.length) return all;
  const byKind = new Map<string, TestUtterance[]>();
  for (const u of all) {
    if (!byKind.has(u.kind)) byKind.set(u.kind, []);
    byKind.get(u.kind)!.push(u);
  }
  const kinds = [...byKind.keys()];
  const picked: TestUtterance[] = [];
  let round = 0;
  while (picked.length < n) {
    for (const kind of kinds) {
      const bucket = byKind.get(kind)!;
      if (round < bucket.length) picked.push(bucket[round]);
      if (picked.length === n) break;
    }
    round++;
    if (round > all.length) break;
  }
  return picked;
}

// ── timing report ────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function printComparison(sequential: TurnTiming[], parallel: TurnTiming[]): void {
  const turns = Math.min(sequential.length, parallel.length);
  const seqP: number[] = [];
  const parP: number[] = [];

  console.log("\n=== Perceived first token: sequential vs parallel ===");
  console.log("Turn | Sequential | Parallel | Δ (seq−par)");
  console.log("-----|------------|----------|-------------");
  for (let i = 0; i < turns; i++) {
    const s = sequential[i].perceived_first_token_ms ?? 0;
    const p = parallel[i].perceived_first_token_ms ?? 0;
    seqP.push(s);
    parP.push(p);
    console.log(
      `  ${String(i + 1).padStart(2)} | ${String(s).padStart(8)}ms | ${String(p).padStart(6)}ms | ${s - p >= 0 ? "+" : ""}${s - p}ms`
    );
  }
  console.log("-----|------------|----------|-------------");
  console.log(
    ` avg | ${String(avg(seqP)).padStart(8)}ms | ${String(avg(parP)).padStart(6)}ms | +${avg(seqP) - avg(parP)}ms`
  );
  console.log(
    ` med | ${String(median(seqP)).padStart(8)}ms | ${String(median(parP)).padStart(6)}ms | +${median(seqP) - median(parP)}ms`
  );

  const evalMs = [...sequential, ...parallel]
    .map((t) => t.eval_ms)
    .filter((n): n is number => n !== undefined);
  const seqFirstTok = sequential
    .map((t) => t.persona_first_token_ms)
    .filter((n): n is number => n !== undefined);

  const savings = median(seqP) - median(parP);
  const recommend = savings > 300 ? "PARALLEL_EVAL=true" : "sequential (parallel gain too small for the one-turn policy lag)";

  console.log(`
--- paste into src/voice/latency/README.md ---
| Gemini fast tier | evaluate() via live API, median of ${evalMs.length} | ${median(evalMs)}ms (avg ${avg(evalMs)}ms) | measured by cp2-integration |
| Persona first token | after policy, sequential, median of ${seqFirstTok.length} | ${median(seqFirstTok)}ms | measured by cp2-integration |
| Perceived first token | sequential ${median(seqP)}ms → parallel ${median(parP)}ms | saves ${savings}ms/turn | ${LLM_MOCK ? "MOCK NUMBERS — rerun with LLM_MOCK=false" : "real Gemini"} |

Recommendation: ${recommend}
${LLM_MOCK ? "(mock latencies — do NOT make the CP3 decision from this run)" : ""}`);
}

// ── session runner ───────────────────────────────────────────────

interface SessionRun {
  failures: number;
  softFlags: number;
  timings: TurnTiming[];
  wrapUpSeen: boolean;
  userTexts: string[];
  sessionId: string;
}

async function runSession(
  parallel: boolean,
  utterances: TestUtterance[],
  opts: { verbose: boolean }
): Promise<SessionRun> {
  const mode = parallel ? "parallel" : "sequential";
  console.log(`\n=== ${mode.toUpperCase()} session (${utterances.length} turns, pace ${TURN_PACE_MS}ms) ===`);

  const { session_id, graph } = await createSession("TCP congestion control");
  log("✓", `session ${session_id} (${graph.nodes.length} nodes)`);

  const userTexts: string[] = [];
  let failures = 0;
  let softFlags = 0;
  let session = await getSession(session_id);
  let wrapUpSeen = false;

  for (let i = 0; i < utterances.length; i++) {
    if (i > 0 && TURN_PACE_MS > 0) await delay(TURN_PACE_MS);

    const u = utterances[i];
    const before = session;
    userTexts.push(u.text);

    if (opts.verbose) {
      console.log(`\n--- turn ${i + 1} [${u.kind}] (${mode}) ---`);
      console.log(`user: ${u.text.slice(0, 80)}${u.text.length > 80 ? "…" : ""}`);
    }

    let events: TurnSSEEvent[];
    let studentText: string;
    try {
      ({ events, studentText } = await postTurn(session_id, u.text, parallel));
    } catch (err) {
      log("✗", `${mode} turn ${i + 1} failed: ${err instanceof Error ? err.message : err}`);
      failures++;
      break;
    }

    const done = events.find((e) => e.event === "done");
    const errEv = events.find((e) => e.event === "error");
    if (errEv) {
      log("⚠️", `stream error event: ${errEv.data.message} (fallback line spoken)`);
      softFlags++;
    }
    if (!done) {
      if (!errEv) {
        log("✗", `${mode}: stream ended with no done event`);
        failures++;
      }
      session = await getSession(session_id);
      continue;
    }

    // Echo-mode tripwire: real/mock turns always carry timing; echo never does.
    if (!done.data.timing) {
      throw new Error(
        "done event has no timing — the SERVER is running ECHO_MODE=true. " +
          "Set ECHO_MODE=false in .env.local and RESTART the dev server."
      );
    }

    const verdict = done.data.verdict;
    session = await getSession(session_id);

    if (opts.verbose) {
      const policyBefore = before.policy ?? { probeCounts: {}, deepened: {} };
      const checks: CheckResult[] = [
        verdictSane(verdict),
        // Mock verdicts are fixtures — their quotes can't match live user text.
        LLM_MOCK
          ? { ok: true, soft: true, detail: "quote check skipped (LLM_MOCK fixture verdicts)" }
          : quotesVerbatim(u.text, verdict, userTexts),
        nodesChanged(before, session),
        policySane(policyBefore, done.data.directive, i + 1),
        ...personaSane(studentText),
      ];
      for (const c of checks) {
        log(c.ok ? (c.soft ? "⚠️" : "✓") : "✗", c.detail);
        if (!c.ok) failures++;
        if (c.soft) softFlags++;
      }
      const d = done.data.directive;
      log("→", `directive: ${d?.type ?? "?"}${d?.node_id ? `(${d.node_id})` : ""}`);
      log("→", `student: ${studentText.slice(0, 100)}${studentText.length > 100 ? "…" : ""}`);
      log(
        "→",
        `timing: eval=${done.data.timing.eval_ms}ms perceived=${done.data.timing.perceived_first_token_ms}ms total=${done.data.timing.total_ms}ms`
      );
    }

    if (done.data.session_status === "wrapping") wrapUpSeen = true;
    if (done.data.directive?.type === "WRAP_UP") wrapUpSeen = true;
  }

  session = await getSession(session_id);
  const timings = session.timings ?? [];
  if (timings.length === 0) {
    log("✗", `${mode}: no turn timings persisted`);
    failures++;
  }

  return { failures, softFlags, timings, wrapUpSeen, userTexts, sessionId: session_id };
}

/** End the seam session and validate the gap map. The B3 stub is a known
 * gap, not a drill failure. */
async function runGapMapPhase(run: SessionRun): Promise<number> {
  console.log("\n=== Gap map (POST /end) ===");
  let failures = 0;
  try {
    const { gap_map } = await endSession(run.sessionId);
    if (LLM_MOCK) {
      log("⚠️", `mock gap map returned (one_liner: "${gap_map.one_liner}") — shape/verbatim checks skipped (fixture)`);
      log("✓", "end endpoint works (transition → ended, gap_map persisted)");
      return 0;
    }
    const session = await getSession(run.sessionId);
    for (const c of checkGapMap(gap_map, session, run.userTexts)) {
      log(c.ok ? "✓" : "✗", c.detail);
      if (!c.ok) failures++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not implemented")) {
      log("⚠️", "generateGapMap is still B's B3 stub — gap map checks skipped (known gap, not a failure)");
    } else {
      log("✗", `end/gap map failed: ${msg}`);
      failures++;
    }
  }
  return failures;
}

// ── main ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n=== Real-loop drill @ ${BASE} ===`);
  console.log(
    `script env: LLM_MOCK=${LLM_MOCK} | turns=${DRILL_TURNS || "all"} | pace=${TURN_PACE_MS}ms | phases=${
      SEAM_ONLY ? "seam" : AB_ONLY ? "ab" : "seam+ab"
    }`
  );
  if (!LLM_MOCK) {
    log("⚠️", "REAL mode: each turn = 2 Gemini calls. Pacing protects free-tier quota (~5 req/min).");
  }

  const all = (testUtterances.utterances as TestUtterance[]).filter(
    (u) => !u.text.startsWith("TODO")
  );
  const count = DRILL_TURNS > 0 ? DRILL_TURNS : Math.max(MIN_TURNS, all.length);
  const picked = pickDiverse(all, count);

  let failures = 0;
  let softFlags = 0;
  let seq: SessionRun | undefined;
  let par: SessionRun | undefined;

  if (!AB_ONLY) {
    seq = await runSession(false, picked, { verbose: true });
    failures += seq.failures;
    softFlags += seq.softFlags;
    failures += await runGapMapPhase(seq);
  }

  if (!SEAM_ONLY) {
    if (!AB_ONLY) {
      // Same utterances through the parallel path; quiet, timing-focused.
      par = await runSession(true, picked, { verbose: false });
    } else {
      seq = await runSession(false, picked, { verbose: false });
      par = await runSession(true, picked, { verbose: false });
      failures += seq.failures + par.failures;
    }
    if (!AB_ONLY && par) {
      failures += par.failures;
      softFlags += par.softFlags;
    }
    if (seq && par) printComparison(seq.timings, par.timings);
  }

  if (seq && !seq.wrapUpSeen && (!par || !par.wrapUpSeen)) {
    log("⚠️", "WRAP_UP never fired — fine for a short drill; the graph has more nodes than turns");
  }

  console.log(
    `\n=== ${failures === 0 ? "PASS" : `FAIL (${failures} hard failure(s))`}${
      softFlags ? ` — ${softFlags} soft flag(s) ⚠️ above worth reading` : ""
    } ===\n`
  );
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
