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
import type { ConceptGraph, Utterance, Verdict, PriorGapContext } from "@/lib/types";
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

/**
 * CP4 audit fix: some callers (e.g. the orchestrator's turn loop) pass a
 * `transcript` whose last entry is the user's current utterance AND that
 * same text again as `userText` — the current utterance is persisted into
 * the session before evaluate() is ever called, so `transcript` already
 * ends with it. evaluatorPrompt() then shows the model the same sentence
 * twice ("Conversation so far" ends with it, then "The user just said"
 * repeats it), wasting tokens on every call. Rather than requiring every
 * caller to remember to slice it off themselves, evaluate() defends
 * against this itself: callers who already pass a prior-only transcript
 * (the eval harness, the adversarial sessions) are unaffected, since their
 * last entry never equals `userText`.
 */
export function dropDuplicateCurrentTurn(
  transcript: Utterance[],
  userText: string
): Utterance[] {
  const last = transcript[transcript.length - 1];
  if (last && last.role === "user" && last.text === userText) {
    return transcript.slice(0, -1);
  }
  return transcript;
}

export async function evaluate(
  graph: ConceptGraph,
  transcript: Utterance[],
  userText: string,
  priorGapContext?: PriorGapContext
): Promise<Verdict> {
  const priorTranscript = dropDuplicateCurrentTurn(transcript, userText);
  return callFast<Verdict>(
    evaluatorPrompt(graph, priorTranscript, userText, priorGapContext),
    verdictSchema
  );
}
