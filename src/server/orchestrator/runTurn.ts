/**
 * Turn orchestration — evaluate → applyVerdict → turnPolicy → persona stream.
 * Owner: A (Block A2). A3's parallel-eval restructure touches this file only.
 */

import personaReplies from "@/../fixtures/persona-replies.json";
import verdictVague from "@/../fixtures/verdict-vague.json";
import {
  appendUtterance,
  applyVerdict,
  getSession,
  releaseTurnLock,
  updatePolicy,
} from "@/server/db/sessions";
import { evaluate, personaReply } from "@/server/orchestrator/llm";
import { transition } from "@/server/orchestrator/stateMachine";
import { turnPolicy } from "@/server/orchestrator/turnPolicy";
import { formatSSE } from "@/lib/sse";
import type {
  Directive,
  PolicyState,
  TurnSSEEvent,
  Utterance,
  Verdict,
} from "@/lib/types";

export const FALLBACK_LINE =
  "sorry, zoned out for a second — say that again?";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
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
      },
    });
  });
}

/** Real loop — evaluate → policy → persona. Sequential v1 (A3 adds parallel eval). */
export function createRealTurnStream(sessionId: string): ReadableStream<Uint8Array> {
  return createSseStream(sessionId, async (send) => {
    const session = await getSession(sessionId);
    if (!session) throw new Error("session not found");

    const transcript = session.utterances;
    const userText = lastUserText(transcript);

    let verdict: Verdict;
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

    let policy = session.policy ?? emptyPolicy();
    const afterVerdict = await applyVerdict(sessionId, verdict, policy);
    const directive = turnPolicy(afterVerdict.graph, verdict, policy);

    const newPolicy = applyDirectiveToPolicy(policy, directive);
    if (policyChanged(policy, newPolicy)) {
      await updatePolicy(sessionId, newPolicy);
      policy = newPolicy;
    }

    if (directive.type === "WRAP_UP" && session.status === "teaching") {
      await transition(sessionId, "teaching", "wrapping");
    }

    let studentLine = "";
    try {
      studentLine = await retryOnce(async () => {
        let text = "";
        for await (const token of personaReply(transcript, directive)) {
          text += token;
          send({ event: "token", data: { text: token } });
        }
        return text;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "persona failed";
      studentLine = FALLBACK_LINE;
      await streamTextAsTokens(FALLBACK_LINE, send);
      send({
        event: "error",
        data: { message, fallback_line: FALLBACK_LINE },
      });
    }

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
      },
    });
  });
}

export function createTurnStream(sessionId: string): ReadableStream<Uint8Array> {
  if (process.env.ECHO_MODE === "true") {
    return createEchoTurnStream(sessionId);
  }
  return createRealTurnStream(sessionId);
}
