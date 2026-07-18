/**
 * POST /api/session/:id/turn  {user_text} → SSE stream
 *
 * Owner: A
 * - Block A1 step 3 (echo mode): stream a canned line from
 *   fixtures/persona-replies.json, log both utterances, return fixture verdict
 *   as the final `done` event. Gated by ECHO_MODE env flag.
 * - Block A2 steps 7–9: real loop — evaluate() → turnPolicy() → personaReply(),
 *   stream tokens, persist per turn.
 * - Block A3 step 13: parallel-evaluation trick behind PARALLEL_EVAL flag.
 * - Ugly cases (Block A2 step 11): turn already processing → queue; Gemini
 *   fails → retry once then fallback line; session not found → 404.
 *
 * SSE event format: contracts/api.md. Helpers: src/lib/sse.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import personaReplies from "@/../fixtures/persona-replies.json";
import verdictVague from "@/../fixtures/verdict-vague.json";
import { appendUtterance, getSession } from "@/server/db/sessions";
import { formatSSE } from "@/lib/sse";
import type { SessionStatus, TurnSSEEvent, Verdict } from "@/lib/types";

const FALLBACK_LINE =
  "sorry, zoned out for a second — say that again?";
const TOKEN_DELAY_MS = 40;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function echoTurnStream(
  sessionId: string,
  studentLine: string,
  verdict: Verdict
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (event: TurnSSEEvent) => {
        controller.enqueue(encoder.encode(formatSSE(event)));
      };

      try {
        const words = studentLine.split(" ");
        for (let i = 0; i < words.length; i++) {
          const text = i < words.length - 1 ? `${words[i]} ` : words[i];
          send({ event: "token", data: { text } });
          if (i < words.length - 1) await delay(TOKEN_DELAY_MS);
        }

        await appendUtterance(sessionId, {
          role: "student",
          text: studentLine,
          ts: Date.now(),
          eval: verdict,
        });

        const session = await getSession(sessionId);
        send({
          event: "done",
          data: {
            verdict,
            session_status: session?.status ?? "teaching",
          },
        });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        send({
          event: "error",
          data: { message, fallback_line: FALLBACK_LINE },
        });
        controller.close();
      }
    },
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: { user_text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userText = body.user_text?.trim();
  if (!userText) {
    return NextResponse.json({ error: "user_text is required" }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  if (session.status === "ended") {
    return NextResponse.json({ error: "session ended" }, { status: 400 });
  }

  await appendUtterance(id, {
    role: "user",
    text: userText,
    ts: Date.now(),
  });

  if (process.env.ECHO_MODE !== "true") {
    // A2: evaluate() → turnPolicy() → personaReply()
    return NextResponse.json({ error: "not implemented" }, { status: 501 });
  }

  const current = await getSession(id);
  const utteranceCount = current?.utterances.length ?? 0;
  const studentLine =
    personaReplies.replies[utteranceCount % personaReplies.replies.length];

  const stream = echoTurnStream(
    id,
    studentLine,
    verdictVague as Verdict
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
