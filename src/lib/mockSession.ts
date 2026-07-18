"use client";

import type { Utterance } from "@/lib/types";
import type { StudentId } from "@/lib/studentProfiles";

const STORAGE_PREFIX = "professor-me:mock-session:";

export type MockSession = {
  id: string;
  topic: string;
  student: StudentId;
  utterances: Utterance[];
  createdAt: number;
};

export const isForcedMockMode =
  process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export function isMockSessionId(sessionId: string): boolean {
  return sessionId.startsWith("demo-");
}

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

export function createMockSession(
  topic: string,
  student: StudentId
): MockSession {
  const session: MockSession = {
    id: `demo-${Date.now()}`,
    topic,
    student,
    utterances: [],
    createdAt: Date.now(),
  };
  saveMockSession(session);
  return session;
}

export function readMockSession(sessionId: string): MockSession | null {
  if (typeof window === "undefined") return null;
  try {
    const serialized = window.localStorage.getItem(storageKey(sessionId));
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as MockSession;
    return parsed.id === sessionId && Array.isArray(parsed.utterances)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function saveMockSession(session: MockSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(session.id), JSON.stringify(session));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function saveMockTranscript(
  sessionId: string,
  utterances: Utterance[]
): void {
  const session = readMockSession(sessionId);
  if (!session) return;
  saveMockSession({ ...session, utterances });
}
