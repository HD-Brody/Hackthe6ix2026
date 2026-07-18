/**
 * GET /api/session/:id → full session state
 *
 * Owner: A (Block A1, step 4)
 * This is C's refresh recovery (Block C2, step 7) and A's own debugging tool.
 * Also the crash-safety demo: kill server mid-session, restart, GET, resume.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/db/sessions";

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
