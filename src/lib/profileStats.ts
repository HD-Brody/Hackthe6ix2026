import type { ComprehensionStats } from "./comprehension";
import { formatBreakdown } from "./comprehension";
import type { StudentId } from "./studentProfiles";
import type { SessionSummary } from "../server/db/sessions";

export type AttentionKind = "in_progress" | "needs_feedback" | "low_score";

export interface AttentionItem {
  kind: AttentionKind;
  session_id: string;
  topic: string;
  student: StudentId;
  href: string;
  label: string;
}

export interface StudentStats {
  student: StudentId;
  sessionCount: number;
  avgScore: number | null;
  lastSession: SessionSummary | null;
}

export interface ProfileOverview {
  totalSessions: number;
  completedCount: number;
  inProgressCount: number;
  totalDiscussed: number;
  completionRate: number;
  totalDurationMs: number;
  avgScore: number | null;
  avgRating: number | null;
  aggregate: ComprehensionStats;
  aggregateBreakdown: string;
}

export interface ProfileStats {
  overview: ProfileOverview;
  byStudent: Record<StudentId, StudentStats>;
  attention: AttentionItem[];
  latestInsight: string | null;
  diaryEntries: SessionSummary[];
  resumeSession: SessionSummary | null;
}

function studentParam(session: SessionSummary): StudentId {
  return session.student ?? "sam";
}

function classroomHref(session: SessionSummary): string {
  const student = studentParam(session);
  return `/session/${encodeURIComponent(session.session_id)}?student=${student}`;
}

function reportHref(session: SessionSummary): string {
  const student = studentParam(session);
  return `/session/${encodeURIComponent(session.session_id)}/report?student=${student}`;
}

function feedbackHref(session: SessionSummary): string {
  const student = studentParam(session);
  return `/session/${encodeURIComponent(session.session_id)}/feedback?student=${student}`;
}

function sessionHref(session: SessionSummary): string {
  if (session.status !== "ended") return classroomHref(session);
  if (session.has_gap_map) return reportHref(session);
  return classroomHref(session);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

function aggregateComprehension(sessions: SessionSummary[]): ComprehensionStats {
  let solid = 0;
  let vague = 0;
  let wrong = 0;
  let dodged = 0;
  let touched = 0;
  let discussed = 0;
  let total = 0;
  const discussedNodes = sessions.flatMap((session) => session.coverage_nodes);
  const unexploredNodes: ComprehensionStats["unexploredNodes"] = [];

  for (const session of sessions) {
    solid += session.solid;
    vague += session.vague;
    wrong += session.wrong;
    dodged += session.dodged;
    touched += session.touched;
    discussed += session.discussed;
    total += session.total;
  }

  const weightedSum =
    solid * 100 + vague * 50 + touched * 25 + wrong * 0 + dodged * 0;
  const score = discussed > 0 ? Math.round(weightedSum / discussed) : null;
  const coveragePct = total > 0 ? Math.round((discussed / total) * 100) : 0;

  return {
    total,
    discussed,
    unexplored: Math.max(total - discussed, 0),
    solid,
    vague,
    wrong,
    dodged,
    touched,
    score,
    coveragePct,
    discussedNodes,
    unexploredNodes,
  };
}

function buildStudentStats(
  sessions: SessionSummary[],
  student: StudentId
): StudentStats {
  const studentSessions = sessions.filter(
    (session) => (session.student ?? "sam") === student
  );
  const scored = studentSessions
    .map((session) => session.score)
    .filter((score): score is number => score !== null);

  return {
    student,
    sessionCount: studentSessions.length,
    avgScore: average(scored),
    lastSession: studentSessions[0] ?? null,
  };
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatRelativeDate(timestamp: number, now = Date.now()): string {
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function computeProfileStats(
  sessions: SessionSummary[]
): ProfileStats {
  const completed = sessions.filter((session) => session.status === "ended");
  const scoredSessions = completed.filter((session) => session.score !== null);
  const ratedSessions = sessions.filter((session) => session.feedback_rating);
  const aggregate = aggregateComprehension(sessions);
  const totalDurationMs = completed.reduce(
    (sum, session) => sum + (session.duration_ms ?? 0),
    0
  );

  const attention: AttentionItem[] = [];

  for (const session of sessions) {
    const student = studentParam(session);
    if (session.status !== "ended") {
      attention.push({
        kind: "in_progress",
        session_id: session.session_id,
        topic: session.topic,
        student,
        href: classroomHref(session),
        label: "Resume classroom",
      });
      continue;
    }

    if (session.has_gap_map && !session.feedback_rating) {
      attention.push({
        kind: "needs_feedback",
        session_id: session.session_id,
        topic: session.topic,
        student,
        href: feedbackHref(session),
        label: "Rate session clarity",
      });
    }

    if (
      session.has_gap_map &&
      session.score !== null &&
      session.score < 60
    ) {
      attention.push({
        kind: "low_score",
        session_id: session.session_id,
        topic: session.topic,
        student,
        href: reportHref(session),
        label: "Review understanding gaps",
      });
    }
  }

  const diaryEntries = sessions
    .filter((session) => session.feedback_rating)
    .sort((a, b) => (b.feedback_ts ?? 0) - (a.feedback_ts ?? 0))
    .slice(0, 5);

  const latestInsight =
    [...sessions]
      .filter((session) => session.one_liner)
      .sort((a, b) => b.started_at - a.started_at)[0]?.one_liner ?? null;

  const resumeSession =
    sessions.find((session) => session.status !== "ended") ?? null;

  return {
    overview: {
      totalSessions: sessions.length,
      completedCount: completed.length,
      inProgressCount: sessions.length - completed.length,
      totalDiscussed: sessions.reduce(
        (sum, session) => sum + session.discussed,
        0
      ),
      completionRate:
        sessions.length > 0
          ? Math.round((completed.length / sessions.length) * 100)
          : 0,
      totalDurationMs,
      avgScore: average(
        scoredSessions
          .map((session) => session.score)
          .filter((score): score is number => score !== null)
      ),
      avgRating: average(
        ratedSessions
          .map((session) => session.feedback_rating)
          .filter((rating): rating is number => rating !== undefined)
      ),
      aggregate,
      aggregateBreakdown: formatBreakdown(aggregate),
    },
    byStudent: {
      sam: buildStudentStats(sessions, "sam"),
      elena: buildStudentStats(sessions, "elena"),
    },
    attention,
    latestInsight,
    diaryEntries,
    resumeSession,
  };
}

export function sessionLink(session: SessionSummary): string {
  return sessionHref(session);
}
