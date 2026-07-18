/**
 * POST /api/session/:id/feedback  {rating, comment?} → {ok: true}
 *
 * Stores the end-of-session star rating on the session doc.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, setFeedback } from "@/server/db/sessions";

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

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  await setFeedback(id, {
    rating,
    comment: body.comment?.trim() || undefined,
    ts: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
