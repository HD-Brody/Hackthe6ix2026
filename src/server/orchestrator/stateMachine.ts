/**
 * Session state machine. Owner: A (Block A1, step 5).
 *
 * created → teaching → wrapping → ended
 * All transitions logged (console + session doc).
 */

import type { Session, SessionStatus } from "@/lib/types";
import { getDb } from "@/server/db/mongo";

const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  created: ["teaching"],
  teaching: ["wrapping", "ended"],
  wrapping: ["ended"],
  ended: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export async function transition(
  sessionId: string,
  from: SessionStatus,
  to: SessionStatus
): Promise<SessionStatus> {
  if (!canTransition(from, to)) {
    throw new Error(`invalid transition: ${from} → ${to}`);
  }

  console.log(`[session ${sessionId}] ${from} → ${to}`);

  const res = await (await getDb())
    .collection<Session>("sessions")
    .updateOne({ _id: sessionId, status: from }, { $set: { status: to } });

  if (res.matchedCount === 0) {
    throw new Error(`session not found or status mismatch: ${sessionId}`);
  }

  return to;
}
