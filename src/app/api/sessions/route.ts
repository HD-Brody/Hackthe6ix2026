/**
 * GET /api/sessions → { sessions: SessionSummary[] }
 *
 * Session history for the current user (Auth0 sub, or this browser's
 * `anon:<uuid>` cookie when logged out). Powers profile / analytics.
 */

import { NextResponse } from "next/server";
import { listSessionsByUser } from "@/server/db/sessions";
import { getUserId } from "@/lib/auth0";

export async function GET() {
  const userId = await getUserId();
  // Belt-and-suspenders: never serve the legacy shared anonymous pool.
  if (userId === "dev") {
    return NextResponse.json({ sessions: [] });
  }
  const sessions = await listSessionsByUser(userId);
  return NextResponse.json({ sessions });
}
