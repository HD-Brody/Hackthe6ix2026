/**
 * POST /api/session/:id/end  {} → {gap_map}
 *
 * Owner: A (Block A2, step 10)
 * Calls generateGapMap() over final node states + collected quotes +
 * dodged list; persists result on the session doc; transitions state → ended.
 * Idempotent: returns existing gap_map if already generated.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, releaseTurnLock, setGapMap } from "@/server/db/sessions";
import { collectGapMapMaterials } from "@/server/orchestrator/gapMapMaterials";
import { generateGapMap } from "@/server/orchestrator/llm";
import { transition } from "@/server/orchestrator/stateMachine";
import type { SessionStatus } from "@/lib/types";

async function transitionToEnded(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  if (status === "ended") return;
  if (status === "teaching") {
    await transition(sessionId, "teaching", "ended");
    return;
  }
  if (status === "wrapping") {
    await transition(sessionId, "wrapping", "ended");
    return;
  }
  throw new Error(`cannot end session from status: ${status}`);
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  if (session.gap_map) {
    return NextResponse.json({ gap_map: session.gap_map });
  }

  if (session.status === "created") {
    return NextResponse.json(
      { error: "session has not started" },
      { status: 400 }
    );
  }

  const { quotes, dodged } = collectGapMapMaterials(session.graph);

  if (session.turn_in_progress) {
    await releaseTurnLock(id);
  }

  let gapMap;
  try {
    gapMap = await generateGapMap(session.graph, quotes, dodged);
  } catch (err) {
    const message = err instanceof Error ? err.message : "gap map generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await transitionToEnded(id, session.status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid session status";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await setGapMap(id, gapMap);

  return NextResponse.json({ gap_map: gapMap });
}
