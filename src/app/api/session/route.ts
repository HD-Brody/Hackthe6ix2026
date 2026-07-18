/**
 * POST /api/session  {topic} → {session_id, graph}
 *
 * Owner: A (Block A1, step 2)
 * - v1: return the fixture graph regardless of topic, persist session to Atlas
 * - CP2: call B's generateGraph(topic) for non-cached topics; serve
 *   /fixtures/graphs/* for the five demo topics (never hit Gemini in the demo)
 */

import { NextRequest, NextResponse } from "next/server";
import graphFixture from "@/../fixtures/graph-tcp.json";
import { createSession } from "@/server/db/sessions";
import { transition } from "@/server/orchestrator/stateMachine";
import type { ConceptGraph } from "@/lib/types";

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

  const graph: ConceptGraph = { ...(graphFixture as ConceptGraph), topic };
  const session = await createSession("dev", topic, graph);
  await transition(session._id, "created", "teaching");

  return NextResponse.json({ session_id: session._id, graph: session.graph });
}
