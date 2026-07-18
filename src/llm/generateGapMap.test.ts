import { describe, it, expect } from "vitest";
import {
  filterQuotesToNonSolid,
  pickOneLiner,
  pickVaguestMoments,
  sanitizeReteachOrder,
} from "./generateGapMap";
import type { ConceptGraph, VagueMoment } from "@/lib/types";

const graph: ConceptGraph = {
  topic: "test",
  nodes: [
    { id: "n1", name: "Slow start", truth: "t", difficulty: 1, prereqs: [], probes: ["ask-why", "ask-example"], state: "solid", vague_quotes: [] },
    { id: "n2", name: "ssthresh", truth: "t", difficulty: 2, prereqs: ["n1"], probes: ["ask-why", "ask-example"], state: "vague", vague_quotes: [] },
    { id: "n3", name: "Fast retransmit", truth: "t", difficulty: 2, prereqs: [], probes: ["ask-why", "ask-example"], state: "dodged", vague_quotes: [] },
    { id: "n4", name: "AIMD", truth: "t", difficulty: 3, prereqs: ["n2"], probes: ["ask-why", "ask-example"], state: "unvisited", vague_quotes: [] },
  ],
};

describe("filterQuotesToNonSolid", () => {
  it("drops quotes attached to a node whose final state is solid", () => {
    // n1 is solid — even though it has a recorded quote (e.g. from an
    // earlier vague moment that later resolved to solid), it must not
    // survive into the gap map's vaguest_moments candidates.
    const quotes: VagueMoment[] = [
      { quote: "solid node's old quote", node_id: "n1" },
      { quote: "vague node's quote", node_id: "n2" },
      { quote: "dodged node's quote", node_id: "n3" },
      { quote: "unvisited node's quote", node_id: "n4" },
    ];
    expect(filterQuotesToNonSolid(graph, quotes)).toEqual([
      { quote: "vague node's quote", node_id: "n2" },
      { quote: "dodged node's quote", node_id: "n3" },
      { quote: "unvisited node's quote", node_id: "n4" },
    ]);
  });

  it("returns an empty array when every quoted node is solid", () => {
    const quotes: VagueMoment[] = [{ quote: "old quote", node_id: "n1" }];
    expect(filterQuotesToNonSolid(graph, quotes)).toEqual([]);
  });
});

describe("pickVaguestMoments", () => {
  it("passes through unchanged when there are 3 or fewer quotes", () => {
    const quotes: VagueMoment[] = [
      { quote: "it just, like, happens", node_id: "n2" },
      { quote: "I think it resets or something", node_id: "n3" },
    ];
    expect(pickVaguestMoments(quotes, [])).toEqual(quotes);
  });

  it("keeps only LLM picks that exactly match a known quote+node_id pair", () => {
    const quotes: VagueMoment[] = [
      { quote: "quote A", node_id: "n1" },
      { quote: "quote B", node_id: "n2" },
      { quote: "quote C", node_id: "n3" },
      { quote: "quote D", node_id: "n4" },
    ];
    const llmPicks: VagueMoment[] = [
      { quote: "quote B", node_id: "n2" },
      { quote: "quote B but cleaned up", node_id: "n2" }, // paraphrase — must be dropped
      { quote: "quote D", node_id: "n1" }, // right quote, wrong node_id — must be dropped
      { quote: "quote D", node_id: "n4" },
    ];

    expect(pickVaguestMoments(quotes, llmPicks)).toEqual([
      { quote: "quote B", node_id: "n2" },
      { quote: "quote D", node_id: "n4" },
    ]);
  });

  it("falls back to the first 3 known-good quotes if nothing survives validation", () => {
    const quotes: VagueMoment[] = [
      { quote: "quote A", node_id: "n1" },
      { quote: "quote B", node_id: "n2" },
      { quote: "quote C", node_id: "n3" },
      { quote: "quote D", node_id: "n4" },
    ];
    const hallucinated: VagueMoment[] = [{ quote: "made up quote", node_id: "n1" }];

    expect(pickVaguestMoments(quotes, hallucinated)).toEqual(quotes.slice(0, 3));
  });

  it("caps validated picks at 3 even if more survive validation", () => {
    const quotes: VagueMoment[] = [
      { quote: "quote A", node_id: "n1" },
      { quote: "quote B", node_id: "n2" },
      { quote: "quote C", node_id: "n3" },
      { quote: "quote D", node_id: "n4" },
    ];
    expect(pickVaguestMoments(quotes, quotes)).toHaveLength(3);
  });
});

describe("sanitizeReteachOrder", () => {
  it("keeps valid non-solid ids in the model's given order", () => {
    expect(sanitizeReteachOrder(graph, ["n3", "n2", "n4"])).toEqual(["n3", "n2", "n4"]);
  });

  it("drops hallucinated ids that don't exist in the graph", () => {
    expect(sanitizeReteachOrder(graph, ["n3", "n99", "n2", "n4"])).toEqual(["n3", "n2", "n4"]);
  });

  it("drops ids the model mistakenly included even though they're solid", () => {
    expect(sanitizeReteachOrder(graph, ["n1", "n3", "n2", "n4"])).toEqual(["n3", "n2", "n4"]);
  });

  it("appends any non-solid node the model forgot", () => {
    expect(sanitizeReteachOrder(graph, ["n3"])).toEqual(["n3", "n2", "n4"]);
  });

  it("returns an empty array when everything is solid", () => {
    const allSolid: ConceptGraph = {
      ...graph,
      nodes: graph.nodes.map((n) => ({ ...n, state: "solid" })),
    };
    expect(sanitizeReteachOrder(allSolid, ["n1", "n2"])).toEqual([]);
  });
});

describe("pickOneLiner", () => {
  it("skips flat candidates in favor of a specific sting", () => {
    expect(
      pickOneLiner([
        "You did pretty well but had some gaps.",
        "You understand TCP until a packet actually gets lost.",
        "Overall solid with a few vague spots.",
      ])
    ).toBe("You understand TCP until a packet actually gets lost.");
  });

  it("falls back to first candidate when all are flat", () => {
    expect(pickOneLiner(["You did pretty well but had some gaps."])).toBe(
      "You did pretty well but had some gaps."
    );
  });
});
