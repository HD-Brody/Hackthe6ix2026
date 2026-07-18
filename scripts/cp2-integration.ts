/**
 * CP2 integration harness — A↔B pairing script.
 *
 * Run (server must be up with ECHO_MODE=false):
 *   npm run cp2:integration
 *
 * Real Gemini (B's modules):
 *   LLM_MOCK=false ECHO_MODE=false npm run cp2:integration
 *
 * Mock seam (A-side loop only, until B ships evaluate/persona):
 *   LLM_MOCK=true ECHO_MODE=false npm run cp2:integration
 */

import testUtterances from "../src/llm/harness/test-utterances.json";
import { consumeTurnStream } from "../src/lib/sse";
import type { Session, Verdict, TurnSSEEvent, Directive, PolicyState } from "../src/lib/types";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const MIN_TURNS = Number(process.env.CP2_MIN_TURNS ?? "5");

type CheckResult = { ok: boolean; detail: string };

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

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
      return {
        ok: false,
        detail: `quote not verbatim in user text: "${quote}"`,
      };
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
      return {
        ok: false,
        detail: `probeCounts[${nodeId}]=${count} exceeds 2 at turn ${turn}`,
      };
    }
  }
  if (!directive) {
    return { ok: false, detail: "missing policy directive in done event" };
  }
  if (directive.type === "PROBE" && directive.node_id) {
    const count = policyBefore.probeCounts[directive.node_id] ?? 0;
    if (count >= 2) {
      return {
        ok: false,
        detail: `PROBE ${directive.node_id} but probeCount already ${count}`,
      };
    }
  }
  return { ok: true, detail: "policy ok" };
}

function nodesChanged(before: Session, after: Session): CheckResult {
  const beforeStates = before.graph.nodes.map((n) => `${n.id}:${n.state}`).join(",");
  const afterStates = after.graph.nodes.map((n) => `${n.id}:${n.state}`).join(",");
  if (beforeStates === afterStates && before.utterances.length < 2) {
    return { ok: true, detail: "first turn (states may be unchanged)" };
  }
  if (beforeStates === afterStates) {
    return { ok: false, detail: "graph node states unchanged after turn" };
  }
  return { ok: true, detail: "node states evolved" };
}

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
  userText: string
): Promise<{ events: TurnSSEEvent[]; studentText: string }> {
  const res = await fetch(`${BASE}/api/session/${sessionId}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_text: userText }),
  });
  if (res.status === 409) {
    throw new Error("turn already in progress (409)");
  }
  if (!res.ok) throw new Error(`turn failed: ${res.status} ${await res.text()}`);

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
  if (!res.ok) throw new Error(`end failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main(): Promise<void> {
  const llmMock = process.env.LLM_MOCK === "true";
  const echoMode = process.env.ECHO_MODE === "true";

  console.log(`\n=== CP2 integration @ ${BASE} ===`);
  console.log(`LLM_MOCK=${llmMock} ECHO_MODE=${echoMode}\n`);

  if (echoMode) {
    console.error("Set ECHO_MODE=false for CP2 real-loop test.");
    process.exit(1);
  }
  if (!llmMock) {
    log("⚠️", "LLM_MOCK=false — requires B's evaluate() + personaReply() to be implemented.");
  }

  const utterances = testUtterances.utterances.filter(
    (u) => !u.text.startsWith("TODO")
  );
  if (utterances.length < MIN_TURNS) {
    throw new Error(`need at least ${MIN_TURNS} test utterances`);
  }

  const { session_id, graph } = await createSession("TCP congestion control");
  log("✓", `session ${session_id} (${graph.nodes.length} nodes)`);

  const userTexts: string[] = [];
  let failures = 0;
  let session = await getSession(session_id);
  let wrapUpSeen = false;

  for (let i = 0; i < Math.max(MIN_TURNS, utterances.length); i++) {
    const u = utterances[i % utterances.length];
    const before = session;
    userTexts.push(u.text);

    console.log(`\n--- turn ${i + 1} [${u.kind}] ---`);
    console.log(`user: ${u.text.slice(0, 80)}${u.text.length > 80 ? "…" : ""}`);

    let events: TurnSSEEvent[];
    let studentText: string;
    try {
      ({ events, studentText } = await postTurn(session_id, u.text));
    } catch (err) {
      log("✗", `turn failed: ${err instanceof Error ? err.message : err}`);
      failures++;
      break;
    }

    const done = events.find((e) => e.event === "done");
    const errEv = events.find((e) => e.event === "error");
    if (errEv && !done) {
      log("✗", `stream error: ${errEv.data.message}`);
      failures++;
      break;
    }
    if (!done) {
      log("✗", "no done event");
      failures++;
      break;
    }

    const verdict = done.data.verdict;
    session = await getSession(session_id);

    const policyBefore = before.policy ?? { probeCounts: {}, deepened: {} };
    const directive = done.data.directive;
    const checks: CheckResult[] = [
      verdictSane(verdict),
      nodesChanged(before, session),
      policySane(policyBefore, directive, i + 1),
    ];
    if (!llmMock) {
      checks.splice(1, 0, quotesVerbatim(u.text, verdict, userTexts));
    } else {
      log("⚠️", "quote check skipped (LLM_MOCK uses fixture verdicts with canned quotes)");
    }

    for (const c of checks) {
      log(c.ok ? "✓" : "✗", c.detail);
      if (!c.ok) failures++;
    }

    log("→", `policy directive: ${directive?.type ?? "?"}${directive?.node_id ? `(${directive.node_id})` : ""}`);
    log("→", `student: ${studentText.slice(0, 100)}${studentText.length > 100 ? "…" : ""}`);
    log("→", `status: ${done.data.session_status}`);

    if (done.data.session_status === "wrapping") wrapUpSeen = true;
    if (directive?.type === "WRAP_UP") wrapUpSeen = true;
  }

  console.log("\n--- end session ---");
  try {
    const { gap_map } = await endSession(session_id);
    log("✓", `gap_map one_liner: "${gap_map.one_liner}"`);
  } catch (err) {
    log("✗", `end failed: ${err instanceof Error ? err.message : err}`);
    failures++;
  }

  session = await getSession(session_id);
  log("✓", `replay check: ${session.utterances.length} utterances, status=${session.status}, gap_map=${!!session.gap_map}`);

  const timings = session.timings ?? [];
  if (timings.length === 0) {
    log("✗", "no turn timings persisted on session");
    failures++;
  } else {
    log("✓", `${timings.length} turn timing(s) persisted`);
    for (const t of timings) {
      log(
        "→",
        `turn ${t.turn}: eval=${t.eval_ms}ms policy=${t.policy_ms}ms ` +
          `persona_first_token=${t.persona_first_token_ms}ms total=${t.total_ms}ms mode=${t.mode}`
      );
    }
  }

  if (!wrapUpSeen) {
    log("⚠️", "WRAP_UP / wrapping not seen — may need more turns for full graph coverage");
  }

  console.log(`\n=== ${failures === 0 ? "PASS" : `FAIL (${failures} checks)`} ===\n`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
