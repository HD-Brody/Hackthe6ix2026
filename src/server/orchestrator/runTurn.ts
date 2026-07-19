/**
 * Turn orchestration — evaluate → applyVerdict → turnPolicy → persona stream.
 * Owner: A (Block A2). A3 parallel-eval restructure in this file.
 */

import personaReplies from "@/../fixtures/persona-replies.json";
import verdictVague from "@/../fixtures/verdict-vague.json";
import {
  appendUtterance,
  applyVerdict,
  getSession,
  pushTurnTiming,
  releaseTurnLock,
  setPendingDirective,
  updatePolicy,
} from "@/server/db/sessions";
import { evaluate, personaReply } from "@/server/orchestrator/llm";
import { transition } from "@/server/orchestrator/stateMachine";
import { nextAdvanceTarget, turnPolicy } from "@/server/orchestrator/turnPolicy";
import { formatSSE } from "@/lib/sse";
import { probeThresholdForCuriosity } from "@/lib/curiosity";
import { parseStudentId } from "@/lib/studentProfiles";
import type {
  ConceptGraph,
  Directive,
  PolicyState,
  SessionStatus,
  TurnSSEEvent,
  TurnTiming,
  Utterance,
  Verdict,
} from "@/lib/types";

export const FALLBACK_LINE =
  "sorry, zoned out for a second — say that again?";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  /** Disable proxy buffering (Vercel/nginx) so tokens flush incrementally. */
  "X-Accel-Buffering": "no",
} as const;

const ECHO_TOKEN_DELAY_MS = 40;

function emptyPolicy(): PolicyState {
  return { probeCounts: {}, deepened: {} };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}

function applyDirectiveToPolicy(
  policy: PolicyState,
  directive: Directive
): PolicyState {
  if (directive.type === "PROBE" && directive.node_id) {
    const id = directive.node_id;
    return {
      ...policy,
      probeCounts: {
        ...policy.probeCounts,
        [id]: (policy.probeCounts[id] ?? 0) + 1,
      },
    };
  }
  if (directive.type === "DEEPEN" && directive.node_id) {
    const id = directive.node_id;
    return {
      ...policy,
      deepened: { ...policy.deepened, [id]: true },
    };
  }
  return policy;
}

function policyChanged(before: PolicyState, after: PolicyState): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function isParallelMode(override?: boolean): boolean {
  if (override !== undefined) return override;
  return process.env.PARALLEL_EVAL === "true";
}

function turnMode(override?: boolean): TurnTiming["mode"] {
  return isParallelMode(override) ? "parallel" : "sequential";
}

function userTurnNumber(utterances: Utterance[]): number {
  return utterances.filter((u) => u.role === "user").length;
}

function syntheticFirstDirective(graph: ConceptGraph): Directive {
  const target = nextAdvanceTarget(graph);
  if (!target) return { type: "WRAP_UP" };
  return { type: "ADVANCE", node_id: target };
}

function safeAdvanceDirective(graph: ConceptGraph): Directive {
  const target = nextAdvanceTarget(graph);
  if (!target) return { type: "WRAP_UP" };
  return { type: "ADVANCE", node_id: target };
}

function emptyVerdict(fallbackDirective: Directive): Verdict {
  return {
    nodes_touched: [],
    verdicts: [],
    recommended_directive: fallbackDirective,
  };
}

function buildTurnTiming(params: {
  turn: number;
  t0: number;
  tEvalStart: number;
  tEvalEnd: number;
  tPolicyDone: number;
  tPersonaFirst?: number;
  tPersonaLast?: number;
  parallel: boolean;
}): TurnTiming {
  const {
    turn,
    t0,
    tEvalStart,
    tEvalEnd,
    tPolicyDone,
    tPersonaFirst,
    tPersonaLast,
    parallel,
  } = params;

  const perceived =
    tPersonaFirst !== undefined ? tPersonaFirst - t0 : undefined;

  return {
    turn,
    eval_ms: tEvalEnd - tEvalStart,
    policy_ms: tPolicyDone - tEvalEnd,
    persona_first_token_ms: parallel
      ? perceived
      : tPersonaFirst !== undefined
        ? tPersonaFirst - tPolicyDone
        : undefined,
    perceived_first_token_ms: perceived,
    total_ms: (tPersonaLast ?? Date.now()) - t0,
    mode: parallel ? "parallel" : "sequential",
  };
}

function logTurnTiming(timing: TurnTiming): void {
  const perceived = timing.perceived_first_token_ms ?? timing.persona_first_token_ms;
  console.log(
    `[turn ${timing.turn}] eval=${timing.eval_ms}ms policy=${timing.policy_ms}ms ` +
      `persona_first_token=${timing.persona_first_token_ms}ms perceived=${perceived}ms ` +
      `total=${timing.total_ms}ms mode=${timing.mode}`
  );
}

