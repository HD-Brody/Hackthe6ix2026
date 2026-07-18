import { describe, it, expect } from "vitest";
import {
  applyVerdictToGraph,
  buildTurnLockAcquireFilter,
  hasOrphanedUserTurn,
  TURN_LOCK_STALE_MS,
} from "./sessions";
import type { ConceptGraph, Utterance, Verdict } from "@/lib/types";

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

describe("hasOrphanedUserTurn", () => {
  it("false when empty or last utterance is student", () => {
    expect(hasOrphanedUserTurn([])).toBe(false);
    const transcript: Utterance[] = [
      { role: "user", text: "hi", ts: 1 },
      { role: "student", text: "hey", ts: 2 },
    ];
    expect(hasOrphanedUserTurn(transcript)).toBe(false);
  });

  it("true when last utterance is user (mid-stream crash)", () => {
    const transcript: Utterance[] = [
      { role: "user", text: "first", ts: 1 },
      { role: "student", text: "reply", ts: 2 },
      { role: "user", text: "killed mid-stream", ts: 3 },
    ];
    expect(hasOrphanedUserTurn(transcript)).toBe(true);
  });
});

describe("buildTurnLockAcquireFilter", () => {
  const sessionId = "test-session";
  const now = 1_000_000;

  it("includes stale lock takeover in $or", () => {
    const filter = buildTurnLockAcquireFilter(sessionId, now, false);
    expect(filter.$or).toContainEqual({
      turn_lock_at: { $lt: now - TURN_LOCK_STALE_MS },
    });
  });

  it("includes unlocked paths in $or", () => {
    const filter = buildTurnLockAcquireFilter(sessionId, now, false);
    expect(filter.$or).toContainEqual({ turn_in_progress: { $ne: true } });
    expect(filter.$or).toContainEqual({ turn_in_progress: { $exists: false } });
  });

  it("adds orphan steal branch when last utterance is orphaned user turn", () => {
    const filter = buildTurnLockAcquireFilter(sessionId, now, true);
    expect(filter.$or).toContainEqual({ turn_in_progress: true });
  });

  it("does not add orphan steal branch when transcript is complete", () => {
    const filter = buildTurnLockAcquireFilter(sessionId, now, false);
    expect(filter.$or.filter((c) => c.turn_in_progress === true)).toHaveLength(0);
  });
});
