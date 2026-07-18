/**
 * Evaluator scoring prompt. Owner: B (Block B2 step 6).
 *
 * Input: graph + current states + rolling transcript + latest utterance.
 * Output: verdict JSON per contracts/verdict.schema.json.
 * The quote must be verbatim — test that it never paraphrases.
 */

import type { ConceptGraph, Utterance } from "@/lib/types";

export function evaluatorPrompt(
  _graph: ConceptGraph,
  _transcript: Utterance[],
  _userText: string
): string {
  // TODO(B)
  throw new Error("not implemented");
}
