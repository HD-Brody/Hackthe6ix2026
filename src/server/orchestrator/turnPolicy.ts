/**
 * Turn policy — pure function, no LLM. Owner: A (Block A2, step 8).
 *
 * v1 rules, in priority order:
 *   1. last verdict `vague` and node not yet probed twice → PROBE(node)
 *   2. `vague` twice already → mark node, ADVANCE to next prereq-satisfied
 *      unvisited node (don't trap the user in a loop)
 *   3. `solid` → DEEPEN(node) once, then ADVANCE
 *   4. all nodes visited → WRAP_UP
 *
 * Cheap to test, expensive to debug live — keep turnPolicy.test.ts green.
 * If CP2 slips past hour 10: cut DEEPEN (probe-and-advance only).
 */

import type { ConceptGraph, Verdict, Directive } from "@/lib/types";

export interface PolicyState {
  /** node_id → number of times we've probed it */
  probeCounts: Record<string, number>;
  /** node_id → whether we've already deepened it */
  deepened: Record<string, boolean>;
}

export function turnPolicy(
  _graph: ConceptGraph,
  _verdict: Verdict,
  _state: PolicyState
): Directive {
  // TODO(A): implement v1 rules above
  throw new Error("not implemented");
}

/** Next unvisited node whose prereqs are all solid/vague/wrong/dodged (i.e. visited). */
export function nextAdvanceTarget(_graph: ConceptGraph): string | null {
  // TODO(A)
  throw new Error("not implemented");
}
