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

export async function POST(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  // TODO(A): return new Response(readableStream, { headers: SSE headers })
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
