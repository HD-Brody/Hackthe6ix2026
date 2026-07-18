/**
 * Latency mask decision logic. Owner: D (Block D3 step 12).
 *
 * Answers two questions at runtime:
 *   1. Has enough silence passed that we should play a filler noise?
 *   2. Which filler clip matches the current directive?
 *
 * These are pure functions — no side effects, no Audio API calls.
 * Use them together then delegate playback to playThinkingNoise() in thinkingNoises.ts.
 *
 * Typical usage in the turn loop:
 *   const elapsed = Date.now() - tSpeechEnd;
 *   if (shouldPlayThinkingNoise(elapsed)) {
 *     playThinkingNoise(directive.type);   // thinkingNoises.ts
 *   }
 */

// No "use client" — these are pure functions usable anywhere (server, browser, tests).

import { THINKING_NOISE_URLS } from "./thinkingNoises";

// ── Default threshold ─────────────────────────────────────────────────────────

/**
 * The default silence threshold in milliseconds.
 * From the design doc: "if stop-of-speech → first-audio exceeds ~1.5s, play filler".
 * Can be overridden at the call site or globally via LATENCY_MASK_THRESHOLD_MS env var.
 */
const ENV_THRESHOLD_MS = process.env.LATENCY_MASK_THRESHOLD_MS
  ? Number(process.env.LATENCY_MASK_THRESHOLD_MS)
  : NaN;

const DEFAULT_THRESHOLD_MS =
  Number.isFinite(ENV_THRESHOLD_MS) ? ENV_THRESHOLD_MS : 1500;

// ── shouldPlayThinkingNoise ───────────────────────────────────────────────────

/**
 * Returns true if the elapsed time EXCEEDS the threshold — meaning the user would
 * notice the silence and a filler noise should start playing immediately.
 *
 * "Exceeds" is strict: exactly equal to the threshold returns false.
 * (1500ms of silence is the boundary; 1501ms crosses it.)
 *
 * @param elapsedMs   - Milliseconds since the user finished speaking (STT end → now).
 * @param thresholdMs - Override the default threshold (default: 1500ms or env var).
 */
export function shouldPlayThinkingNoise(
  elapsedMs: number,
  thresholdMs: number = DEFAULT_THRESHOLD_MS
): boolean {
  return elapsedMs > thresholdMs;
}

// ── pickThinkingNoise ─────────────────────────────────────────────────────────

/**
 * Returns the audio file path for the given directive type, using the lookup table
 * exported from thinkingNoises.ts. Falls back to the "default" entry for unknown types.
 *
 * Throws only if even the "default" entry is missing — which would mean the
 * THINKING_NOISE_URLS table itself is misconfigured.
 *
 * @param directiveType - The orchestrator directive string: PROBE, DEEPEN, ADVANCE, WRAP_UP.
 */
export function pickThinkingNoise(directiveType: string): string {
  const url =
    THINKING_NOISE_URLS[directiveType as keyof typeof THINKING_NOISE_URLS] ??
    THINKING_NOISE_URLS["default"];

  if (!url) {
    throw new Error(
      `[latencyMask] THINKING_NOISE_URLS is missing a "default" entry — check thinkingNoises.ts`
    );
  }

  return url;
}
