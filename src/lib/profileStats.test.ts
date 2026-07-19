import { describe, it, expect } from "vitest";
import {
  computeProfileStats,
  formatDuration,
  formatRelativeDate,
  sessionLink,
} from "./profileStats";
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
    score: overrides.score ?? 83,
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

describe("computeProfileStats", () => {
  it("aggregates overview metrics across sessions", () => {
    const stats = computeProfileStats([
      session({
        session_id: "s1",
        topic: "Photosynthesis",
        discussed: 4,
        solid: 3,
        vague: 1,
        score: 88,
        duration_ms: 1_200_000,
      }),
      session({
        session_id: "s2",
        topic: "Gravity",
        discussed: 2,
        solid: 1,
        vague: 1,
        score: 75,
        duration_ms: 900_000,
        student: "elena",
      }),
    ]);

    expect(stats.overview.totalSessions).toBe(2);
    expect(stats.overview.completedCount).toBe(2);
    expect(stats.overview.totalDiscussed).toBe(6);
    expect(stats.overview.completionRate).toBe(100);
    expect(stats.overview.totalDurationMs).toBe(2_100_000);
    expect(stats.overview.avgScore).toBe(82);
    expect(stats.overview.aggregate.solid).toBe(4);
    expect(stats.overview.aggregateBreakdown).toContain("solid");
  });

  it("builds per-student stats", () => {
    const stats = computeProfileStats([
      session({ session_id: "s1", topic: "A", student: "sam", score: 80 }),
      session({ session_id: "s2", topic: "B", student: "elena", score: 60 }),
      session({ session_id: "s3", topic: "C", student: "elena", score: 40 }),
    ]);

    expect(stats.byStudent.sam.sessionCount).toBe(1);
    expect(stats.byStudent.sam.avgScore).toBe(80);
    expect(stats.byStudent.elena.sessionCount).toBe(2);
    expect(stats.byStudent.elena.avgScore).toBe(50);
  });

  it("flags attention items for in-progress, feedback, and low score", () => {
    const stats = computeProfileStats([
      session({
        session_id: "active",
        topic: "Active",
        status: "teaching",
        has_gap_map: false,
        ended_at: undefined,
      }),
      session({
        session_id: "feedback",
        topic: "Needs rating",
        feedback_rating: undefined,
      }),
      session({
        session_id: "weak",
        topic: "Weak lesson",
        score: 42,
        feedback_rating: 3,
      }),
    ]);

    expect(stats.attention.map((item) => item.kind)).toEqual([
      "in_progress",
      "needs_feedback",
      "low_score",
    ]);
    expect(stats.resumeSession?.session_id).toBe("active");
  });

  it("collects diary entries and latest insight", () => {
    const now = Date.now();
    const stats = computeProfileStats([
      session({
        session_id: "s1",
        topic: "Older",
        one_liner: "Older insight",
        feedback_rating: 4,
        feedback_ts: now - 10_000,
        started_at: now - 20_000,
      }),
      session({
        session_id: "s2",
        topic: "Newer",
        one_liner: "Fresh insight",
        feedback_rating: 5,
        feedback_ts: now,
        started_at: now - 5_000,
      }),
    ]);

    expect(stats.latestInsight).toBe("Fresh insight");
    expect(stats.diaryEntries).toHaveLength(2);
    expect(stats.diaryEntries[0]?.session_id).toBe("s2");
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45 * 60_000)).toBe("45m");
    expect(formatDuration(90 * 60_000)).toBe("1h 30m");
    expect(formatDuration(120 * 60_000)).toBe("2h");
  });
});

describe("formatRelativeDate", () => {
  it("formats recent dates", () => {
    const now = Date.UTC(2026, 6, 18, 12, 0, 0);
    expect(formatRelativeDate(now, now)).toBe("Today");
    expect(formatRelativeDate(now - 86_400_000, now)).toBe("Yesterday");
    expect(formatRelativeDate(now - 3 * 86_400_000, now)).toBe("3 days ago");
  });
});

describe("sessionLink", () => {
  it("routes active sessions to classroom and completed to report", () => {
    expect(
      sessionLink(
        session({
          session_id: "active",
          topic: "Live",
          status: "teaching",
          has_gap_map: false,
        })
      )
    ).toBe("/session/active?student=sam");

    expect(
      sessionLink(
        session({
          session_id: "done",
          topic: "Done",
          status: "ended",
          has_gap_map: true,
        })
      )
    ).toBe("/session/done/report?student=sam");
  });
});
