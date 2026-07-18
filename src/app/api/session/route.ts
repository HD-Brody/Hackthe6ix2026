/**
 * POST /api/session  {topic} → {session_id, graph}
 *
 * Owner: A (Block A1 step 2, A2 step 6)
 * - Five demo topics → B's vetted graphs in fixtures/graphs/
 * - Unknown topics → generateGraph(topic) with retry, TCP cache on total failure
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  MAX_SESSIONS_PER_USER,
  SessionCapError,
} from "@/server/db/sessions";
import { resolveGraph } from "@/server/orchestrator/resolveGraph";
import { transition } from "@/server/orchestrator/stateMachine";

export async function POST(req: NextRequest) {
  let body: { topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const topic = body.topic?.trim();
  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const graph = await resolveGraph(topic);

  let session;
  try {
    session = await createSession("dev", topic, graph);
  } catch (err) {
    if (err instanceof SessionCapError) {
      return NextResponse.json(
        {
          error: err.code,
          message: err.message,
          limit: MAX_SESSIONS_PER_USER,
          current: err.count,
        },
        { status: 429 }
      );
    }
    throw err;
  }

  await transition(session._id, "created", "teaching");

  return NextResponse.json({ session_id: session._id, graph: session.graph });
}
