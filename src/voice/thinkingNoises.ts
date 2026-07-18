/**
 * Latency masks. Owner: D (Block D3 step 12).
 *
 * If stop-of-speech → first-audio exceeds ~1.5s, play a pre-generated
 * thinking noise matched to the directive type:
 *   PROBE  → confused "hmm?"
 *   DEEPEN → curious "oh—"
 *   else   → "wait—", soft keyboard tap
 *
 * Pre-render as audio files (public/audio/) at hour 12 — NOT live TTS.
 */

import type { DirectiveType } from "@/lib/types";

export function playThinkingNoise(_directive: DirectiveType): void {
  // TODO(D)
}
