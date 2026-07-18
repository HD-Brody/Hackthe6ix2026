/**
 * Student avatar + the three state indicators used all weekend:
 * listening / thinking (animated) / speaking. Owner: C (Block C1 step 4).
 * Transitions are faked until CP3; D's audio pipeline drives `speaking` after.
 */

"use client";

export type StudentState = "listening" | "thinking" | "speaking";

export function StudentAvatar({ state }: { state: StudentState }) {
  // TODO(C)
  return <div>Sam is {state}</div>;
}
