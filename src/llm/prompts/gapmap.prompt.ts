/**
 * Gap-map generation prompt. Owner: B (Block B3 step 11).
 *
 * Input: final graph states + collected vague quotes + dodged list.
 * Output: GapMap JSON per contracts/gap-map.schema.json.
 */

import type { ConceptGraph, VagueMoment } from "@/lib/types";

export function gapMapPrompt(
  _graph: ConceptGraph,
  _quotes: VagueMoment[],
  _dodged: string[]
): string {
  // TODO(B)
  throw new Error("not implemented");
}
