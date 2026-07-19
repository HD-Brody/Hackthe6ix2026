import type { NodeState } from "@/lib/types";
import type { SessionSummary } from "@/server/db/sessions";
import {
  computeProfileStats,
  type AttentionItem,
  type ProfileOverview,
  type ProfileStats,
  type StudentStats,
} from "./profileStats";

export interface ScoreTrendPoint {
  session_id: string;
  topic: string;
  score: number;
  ended_at: number;
  student: "sam" | "elena";
}

export interface WeakConcept {
  name: string;
  worstState: NodeState;
  sessionCount: number;
  /** Higher = weaker (wrong/dodged rank above vague/touched/solid). */
  weaknessScore: number;
}

export interface AnalyticsStats {
  overview: ProfileOverview;
  attention: AttentionItem[];
  byStudent: Record<"sam" | "elena", StudentStats>;
  latestInsight: string | null;
  scoreTrend: ScoreTrendPoint[];
  weakConcepts: WeakConcept[];
  sessions: SessionSummary[];
}

const STATE_SEVERITY: Record<NodeState, number> = {
  wrong: 5,
  dodged: 4,
  vague: 3,
  touched: 2,
  solid: 1,
  unvisited: 0,
};

const WEAK_STATES = new Set<NodeState>(["wrong", "dodged", "vague"]);

const DEFAULT_TREND_LIMIT = 8;
const DEFAULT_WEAK_CONCEPT_LIMIT = 5;

export function computeScoreTrend(
  sessions: SessionSummary[],
  limit = DEFAULT_TREND_LIMIT
): ScoreTrendPoint[] {
  return sessions
    .filter(
      (session) =>
        session.status === "ended" &&
        session.score !== null &&
        session.ended_at != null
    )
    .sort((a, b) => (a.ended_at ?? 0) - (b.ended_at ?? 0))
    .slice(-limit)
    .map((session) => ({
      session_id: session.session_id,
      topic: session.topic,
      score: session.score as number,
      ended_at: session.ended_at as number,
      student: session.student ?? "sam",
    }));
}

export function computeWeakConcepts(
  sessions: SessionSummary[],
  limit = DEFAULT_WEAK_CONCEPT_LIMIT
): WeakConcept[] {
  const byName = new Map<
    string,
    { worstState: NodeState; sessionIds: Set<string> }
  >();

  for (const session of sessions) {
    for (const node of session.coverage_nodes) {
      if (!WEAK_STATES.has(node.state)) continue;

      const existing = byName.get(node.name);
      if (!existing) {
        byName.set(node.name, {
          worstState: node.state,
          sessionIds: new Set([session.session_id]),
        });
        continue;
      }

      existing.sessionIds.add(session.session_id);
      if (STATE_SEVERITY[node.state] > STATE_SEVERITY[existing.worstState]) {
        existing.worstState = node.state;
      }
    }
  }

  return [...byName.entries()]
    .map(([name, data]) => ({
      name,
      worstState: data.worstState,
      sessionCount: data.sessionIds.size,
      weaknessScore:
        STATE_SEVERITY[data.worstState] * 10 + data.sessionIds.size,
    }))
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, limit);
}

export function computeAnalyticsStats(
  sessions: SessionSummary[]
): AnalyticsStats {
  const profile: ProfileStats = computeProfileStats(sessions);

  return {
    overview: profile.overview,
    attention: profile.attention,
    byStudent: profile.byStudent,
    latestInsight: profile.latestInsight,
    scoreTrend: computeScoreTrend(sessions),
    weakConcepts: computeWeakConcepts(sessions),
    sessions,
  };
}
