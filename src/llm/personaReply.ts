/**
 * Student Persona. Owner: B (Block B2). CP2 deliverable.
 *
 * The persona knows NOTHING about the topic. It receives only the
 * conversation, its persona instructions, and one directive.
 *
 * Four guardrails, hard rules (every adversarial break becomes a new rule):
 *   1. max 2 sentences (a student who monologues is a tutor)
 *   2. no terminology the user hasn't introduced (the #1 fiction-breaker)
 *   3. never confirm correctness (only the gap map renders verdicts)
 *   4. deflect direct factual questions in character
 *      ("No idea — that's why you're teaching me. What is it?")
 *
 * Block B3 step 13: spoken-register pass — tune against D's TTS *audio*.
 */

import type { Utterance, Directive } from "@/lib/types";
import type { StudentId } from "@/lib/studentProfiles";
import { streamPersona } from "./gemini";
import { personaPrompt } from "./prompts/persona.prompt";

export async function* personaReply(
  transcript: Utterance[],
  directive: Directive,
  student: StudentId = "sam"
): AsyncIterable<string> {
  yield* streamPersona(personaPrompt(transcript, directive, student));
}
