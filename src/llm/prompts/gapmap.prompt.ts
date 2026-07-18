/**
 * Gap-map generation prompt. Owner: B (Block B3 step 11). CP3 deliverable.
 *
 * Input: final graph states + collected vague quotes + dodged list.
 * Output (raw, before generateGapMap.ts assembles the final GapMap):
 *   one_liner_candidates, reteach_order, vaguest_moments.
 *
 * Deliberately does NOT ask the model for `topic`, `nodes`, or
 * `dodged_questions` — those are deterministic passthroughs of data we
 * already have, injected in code by generateGapMap.ts. Never let the model
 * regenerate something it can only get right by luck when we already know
 * the answer.
 *
 * The one_liner is the star (per the design doc: "You understand TCP until
 * a packet actually gets lost."). Asking for several ranked candidates in
 * one call gets most of the "generate ten, pick the best" quality the build
 * plan calls for without a second scoring call's latency/cost.
 */

import type { ConceptGraph, VagueMoment } from "@/lib/types";

function formatGraph(graph: ConceptGraph): string {
  return graph.nodes
    .map((n) => `- ${n.id} "${n.name}" (final state: ${n.state}): ${n.truth}`)
    .join("\n");
}

function formatQuotes(quotes: VagueMoment[]): string {
  if (quotes.length === 0) return "(none collected this session)";
  return quotes.map((q) => `- [${q.node_id}] "${q.quote}"`).join("\n");
}

function formatDodged(dodged: string[]): string {
  if (dodged.length === 0) return "(nothing was dodged this session)";
  return dodged.map((d) => `- ${d}`).join("\n");
}

export function gapMapPrompt(
  graph: ConceptGraph,
  quotes: VagueMoment[],
  dodged: string[]
): string {
  return `A student just finished teaching YOU the topic "${graph.topic}" in a session where you played a curious student and probed their explanation. You are now writing the end-of-session report card. You never talk to the student directly — you only ever produce JSON for another program to render as a report.

Final state of every concept in the session's answer key (id, name, final state, ground truth):
${formatGraph(graph)}

Vague or hand-wavy quotes flagged during the session (verbatim from the user, tagged with the concept they were about):
${formatQuotes(quotes)}

Concepts the user dodged when asked about directly:
${formatDodged(dodged)}

Produce exactly three things:

1. "vaguest_moments": from the flagged quotes list above ONLY, pick the up-to-3 quotes that are the most worth featuring in the report as "your vaguest moments" — the ones that best illustrate a real gap, not just informal phrasing. Copy each "quote" and "node_id" EXACTLY as given above, character for character — never paraphrase, clean up, or shorten a quote, and never invent a quote that isn't in the list above. If there are 3 or fewer quotes total, just return all of them unchanged. If there are none, return an empty array.

2. "reteach_order": order the ids of every concept whose final state is NOT "solid" (i.e. vague, wrong, dodged, or unvisited) into the sequence the user should re-study them in. Prioritize concepts other concepts depend on (check prereqs — you can't productively re-teach something whose prerequisite is also shaky) before concepts that depend on them, and within the same prerequisite depth put the worse states first (wrong/dodged before vague, vague before unvisited). Every id in this list must be one of the concept ids from the answer key above. If every concept is "solid", return an empty array.

3. "one_liner_candidates": write 5 candidate one-line summaries of the whole session, ranked BEST FIRST. Each must be ONE sentence that stings productively — specific, a little uncomfortable, and immediately clear about WHERE understanding broke.

Good (name the cliff edge):
- "You understand TCP until a packet actually gets lost."
- "You can describe slow start until someone asks what ssthresh actually does."
- "You're solid on the happy path and blank the moment three duplicate ACKs show up."

Bad (flat / generic — never produce these):
- "You did pretty well but had some gaps."
- "Your explanation of TCP congestion control needs more depth."
- "You understand some concepts but struggle with others."
- "Overall solid with a few vague spots."

Rules for every candidate: (a) name at least one concrete concept from the answer key above, (b) pin the failure to a specific moment/state (vague/wrong/dodged/never reached), (c) would feel embarrassing if read aloud on a projector. Ground every candidate in the actual concept names and states — nothing generic enough to apply to any topic. If literally everything is "solid", the one-liner should be genuine praise that still names what they nailed — don't invent a fake gap.`;
}
