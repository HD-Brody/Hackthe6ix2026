/**
 * GET /api/sessions → { sessions: SessionSummary[] }
 *
 * Session history for the current user (Auth0 sub, or the anonymous "dev"
 * pool when logged out). Powers the profile page's "Recently Taught".
 */

import { NextResponse } from "next/server";
import { listSessionsByUser } from "@/server/db/sessions";
import { getUserId } from "@/lib/auth0";

export async function GET() {
  const userId = await getUserId();
  const sessions = await listSessionsByUser(userId);
  return NextResponse.json({ sessions });
}
