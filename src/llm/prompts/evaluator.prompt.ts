/**
 * Evaluator scoring prompt. Owner: B (Block B2 step 6).
 *
 * Input: graph + current states + rolling transcript + latest utterance.
 * Output: verdict JSON per contracts/verdict.schema.json.
 * The quote must be verbatim — test that it never paraphrases.
 */

import type { ConceptGraph, Utterance } from "@/lib/types";

/** Recent-history window. Aggressive trimming to ~6 turns + a node-state
 * summary is a Block B3/CP3 fast-tier tuning task, not this one — just don't
 * ship an unbounded prompt in the meantime. */
const TRANSCRIPT_WINDOW = 10;

function formatGraph(graph: ConceptGraph): string {
  return graph.nodes
    .map((n) => `- ${n.id} "${n.name}" (state: ${n.state}): ${n.truth}`)
    .join("\n");
}

function formatTranscript(transcript: Utterance[]): string {
  const recent = transcript.slice(-TRANSCRIPT_WINDOW);
  if (recent.length === 0) return "(nothing said yet)";
  return recent.map((u) => `${u.role === "user" ? "User" : "Sam"}: ${u.text}`).join("\n");
}

export function evaluatorPrompt(
  graph: ConceptGraph,
  transcript: Utterance[],
  userText: string
): string {
  return `You are grading a student (the user) who is teaching YOU the topic "${graph.topic}", against this answer key. You never talk to the user — you only ever produce JSON for another program to read.

Answer key (concept id, name, current state, ground truth — the user must never see this):
${formatGraph(graph)}

Conversation so far:
${formatTranscript(transcript)}

The user just said: "${userText}"

Decide which concept ids (from the answer key above) this specific utterance touches on — it is normal and expected for one utterance to touch multiple concepts if the user rambles across several ideas at once; grade every concept it actually addresses, not just one. If the utterance doesn't address any concept from the answer key at all (off-topic, a derail, a question back to you, small talk), return an empty "nodes_touched" and empty "verdicts" array — do not force a match.

For each concept touched, grade it as exactly one of:
- "solid": correct AND specific — names the actual mechanism from the ground truth, and that mechanism is accurate.
- "vague": true in a general sense but hand-wavy — describes what happens without stating a mechanism at all ("it speeds up until it doesn't" is vague, not solid — there's no mechanism there to be right or wrong about).
- "wrong": states a SPECIFIC mechanism that contradicts the ground truth.
- "dodged": the conversation directly asked about this concept and the user avoided answering it or changed the subject instead.

Grading "wrong" is not about tone or fluency. A confident, detailed, specific-sounding explanation is not automatically "solid" just because it sounds technical or lands on the right general outcome (e.g. "the sender slows down") — check the ACTUAL CAUSAL CLAIM against the ground truth's actual mechanism. If the user names a specific cause/mechanism and it is not the one in the ground truth, that is "wrong", full stop, even if it's articulate and even if the ground truth and the user's claim happen to agree on the surface-level outcome. Only call something "vague" when there genuinely is no falsifiable mechanism stated to check — don't use "vague" as a softer way to avoid calling something "wrong".

CRITICAL, worth repeating: whenever you grade something "vague" or include a "quote", that quote field must be copied EXACTLY, character for character, from what the user actually said above — never paraphrase it, never clean up their grammar, never summarize it. A cleaned-up quote is worthless as evidence; the whole point is showing the user their own words later. If nothing quote-worthy stands out for a concept, omit the "quote" field entirely rather than inventing one.

Finally, recommend one next move as "recommended_directive" — this is only a suggestion (the app's own policy logic may override it), but the field is required:
- "PROBE" node_id: something was vague or wrong and is worth pushing on again.
- "DEEPEN" node_id: something was solid — ask "why" one level deeper on it.
- "ADVANCE" node_id (or omit node_id): time to move to a new, not-yet-covered concept — also use this to steer an off-topic/derailing utterance back toward the topic.
- "WRAP_UP": use only if essentially everything in the answer key has already been touched across the whole conversation.`;
}
