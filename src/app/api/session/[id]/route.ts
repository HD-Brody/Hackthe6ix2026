/**
 * GET /api/session/:id → full session state
 *
 * Owner: A (Block A1, step 4)
 * This is C's refresh recovery (Block C2, step 7) and A's own debugging tool.
 * Also the crash-safety demo: kill server mid-session, restart, GET, resume.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  // TODO(A): load session from Mongo, 404 if not found
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
