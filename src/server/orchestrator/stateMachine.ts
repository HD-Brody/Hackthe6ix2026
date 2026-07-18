/**
 * Session state machine. Owner: A (Block A1, step 5).
 *
 * created → teaching → wrapping → ended
 * All transitions logged (console + session doc).
 */

import type { SessionStatus } from "@/lib/types";

const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  created: ["teaching"],
  teaching: ["wrapping", "ended"],
  wrapping: ["ended"],
  ended: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(
  _sessionId: string,
  _from: SessionStatus,
  _to: SessionStatus
): SessionStatus {
  // TODO(A): validate, log, persist, return new status
  throw new Error("not implemented");
}
