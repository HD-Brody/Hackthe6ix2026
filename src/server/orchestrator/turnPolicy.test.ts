/**
 * Turn policy unit tests. Owner: A (Block A2, step 8).
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import graphTcp from "../../../fixtures/graph-tcp.json";
import verdictVague from "../../../fixtures/verdict-vague.json";
import verdictSolid from "../../../fixtures/verdict-solid.json";
import { turnPolicy, nextAdvanceTarget } from "./turnPolicy";
import type { ConceptGraph, PolicyState, Verdict } from "@/lib/types";

const graph = graphTcp as ConceptGraph;
const emptyPolicy: PolicyState = { probeCounts: {}, deepened: {} };

function withNodeStates(
  base: ConceptGraph,
  states: Record<string, ConceptGraph["nodes"][0]["state"]>
): ConceptGraph {
  return {
    ...base,
    nodes: base.nodes.map((n) =>
      states[n.id] !== undefined ? { ...n, state: states[n.id] } : { ...n }
    ),
  };
}

describe("turnPolicy", () => {
  it("vague verdict, node probed 0 times → PROBE that node", () => {
    const directive = turnPolicy(
      graph,
      verdictVague as Verdict,
      emptyPolicy
    );
    // n1 vague (depth 0) beats n3 vague (depth 1) on tie-break
    expect(directive).toEqual({ type: "PROBE", node_id: "n1" });
  });

  it("vague verdict, node already probed twice → ADVANCE", () => {
    const g = withNodeStates(graph, { n1: "vague" });
    const directive = turnPolicy(g, verdictVague as Verdict, {
      probeCounts: { n1: 2 },
      deepened: {},
    });
    expect(directive).toEqual({ type: "ADVANCE", node_id: "n2" });
  });

  it("solid verdict, not yet deepened → DEEPEN", () => {
    const directive = turnPolicy(
      graph,
      verdictSolid as Verdict,
      emptyPolicy
    );
    expect(directive).toEqual({ type: "DEEPEN", node_id: "n1" });
  });

  it("solid verdict, already deepened → ADVANCE", () => {
    const g = withNodeStates(graph, { n1: "solid" });
    const directive = turnPolicy(g, verdictSolid as Verdict, {
      probeCounts: {},
      deepened: { n1: true },
    });
    expect(directive).toEqual({ type: "ADVANCE", node_id: "n2" });
  });

  it("ADVANCE respects prereq order", () => {
    const g = withNodeStates(graph, {
      n1: "solid",
      n2: "unvisited",
      n3: "unvisited",
    });
    expect(nextAdvanceTarget(g)).toBe("n2");

    const directive = turnPolicy(g, verdictSolid as Verdict, {
      probeCounts: {},
      deepened: { n1: true },
    });
    expect(directive).toEqual({ type: "ADVANCE", node_id: "n2" });
  });

  it("all nodes visited → WRAP_UP", () => {
    const g = withNodeStates(graph, {
      n1: "solid",
      n2: "solid",
      n3: "vague",
      n4: "solid",
      n5: "wrong",
      n6: "dodged",
      n7: "solid",
      n8: "vague",
    });
    expect(nextAdvanceTarget(g)).toBeNull();
    const directive = turnPolicy(g, verdictSolid as Verdict, {
      probeCounts: {},
      deepened: { n1: true },
    });
    expect(directive).toEqual({ type: "WRAP_UP" });
  });

  it("multi-node rambler: wrong beats vague; depth tie-break among same label", () => {
    const rambler: Verdict = {
      nodes_touched: ["n1", "n2", "n3"],
      verdicts: [
        { node_id: "n1", verdict: "vague", quote: "something about slow start" },
        { node_id: "n2", verdict: "vague", quote: "cwnd is like... a window?" },
        { node_id: "n3", verdict: "wrong", quote: "ssthresh is where packets die" },
      ],
      recommended_directive: { type: "PROBE", node_id: "n1" },
    };

    // wrong on n3 wins over vague on n1/n2 despite deeper prereqs
    expect(
      turnPolicy(graph, rambler, emptyPolicy)
    ).toEqual({ type: "PROBE", node_id: "n3" });

    // among two vague at same depth, shallower graph-order tie-break: n1 before n2
    const doubleVague: Verdict = {
      nodes_touched: ["n1", "n2"],
      verdicts: [
        { node_id: "n2", verdict: "vague" },
        { node_id: "n1", verdict: "vague" },
      ],
      recommended_directive: { type: "PROBE", node_id: "n2" },
    };
    expect(
      turnPolicy(graph, doubleVague, emptyPolicy)
    ).toEqual({ type: "PROBE", node_id: "n1" });
  });

  it("empty verdicts falls back to recommended_directive", () => {
    const derail: Verdict = {
      nodes_touched: [],
      verdicts: [],
      recommended_directive: { type: "PROBE", node_id: "n5" },
    };
    expect(turnPolicy(graph, derail, emptyPolicy)).toEqual({
      type: "PROBE",
      node_id: "n5",
    });
  });

  it("empty verdicts with nonsense recommendation → ADVANCE", () => {
    const derail: Verdict = {
      nodes_touched: [],
      verdicts: [],
      recommended_directive: { type: "PROBE" },
    };
    const directive = turnPolicy(graph, derail, emptyPolicy);
    expect(directive).toEqual({ type: "ADVANCE", node_id: "n1" });
  });

  it("wrong verdict probes like vague (twice max)", () => {
    const wrong: Verdict = {
      nodes_touched: ["n3"],
      verdicts: [{ node_id: "n3", verdict: "wrong", quote: "totally backwards" }],
      recommended_directive: { type: "PROBE", node_id: "n3" },
    };
    expect(turnPolicy(graph, wrong, emptyPolicy)).toEqual({
      type: "PROBE",
      node_id: "n3",
    });

    const g = withNodeStates(graph, { n3: "wrong" });
    expect(
      turnPolicy(g, wrong, { probeCounts: { n3: 2 }, deepened: {} })
    ).toEqual({ type: "ADVANCE", node_id: "n1" });
  });
});
