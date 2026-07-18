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

import { Type } from "@google/genai";
import type { ConceptGraph, Utterance, Verdict } from "@/lib/types";
import { callFast } from "./gemini";
import { evaluatorPrompt } from "./prompts/evaluator.prompt";

const verdictSchema = {
  type: Type.OBJECT,
  properties: {
    nodes_touched: { type: Type.ARRAY, items: { type: Type.STRING } },
    verdicts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          node_id: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: ["solid", "vague", "wrong", "dodged"] },
          quote: {
            type: Type.STRING,
            description: "VERBATIM from the user — never paraphrased. Omit if not applicable.",
          },
        },
        required: ["node_id", "verdict"],
      },
    },
    recommended_directive: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ["PROBE", "DEEPEN", "ADVANCE", "WRAP_UP"] },
        node_id: { type: Type.STRING },
      },
      required: ["type"],
    },
  },
  required: ["nodes_touched", "verdicts", "recommended_directive"],
};

export async function evaluate(
  graph: ConceptGraph,
  transcript: Utterance[],
  userText: string
): Promise<Verdict> {
  return callFast<Verdict>(evaluatorPrompt(graph, transcript, userText), verdictSchema);
}
