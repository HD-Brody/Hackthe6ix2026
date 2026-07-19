/**
 * POST /api/session/:id/opening → SSE stream
 *
 * Bridging opening for re-teach sessions — student speaks first with memory
 * of the prior session's gaps. No evaluate call (no user text yet).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  acquireTurnLock,
  getSession,
} from "@/server/db/sessions";
import { createOpeningStream, SSE_HEADERS } from "@/server/orchestrator/runTurn";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  if (session.status === "ended") {
    return NextResponse.json({ error: "session ended" }, { status: 400 });
  }
  if (!session.prior_gap_context) {
    return NextResponse.json({ error: "not a re-teach session" }, { status: 400 });
  }
  if (session.utterances.length > 0) {
    return NextResponse.json({ error: "opening already played" }, { status: 409 });
  }

  if (!(await acquireTurnLock(id))) {
    return NextResponse.json(
      { error: "turn already in progress" },
      { status: 409 }
    );
  }

  return new Response(createOpeningStream(id), {
    headers: SSE_HEADERS,
  });
}
