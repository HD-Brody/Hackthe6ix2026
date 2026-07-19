/**
 * GET  /api/session/:id/feedback  → { feedback } | { feedback: null }
 * POST /api/session/:id/feedback  {rating, comment?} → {ok: true}
 *
 * Stores the end-of-session star rating on the session doc.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth0";
import { getSession, setFeedback } from "@/server/db/sessions";

async function authorizeSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) {
    return { error: NextResponse.json({ error: "session not found" }, { status: 404 }) };
  }

  const userId = await getUserId();
  if (session.user_id !== userId) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return { session };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await authorizeSession(id);
  if ("error" in result) return result.error;

  return NextResponse.json({ feedback: result.session.feedback ?? null });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: { rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }

  const result = await authorizeSession(id);
  if ("error" in result) return result.error;

  const comment = body.comment?.trim() || undefined;
  const feedback = { rating, comment, ts: Date.now() };

  await setFeedback(id, feedback);

  return NextResponse.json({ ok: true, feedback });
}
