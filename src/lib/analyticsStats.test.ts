import { describe, it, expect } from "vitest";
import {
  computeAnalyticsStats,
  computeScoreTrend,
  computeWeakConcepts,
} from "./analyticsStats";
import type { SessionSummary } from "../server/db/sessions";

function session(
  overrides: Partial<SessionSummary> & Pick<SessionSummary, "session_id" | "topic">
): SessionSummary {
  return {
    session_id: overrides.session_id,
    topic: overrides.topic,
    student: overrides.student ?? "sam",
    status: overrides.status ?? "ended",
    started_at: overrides.started_at ?? Date.now() - 3_600_000,
    ended_at: overrides.ended_at ?? Date.now(),
    solid: overrides.solid ?? 2,
    vague: overrides.vague ?? 1,
    wrong: overrides.wrong ?? 0,
    dodged: overrides.dodged ?? 0,
    touched: overrides.touched ?? 0,
    total: overrides.total ?? 5,
    discussed: overrides.discussed ?? 3,
    coveragePct: overrides.coveragePct ?? 60,
    score: "score" in overrides ? (overrides.score ?? null) : 83,
    coverage_nodes: overrides.coverage_nodes ?? [
      { id: "a", name: "A", state: "solid" },
      { id: "b", name: "B", state: "vague" },
    ],
    has_gap_map: overrides.has_gap_map ?? true,
    one_liner: overrides.one_liner,
    duration_ms: overrides.duration_ms ?? 1_800_000,
    feedback_rating: overrides.feedback_rating,
    feedback_comment: overrides.feedback_comment,
    feedback_ts: overrides.feedback_ts,
  };
}

describe("computeScoreTrend", () => {
  it("returns completed sessions with scores ordered by ended_at", () => {
    const trend = computeScoreTrend([
      session({
        session_id: "s2",
        topic: "Later",
        score: 70,
        ended_at: 2_000,
      }),
      session({
        session_id: "s1",
        topic: "Earlier",
        score: 80,
        ended_at: 1_000,
      }),
      session({
        session_id: "active",
        topic: "Active",
        status: "teaching",
        score: 90,
        ended_at: undefined,
      }),
      session({
        session_id: "no-score",
        topic: "No score",
        score: null,
        ended_at: 3_000,
      }),
    ]);

    expect(trend).toEqual([
      expect.objectContaining({ session_id: "s1", score: 80 }),
      expect.objectContaining({ session_id: "s2", score: 70 }),
    ]);
  });

  it("returns empty trend when no completed scored sessions exist", () => {
    expect(
      computeScoreTrend([
        session({
          session_id: "active",
          topic: "Active",
          status: "teaching",
          ended_at: undefined,
        }),
      ])
    ).toEqual([]);
  });
});

describe("computeWeakConcepts", () => {
  it("ranks concepts by worst state and session frequency", () => {
    const weak = computeWeakConcepts([
      session({
        session_id: "s1",
        topic: "A",
        coverage_nodes: [
          { id: "x", name: "Entanglement", state: "vague" },
          { id: "y", name: "Qubits", state: "solid" },
        ],
      }),
      session({
        session_id: "s2",
        topic: "B",
        coverage_nodes: [
          { id: "x", name: "Entanglement", state: "wrong" },
          { id: "z", name: "Decoherence", state: "dodged" },
        ],
      }),
      session({
        session_id: "s3",
        topic: "C",
        coverage_nodes: [{ id: "z", name: "Decoherence", state: "vague" }],
      }),
    ]);

    expect(weak[0]?.name).toBe("Entanglement");
    expect(weak[0]?.worstState).toBe("wrong");
    expect(weak[0]?.sessionCount).toBe(2);
    expect(weak.map((item) => item.name)).toContain("Decoherence");
    expect(weak.find((item) => item.name === "Qubits")).toBeUndefined();
  });

  it("ignores solid and touched concepts", () => {
    expect(
      computeWeakConcepts([
        session({
          session_id: "s1",
          topic: "A",
          coverage_nodes: [
            { id: "a", name: "Solid topic", state: "solid" },
            { id: "b", name: "Mentioned", state: "touched" },
          ],
        }),
      ])
    ).toEqual([]);
  });
});

describe("computeAnalyticsStats", () => {
  it("combines profile stats with analytics-specific aggregates", () => {
    const stats = computeAnalyticsStats([
      session({
        session_id: "s1",
        topic: "Photosynthesis",
        score: 88,
        ended_at: 1_000,
      }),
      session({
        session_id: "s2",
        topic: "Gravity",
        score: 75,
        ended_at: 2_000,
        student: "elena",
        coverage_nodes: [{ id: "g", name: "Orbits", state: "wrong" }],
      }),
    ]);

    expect(stats.overview.totalSessions).toBe(2);
    expect(stats.scoreTrend).toHaveLength(2);
    expect(stats.weakConcepts[0]?.name).toBe("Orbits");
    expect(stats.sessions).toHaveLength(2);
  });

  it("handles empty session list", () => {
    const stats = computeAnalyticsStats([]);

    expect(stats.overview.avgScore).toBeNull();
    expect(stats.scoreTrend).toEqual([]);
    expect(stats.weakConcepts).toEqual([]);
    expect(stats.attention).toEqual([]);
  });
});
