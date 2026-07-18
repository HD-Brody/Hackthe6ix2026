/**
 * STT client. Owner: D (Block D2 step 7, per the CP1 decision).
 *
 * CP1 decision: Web Speech API vs Whisper — made from the latency spike
 * numbers (src/voice/latency/), not vibes.
 *
 * Jargon-hint mechanism if the chosen path supports it: feed the concept
 * graph's node names as biasing hints (mitigates "ssthresh" → "s s thresh").
 */

"use client";

export interface STTClient {
  start(hints: string[]): void;
  stop(): void;
  /** Fires on interim results — C shows these live (Block C3 step 11). */
  onPartial(cb: (text: string) => void): void;
  /** Fires when a segment finalizes — this is what gets POSTed to /turn. */
  onFinal(cb: (text: string) => void): void;
}

export function createSTTClient(): STTClient {
  // TODO(D)
  throw new Error("not implemented");
}
