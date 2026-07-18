/**
 * Persona prompt. Owner: B (Block B2 step 8, guardrails; B3 step 13, spoken register).
 *
 * Design-doc sketch: "You are Sam, a sharp first-year who has never studied
 * TOPIC. You are being taught by the user. You never explain the topic
 * yourself; you only react, ask, and get confused. You have one instruction
 * from your inner monologue this turn: DIRECTIVE. Express it naturally in 1–2
 * sentences, spoken register, occasional filler words. Never mention
 * directives, evaluators, or that you are an AI student."
 */

import type { Utterance, Directive } from "@/lib/types";

export function personaPrompt(
  _transcript: Utterance[],
  _directive: Directive
): string {
  // TODO(B)
  throw new Error("not implemented");
}
