/**
 * Resolve a topic to a concept graph — cached demo graphs or live generation.
 * Owner: A (Block A2, step 6).
 */

import graphBinarySearchTrees from "@/../fixtures/graphs/graph-binary-search-trees.json";
import graphHowHttpsWorks from "@/../fixtures/graphs/graph-how-https-works.json";
import graphInflation from "@/../fixtures/graphs/graph-inflation.json";
import graphPhotosynthesis from "@/../fixtures/graphs/graph-photosynthesis.json";
import graphTcpCongestionControl from "@/../fixtures/graphs/graph-tcp-congestion-control.json";
import { generateGraph } from "@/llm/generateGraph";
import type { ConceptGraph } from "@/lib/types";

/** Case-insensitive topic → B's vetted CP1 demo cache. */
const DEMO_GRAPHS: Record<string, ConceptGraph> = {
  "tcp congestion control": graphTcpCongestionControl as ConceptGraph,
  "how https works": graphHowHttpsWorks as ConceptGraph,
  photosynthesis: graphPhotosynthesis as ConceptGraph,
  inflation: graphInflation as ConceptGraph,
  "binary search trees": graphBinarySearchTrees as ConceptGraph,
};

async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim();
}

function cloneGraph(graph: ConceptGraph, topic: string): ConceptGraph {
  return {
    topic,
    nodes: graph.nodes.map((n) => ({
      ...n,
      vague_quotes: [...n.vague_quotes],
      prereqs: [...n.prereqs],
      probes: [...n.probes],
    })),
  };
}

/** Demo topic → cached graph; unknown → generateGraph with retry; total failure → TCP cache. */
export async function resolveGraph(topic: string): Promise<ConceptGraph> {
  const cached = DEMO_GRAPHS[normalizeTopic(topic)];
  if (cached) return cloneGraph(cached, topic);

  try {
    return await retryOnce(() => generateGraph(topic));
  } catch (err) {
    console.error(
      `[resolveGraph] generateGraph failed for "${topic}", using TCP fallback:`,
      err
    );
    return cloneGraph(graphTcpCongestionControl as ConceptGraph, topic);
  }
}
