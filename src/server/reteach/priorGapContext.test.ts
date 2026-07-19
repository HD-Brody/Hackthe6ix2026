import { describe, it, expect } from "vitest";
import {
  buildPriorGapContext,
  cloneGraphForReteach,
  PriorSessionInvalidError,
} from "./priorGapContext";
import type { ConceptGraph, GapMap } from "@/lib/types";

const gapMap: GapMap = {
  topic: "TCP congestion control",
  nodes: [
    { id: "n1", name: "Slow Start", state: "solid" },
    { id: "n2", name: "Congestion Avoidance", state: "vague" },
    { id: "n3", name: "Fast Retransmit", state: "wrong" },
  ],
  vaguest_moments: [
    { node_id: "n2", quote: "it speeds up until it doesn't" },
    { node_id: "n3", quote: "three duplicate acks trigger a reset" },
    { node_id: "n1", quote: "extra quote" },
  ],
  dodged_questions: ["What is ssthresh?"],
  reteach_order: ["n3", "n2"],
  one_liner: "You get the big picture but the mechanisms need work.",
};

describe("cloneGraphForReteach", () => {
  const graph: ConceptGraph = {
    topic: "Machine Learning",
    nodes: [
      {
        id: "n1",
        name: "Gradient Descent",
        truth: "t",
        difficulty: 2,
        prereqs: [],
        probes: ["ask-why", "ask-example"],
        state: "solid",
        vague_quotes: ["old quote"],
      },
      {
        id: "n2",
        name: "Overfitting",
        truth: "t",
        difficulty: 3,
        prereqs: ["n1"],
        probes: ["ask-edge-case", "ask-why"],
        state: "vague",
        vague_quotes: ["another quote"],
      },
    ],
  };

  it("copies structure and resets per-session node state", () => {
    const cloned = cloneGraphForReteach(graph, "Machine Learning");
    expect(cloned.topic).toBe("Machine Learning");
    expect(cloned.nodes).toHaveLength(2);
    expect(cloned.nodes[0]).toMatchObject({
      id: "n1",
      name: "Gradient Descent",
      state: "unvisited",
      vague_quotes: [],
    });
    expect(cloned.nodes[1].prereqs).toEqual(["n1"]);
    expect(cloned.nodes[1].state).toBe("unvisited");
    expect(cloned.nodes[1].vague_quotes).toEqual([]);
    expect(graph.nodes[0].state).toBe("solid");
    expect(graph.nodes[0].vague_quotes).toEqual(["old quote"]);
  });
});

describe("buildPriorGapContext", () => {
  it("builds a compact snapshot with resolved names", () => {
    const prior = buildPriorGapContext("session-1", gapMap);
    expect(prior).toEqual({
      prior_session_id: "session-1",
      topic: "TCP congestion control",
      reteach_order: ["n3", "n2"],
      reteach_names: ["Fast Retransmit", "Congestion Avoidance"],
      vaguest_moments: gapMap.vaguest_moments.slice(0, 2),
      one_liner: gapMap.one_liner,
    });
  });

  it("rejects empty reteach_order", () => {
    expect(() =>
      buildPriorGapContext("session-1", { ...gapMap, reteach_order: [] })
    ).toThrow(PriorSessionInvalidError);
  });
});
