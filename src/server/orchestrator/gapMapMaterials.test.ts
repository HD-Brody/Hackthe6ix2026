import { describe, it, expect } from "vitest";
import { collectGapMapMaterials } from "./gapMapMaterials";
import type { ConceptGraph } from "@/lib/types";

const graph: ConceptGraph = {
  topic: "test",
  nodes: [
    {
      id: "n1",
      name: "Slow start",
      truth: "t",
      difficulty: 1,
      prereqs: [],
      probes: ["ask-why", "ask-example"],
      state: "vague",
      vague_quotes: ["hand-wavy"],
    },
    {
      id: "n2",
      name: "Fast retransmit",
      truth: "t",
      difficulty: 1,
      prereqs: [],
      probes: ["ask-why", "ask-example"],
      state: "dodged",
      vague_quotes: [],
    },
  ],
};

describe("collectGapMapMaterials", () => {
  it("collects vague_quotes as VagueMoments and dodged node names", () => {
    const { quotes, dodged } = collectGapMapMaterials(graph);
    expect(quotes).toEqual([{ quote: "hand-wavy", node_id: "n1" }]);
    expect(dodged).toEqual(["Fast retransmit"]);
  });
});
