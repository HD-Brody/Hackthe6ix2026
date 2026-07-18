/**
 * Collect gap-map inputs from the session graph. Owner: A (Block A2).
 */

import type { ConceptGraph, VagueMoment } from "@/lib/types";

export function collectGapMapMaterials(graph: ConceptGraph): {
  quotes: VagueMoment[];
  dodged: string[];
} {
  const quotes: VagueMoment[] = [];
  const dodged: string[] = [];

  for (const node of graph.nodes) {
    for (const quote of node.vague_quotes) {
      quotes.push({ quote, node_id: node.id });
    }
    if (node.state === "dodged") {
      dodged.push(node.name);
    }
  }

  return { quotes, dodged };
}
