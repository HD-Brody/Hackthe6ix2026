import type { NodeState } from "@/lib/types";

export interface CoverageNode {
  id: string;
  name: string;
  state: NodeState;
}

export interface ComprehensionStats {
  total: number;
  discussed: number;
  unexplored: number;
  solid: number;
  vague: number;
  wrong: number;
  dodged: number;
  touched: number;
  /** Weighted score among discussed concepts only (0–100), or null if none discussed. */
  score: number | null;
  /** discussed / total as 0–100 */
  coveragePct: number;
  discussedNodes: CoverageNode[];
  unexploredNodes: CoverageNode[];
}

const STATE_WEIGHT: Record<NodeState, number> = {
  solid: 100,
  vague: 50,
  touched: 25,
  wrong: 0,
  dodged: 0,
  unvisited: 0,
};

/** Gaps = wrong + dodged; shaky = vague + touched */
export function countBreakdown(stats: ComprehensionStats) {
  return {
    gaps: stats.wrong + stats.dodged,
    shaky: stats.vague + stats.touched,
  };
}

/** e.g. "3 solid · 2 shaky · 1 gap" */
export function formatBreakdown(stats: ComprehensionStats): string {
  const { gaps, shaky } = countBreakdown(stats);
  const parts: string[] = [];
  if (stats.solid > 0) parts.push(`${stats.solid} solid`);
  if (shaky > 0) parts.push(`${shaky} shaky`);
  if (gaps > 0) parts.push(`${gaps} gap${gaps === 1 ? "" : "s"}`);
  if (parts.length === 0) return "no concepts explored yet";
  return parts.join(" · ");
}

export function computeComprehensionStats(
  nodes: Pick<CoverageNode, "id" | "name" | "state">[]
): ComprehensionStats {
  const discussedNodes = nodes.filter((n) => n.state !== "unvisited");
  const unexploredNodes = nodes.filter((n) => n.state === "unvisited");

  const solid = discussedNodes.filter((n) => n.state === "solid").length;
  const vague = discussedNodes.filter((n) => n.state === "vague").length;
  const wrong = discussedNodes.filter((n) => n.state === "wrong").length;
  const dodged = discussedNodes.filter((n) => n.state === "dodged").length;
  const touched = discussedNodes.filter((n) => n.state === "touched").length;

  const discussed = discussedNodes.length;
  const total = nodes.length;

  const weightedSum = discussedNodes.reduce(
    (sum, n) => sum + STATE_WEIGHT[n.state],
    0
  );
  const score =
    discussed > 0 ? Math.round(weightedSum / discussed) : null;

  return {
    total,
    discussed,
    unexplored: unexploredNodes.length,
    solid,
    vague,
    wrong,
    dodged,
    touched,
    score,
    coveragePct: total > 0 ? Math.round((discussed / total) * 100) : 0,
    discussedNodes,
    unexploredNodes,
  };
}

/** Red-ink letter grade for stamps and library chips. */
export function letterGrade(score: number | null): string {
  if (score === null) return "\u2014";
  if (score >= 93) return "A+";
  if (score >= 85) return "A";
  if (score >= 77) return "B+";
  if (score >= 68) return "B";
  if (score >= 58) return "C+";
  if (score >= 45) return "C";
  return "D";
}
