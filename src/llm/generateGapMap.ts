/**
 * Gap-map generation. Owner: B (Block B3). CP3 deliverable.
 *
 * The one_liner is the star — iterate until it stings correctly
 * ("You understand TCP until a packet actually gets lost").
 * If quality is inconsistent: generate ten, pick the best via a scoring call.
 *
 * NEVER CUT (per the plan's cut list): the gap map with verbatim quotes
 * is the product.
 */

import type { ConceptGraph, VagueMoment, GapMap } from "@/lib/types";

export async function generateGapMap(
  _graph: ConceptGraph,
  _quotes: VagueMoment[],
  _dodged: string[]
): Promise<GapMap> {
  // TODO(B): strong-tier Gemini call with responseSchema = contracts/gap-map.schema.json
  throw new Error("not implemented");
}
