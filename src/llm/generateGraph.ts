/**
 * Concept-graph generation. Owner: B (Block B1). CP1 deliverable.
 *
 * Quality bar: 8–15 nodes, real prereq edges, every node PROBEABLE.
 * "History of TCP" is a bad node — delete-worthy.
 * Prompt lives in ./prompts/graph.prompt.ts.
 */

import type { ConceptGraph } from "@/lib/types";

export async function generateGraph(_topic: string): Promise<ConceptGraph> {
  // TODO(B): strong-tier Gemini call with responseSchema =
  // contracts/concept-graph.schema.json
  throw new Error("not implemented");
}
