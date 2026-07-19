import { describe, it, expect } from "vitest";
import {
  applyVerdictToGraph,
  buildTurnLockAcquireFilter,
  countUserTurns,
  hasOrphanedUserTurn,
  isSessionCapReached,
  isTurnCapReached,
  MAX_SESSIONS_PER_USER,
  MAX_TURNS_PER_SESSION,
  summaryNodesForSession,
  toSessionSummary,
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

describe("turn cap", () => {
  it("allows up to MAX_TURNS_PER_SESSION user turns", () => {
    const utterances = Array.from({ length: MAX_TURNS_PER_SESSION - 1 }, (_, i) => ({
      role: "user" as const,
      text: `turn ${i}`,
      ts: i,
    }));
    expect(countUserTurns(utterances)).toBe(MAX_TURNS_PER_SESSION - 1);
    expect(isTurnCapReached(utterances)).toBe(false);
  });

  it("rejects when user turn count reaches cap", () => {
    const utterances = Array.from({ length: MAX_TURNS_PER_SESSION }, (_, i) => ({
      role: "user" as const,
      text: `turn ${i}`,
      ts: i,
    }));
    expect(isTurnCapReached(utterances)).toBe(true);
  });
});

describe("session cap", () => {
  it("rejects when session count reaches MAX_SESSIONS_PER_USER", () => {
    expect(isSessionCapReached(MAX_SESSIONS_PER_USER - 1)).toBe(false);
    expect(isSessionCapReached(MAX_SESSIONS_PER_USER)).toBe(true);
    expect(isSessionCapReached(MAX_SESSIONS_PER_USER + 1)).toBe(true);
  });
});

describe("toSessionSummary", () => {
  it("prefers gap_map nodes over graph nodes for ended sessions", () => {
    const summary = toSessionSummary({
      _id: "s1",
      topic: "Photosynthesis",
      status: "ended",
      started_at: 1_000,
      ended_at: 2_000,
      graph: {
        topic: "Photosynthesis",
        nodes: [
          {
            id: "n1",
            name: "Equation",
            truth: "x",
            difficulty: 1,
            prereqs: [],
            probes: ["ask-why"],
            state: "unvisited",
            vague_quotes: [],
          },
        ],
      },
      gap_map: {
        topic: "Photosynthesis",
        nodes: [{ id: "n1", name: "Equation", state: "vague" }],
        vaguest_moments: [],
        dodged_questions: [],
        reteach_order: ["n1"],
        one_liner: "Needs another pass.",
      },
    });

    expect(summary.discussed).toBe(1);
    expect(summary.score).toBe(50);
    expect(summary.one_liner).toBe("Needs another pass.");
    expect(summary.duration_ms).toBe(1_000);
  });

  it("falls back to graph nodes when no gap map exists", () => {
    const nodes = summaryNodesForSession({
      graph: {
        topic: "Test",
        nodes: [
          {
            id: "n1",
            name: "A",
            truth: "x",
            difficulty: 1,
            prereqs: [],
            probes: ["ask-why"],
            state: "solid",
            vague_quotes: [],
          },
        ],
      },
    });

    expect(nodes).toEqual([{ id: "n1", name: "A", state: "solid" }]);
  });
});
