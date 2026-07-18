/**
 * POST /api/session/:id/end  {} → {gap_map}
 *
 * Owner: A (Block A2, step 10)
 * Calls B's generateGapMap() over final node states + collected quotes +
 * dodged list; persists result on the session doc; transitions state → ended.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  // TODO(A): generate gap map, persist, return it
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
