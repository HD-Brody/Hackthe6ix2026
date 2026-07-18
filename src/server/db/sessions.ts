/**
 * Session persistence. Owner: A.
 *
 * createSession / getSession / appendUtterance / applyVerdict /
 * setGapMap / setStatus — keep writes per-turn (crash safety, Block A3 step 16).
 * Rate limits live here too (Block A4 step 19): cap 40 turns/session,
 * cap sessions/user.
 */

import type { Session, Utterance, Verdict, GapMap } from "@/lib/types";

export async function createSession(
  _userId: string,
  _topic: string
): Promise<Session> {
  throw new Error("not implemented");
}

export async function getSession(_id: string): Promise<Session | null> {
  throw new Error("not implemented");
}

export async function appendUtterance(
  _sessionId: string,
  _utterance: Utterance
): Promise<void> {
  throw new Error("not implemented");
}

export async function applyVerdict(
  _sessionId: string,
  _verdict: Verdict
): Promise<void> {
  throw new Error("not implemented");
}

export async function setGapMap(
  _sessionId: string,
  _gapMap: GapMap
): Promise<void> {
  throw new Error("not implemented");
}
