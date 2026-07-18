/**
 * POST /api/session  {topic} → {session_id, graph}
 *
 * Owner: A (Block A1, step 2)
 * - v1: return the fixture graph regardless of topic, persist session to Atlas
 * - CP2: call B's generateGraph(topic) for non-cached topics; serve
 *   /fixtures/graphs/* for the five demo topics (never hit Gemini in the demo)
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  // TODO(A): parse {topic}, create session doc, persist, return {session_id, graph}
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
