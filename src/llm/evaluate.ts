/**
 * Evaluator — utterance scoring. Owner: B (Block B2). CP2 deliverable.
 *
 * Signature agreed at CP0 — A imports this directly.
 * Key quality bar: `quote` fields are VERBATIM from the user, never
 * paraphrased (paraphrased quotes poison the gap map's credibility).
 *
 * Block B3 step 12: tune for the fast tier — trim prompt, cut transcript
 * window to last ~6 turns + node-state summary.
 */

import type { ConceptGraph, Utterance, Verdict } from "@/lib/types";

export async function evaluate(
  _graph: ConceptGraph,
  _transcript: Utterance[],
  _userText: string
): Promise<Verdict> {
  // TODO(B): fast-tier Gemini call with responseSchema = contracts/verdict.schema.json
  throw new Error("not implemented");
}
