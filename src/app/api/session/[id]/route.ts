/**
 * GET /api/session/:id → full session state
 *
 * Owner: A (Block A1, step 4)
 * This is C's refresh recovery (Block C2, step 7) and A's own debugging tool.
 * Also the crash-safety demo: kill server mid-session, restart, GET, resume.
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSession } from "@/server/db/sessions";
import { getUserId } from "@/lib/auth0";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

/**
 * DELETE /api/session/:id → {ok: true}
 * Removes a session from the caller's library. Only the owner may delete.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  const userId = await getUserId();
  if (session.user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await deleteSession(id);
  return NextResponse.json({ ok: true });
}