async function streamTextAsTokens(
  text: string,
  send: (event: TurnSSEEvent) => void,
  delayMs = 0
): Promise<void> {
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    send({
      event: "token",
      data: { text: i < words.length - 1 ? `${words[i]} ` : words[i] },
    });
    if (delayMs > 0 && i < words.length - 1) await delay(delayMs);
  }
}

function lastUserText(utterances: Utterance[]): string {
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (utterances[i].role === "user") return utterances[i].text;
  }
  throw new Error("no user utterance in transcript");
}

/** Apply policy counters and WRAP_UP transition when a directive is spoken. */
async function consumeDirective(
  sessionId: string,
  directive: Directive,
  policy: PolicyState,
  status: SessionStatus
): Promise<PolicyState> {
  const newPolicy = applyDirectiveToPolicy(policy, directive);
  if (policyChanged(policy, newPolicy)) {
    await updatePolicy(sessionId, newPolicy);
  }
  if (directive.type === "WRAP_UP" && status === "teaching") {
    await transition(sessionId, "teaching", "wrapping");
  }
  return newPolicy;
}

async function streamPersonaTokens(
  transcript: Utterance[],
  directive: Directive,
  student: ReturnType<typeof parseStudentId>,
  send: (event: TurnSSEEvent) => void
): Promise<{ text: string; tFirst?: number; tLast?: number }> {
  let text = "";
  let tFirst: number | undefined;
  let tLast: number | undefined;

  await retryOnce(async () => {
    for await (const token of personaReply(transcript, directive, student)) {
      if (tFirst === undefined) tFirst = Date.now();
      text += token;
      send({ event: "token", data: { text: token } });
    }
    tLast = Date.now();
  });

  return { text, tFirst, tLast };
}

function createSseStream(
  sessionId: string,
  run: (send: (event: TurnSSEEvent) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (event: TurnSSEEvent) => {
        controller.enqueue(encoder.encode(formatSSE(event)));
      };
      try {
        await run(send);
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        await streamTextAsTokens(FALLBACK_LINE, send);
        send({
          event: "error",
          data: { message, fallback_line: FALLBACK_LINE },
        });
        controller.close();
      } finally {
        await releaseTurnLock(sessionId);
      }
    },
    async cancel() {
      await releaseTurnLock(sessionId);
    },
  });
}

/** Echo mode — canned persona lines, fixture verdict. Demo kill switch. */
export function createEchoTurnStream(sessionId: string): ReadableStream<Uint8Array> {
  return createSseStream(sessionId, async (send) => {
    const session = await getSession(sessionId);
    if (!session) throw new Error("session not found");

    const utteranceCount = session.utterances.length;
    const studentLine =
      personaReplies.replies[utteranceCount % personaReplies.replies.length];
    const verdict = verdictVague as Verdict;

    await streamTextAsTokens(studentLine, send, ECHO_TOKEN_DELAY_MS);

    await appendUtterance(sessionId, {
      role: "student",
      text: studentLine,
      ts: Date.now(),
      eval: verdict,
    });

    const updated = await getSession(sessionId);
    send({
      event: "done",
      data: {
        verdict,
        session_status: updated?.status ?? "teaching",
        directive: verdict.recommended_directive,
      },
    });
  });
}

