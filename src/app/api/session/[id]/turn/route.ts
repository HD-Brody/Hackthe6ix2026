/**
 * POST /api/session/:id/turn  {user_text} → SSE stream
 *
 * Owner: A
 * - Block A1 step 3 (echo mode): ECHO_MODE=true demo kill switch
 * - Block A2 steps 7–9: real loop via src/server/orchestrator/runTurn.ts
 * - Block A3 step 13: parallel-evaluation trick behind PARALLEL_EVAL flag
 *
 * SSE event format: contracts/api.md. Helpers: src/lib/sse.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  acquireTurnLock,
  appendUtterance,
  getSession,
  releaseTurnLock,
} from "@/server/db/sessions";
import { createTurnStream, SSE_HEADERS } from "@/server/orchestrator/runTurn";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: { user_text?: string; parallel_eval?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const userText = body.user_text?.trim();
  if (!userText) {
    return NextResponse.json({ error: "user_text is required" }, { status: 400 });
  }

  const parallelEval = body.parallel_eval;

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  if (session.status === "ended") {
    return NextResponse.json({ error: "session ended" }, { status: 400 });
  }

  if (!(await acquireTurnLock(id))) {
    return NextResponse.json(
      { error: "turn already in progress" },
      { status: 409 }
    );
  }

  try {
    await appendUtterance(id, {
      role: "user",
      text: userText,
      ts: Date.now(),
    });
  } catch (err) {
    await releaseTurnLock(id);
    throw err;
  }

  return new Response(createTurnStream(id, { parallel: parallelEval }), {
    headers: SSE_HEADERS,
  });
}
