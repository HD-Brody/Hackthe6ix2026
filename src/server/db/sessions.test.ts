import { describe, it, expect } from "vitest";
import { applyVerdictToGraph } from "./sessions";
import type { ConceptGraph, Verdict } from "@/lib/types";

const graph: ConceptGraph = {
  topic: "test",
  nodes: [
    {
      id: "n1",
      name: "A",
      truth: "truth a",
      difficulty: 1,
      prereqs: [],
      probes: ["ask-why", "ask-example"],
      state: "unvisited",
      vague_quotes: [],
    },
    {
      id: "n2",
      name: "B",
      truth: "truth b",
      difficulty: 1,
      prereqs: [],
      probes: ["ask-why", "ask-example"],
      state: "unvisited",
      vague_quotes: [],
    },
    {
      id: "n3",
      name: "C",
      truth: "truth c",
      difficulty: 1,
      prereqs: [],
      probes: ["ask-why", "ask-example"],
      state: "solid",
      vague_quotes: ["old quote"],
    },
  ],
};

function node(id: string) {
  const n = graph.nodes.find((x) => x.id === id)!;
  return applyVerdictToGraph(graph, verdict).nodes.find((x) => x.id === id)!;
}

const verdict: Verdict = {
  nodes_touched: ["n1", "n2", "n3"],
  verdicts: [
    { node_id: "n1", verdict: "vague", quote: "hand-wavy" },
    { node_id: "n3", verdict: "vague", quote: "got worse" },
  ],
  recommended_directive: { type: "PROBE", node_id: "n1" },
};

describe("applyVerdictToGraph", () => {
  it("sets state from each NodeVerdict; latest wins (no downgrade protection)", () => {
    expect(node("n1").state).toBe("vague");
    expect(node("n3").state).toBe("vague"); // was solid → vague
  });

  it("pushes quotes onto vague_quotes", () => {
    expect(node("n1").vague_quotes).toEqual(["hand-wavy"]);
    expect(node("n3").vague_quotes).toEqual(["old quote", "got worse"]);
  });

  it("marks nodes_touched without a verdict entry as touched when unvisited", () => {
    expect(node("n2").state).toBe("touched");
  });

  it("leaves nodes outside nodes_touched unchanged", () => {
    const result = applyVerdictToGraph(graph, {
      nodes_touched: ["n1"],
      verdicts: [{ node_id: "n1", verdict: "solid" }],
      recommended_directive: { type: "ADVANCE" },
    });
    expect(result.nodes.find((n) => n.id === "n2")!.state).toBe("unvisited");
  });
});