/** Sequential — evaluate → policy → persona (A2). */
export function createSequentialTurnStream(
  sessionId: string
): ReadableStream<Uint8Array> {
  return createSseStream(sessionId, async (send) => {
    const t0 = Date.now();
    const session = await getSession(sessionId);
    if (!session) throw new Error("session not found");

    const transcript = session.utterances;
    const userText = lastUserText(transcript);
    const turn = userTurnNumber(transcript);
    const student = parseStudentId(session.student);

    let verdict: Verdict;
    const tEvalStart = Date.now();
    try {
      verdict = await retryOnce(() =>
        evaluate(session.graph, transcript, userText)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "evaluate failed";
      await streamTextAsTokens(FALLBACK_LINE, send);
      send({
        event: "error",
        data: { message, fallback_line: FALLBACK_LINE },
      });
      return;
    }
    const tEvalEnd = Date.now();

    let policy = session.policy ?? emptyPolicy();
    const afterVerdict = await applyVerdict(sessionId, verdict, policy);
    const directive = turnPolicy(afterVerdict.graph, verdict, policy, {
      probeThreshold: probeThresholdForCuriosity(session.curiosity),
    });

    policy = await consumeDirective(
      sessionId,
      directive,
      policy,
      session.status
    );
    const tPolicyDone = Date.now();

    let studentLine = "";
    let tPersonaFirst: number | undefined;
    let tPersonaLast: number | undefined;
    try {
      const streamed = await streamPersonaTokens(transcript, directive, student, send);
      studentLine = streamed.text;
      tPersonaFirst = streamed.tFirst;
      tPersonaLast = streamed.tLast;
    } catch (err) {
      const message = err instanceof Error ? err.message : "persona failed";
      studentLine = FALLBACK_LINE;
      tPersonaFirst = Date.now();
      await streamTextAsTokens(FALLBACK_LINE, send);
      tPersonaLast = Date.now();
      send({
        event: "error",
        data: { message, fallback_line: FALLBACK_LINE },
      });
    }

    const timing = buildTurnTiming({
      turn,
      t0,
      tEvalStart,
      tEvalEnd,
      tPolicyDone,
      tPersonaFirst,
      tPersonaLast,
      parallel: false,
    });
    logTurnTiming(timing);
    await pushTurnTiming(sessionId, timing);

    await appendUtterance(sessionId, {
      role: "student",
      text: studentLine,
      ts: Date.now(),
      eval: verdict,
    });

    const updated = await getSession(sessionId);
    send({
      event: "done",
      data: {
        verdict,
        session_status: updated?.status ?? "teaching",
        directive,
        timing,
      },
    });
  });
}

/**
 * Parallel — persona (pending directive) and evaluate run concurrently.
 * Eval verdict drives the *next* turn's pending directive (one-turn lag).
 */
export function createParallelTurnStream(
  sessionId: string
): ReadableStream<Uint8Array> {
  return createSseStream(sessionId, async (send) => {
    const t0 = Date.now();
    const session = await getSession(sessionId);
    if (!session) throw new Error("session not found");

    const transcript = session.utterances;
    const userText = lastUserText(transcript);
    const turn = userTurnNumber(transcript);
    const student = parseStudentId(session.student);
    const spokenDirective =
      session.pending_directive ?? syntheticFirstDirective(session.graph);

    let policy = session.policy ?? emptyPolicy();
    policy = await consumeDirective(
      sessionId,
      spokenDirective,
      policy,
      session.status
    );

    const tEvalStart = Date.now();
    let tEvalEnd = tEvalStart;
    let tPolicyDone = tEvalStart;
    let verdict: Verdict = emptyVerdict(safeAdvanceDirective(session.graph));

    const evalWork = (async () => {
      try {
        verdict = await retryOnce(() =>
          evaluate(session.graph, transcript, userText)
        );
        tEvalEnd = Date.now();

        const afterVerdict = await applyVerdict(sessionId, verdict, policy);
        const nextPending = turnPolicy(afterVerdict.graph, verdict, policy, {
          probeThreshold: probeThresholdForCuriosity(session.curiosity),
        });
        await setPendingDirective(sessionId, nextPending);
        tPolicyDone = Date.now();
      } catch (err) {
        const message = err instanceof Error ? err.message : "evaluate failed";
        console.error(`[turn ${turn}] parallel eval failed: ${message}`);
        const safe = safeAdvanceDirective(session.graph);
        verdict = emptyVerdict(safe);
        await setPendingDirective(sessionId, safe);
        tEvalEnd = Date.now();
        tPolicyDone = Date.now();
      }
    })();

    let studentLine = "";
    let tPersonaFirst: number | undefined;
    let tPersonaLast: number | undefined;

    const personaWork = (async () => {
      try {
        const streamed = await streamPersonaTokens(
          transcript,
          spokenDirective,
          student,
          send
        );
        studentLine = streamed.text;
        tPersonaFirst = streamed.tFirst;
        tPersonaLast = streamed.tLast;
      } catch (err) {
        const message = err instanceof Error ? err.message : "persona failed";
        studentLine = FALLBACK_LINE;
        tPersonaFirst = Date.now();
        await streamTextAsTokens(FALLBACK_LINE, send);
        tPersonaLast = Date.now();
        send({
          event: "error",
          data: { message, fallback_line: FALLBACK_LINE },
        });
      }
    })();

    await Promise.allSettled([evalWork, personaWork]);

    const timing = buildTurnTiming({
      turn,
      t0,
      tEvalStart,
      tEvalEnd,
      tPolicyDone,
      tPersonaFirst,
      tPersonaLast,
      parallel: true,
    });
    logTurnTiming(timing);
    await pushTurnTiming(sessionId, timing);

    await appendUtterance(sessionId, {
      role: "student",
      text: studentLine,
      ts: Date.now(),
      eval: verdict,
    });

    const updated = await getSession(sessionId);
    send({
      event: "done",
      data: {
        verdict,
        session_status: updated?.status ?? "teaching",
        directive: spokenDirective,
        timing,
      },
    });
  });
}

export function createTurnStream(
  sessionId: string,
  opts?: { parallel?: boolean }
): ReadableStream<Uint8Array> {
  if (process.env.ECHO_MODE === "true") {
    return createEchoTurnStream(sessionId);
  }
  if (isParallelMode(opts?.parallel)) {
    return createParallelTurnStream(sessionId);
  }
  return createSequentialTurnStream(sessionId);
}

/** @deprecated Use createSequentialTurnStream — kept for imports during A3 transition. */
export const createRealTurnStream = createSequentialTurnStream;
