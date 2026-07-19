/**
 * Turn policy — pure function, no LLM. Owner: A (Block A2, step 8).
 *
 * v1 rules, in priority order:
 *   1. Pick one thread when a verdict touches multiple nodes (rambler case):
 *      wrong > vague > solid, tie-break lowest prereq depth (foundations first),
 *      then graph order.
 *   2. wrong behaves like vague for probing (probe up to probeThreshold, then advance).
 *   3. vague/wrong and probeCounts[node] < probeThreshold → PROBE(node). Caller increments count.
 *   4. Probed probeThreshold times already → ADVANCE to nextAdvanceTarget(graph).
 *   5. solid and !deepened[node] → DEEPEN(node). Caller sets flag. Already deepened → ADVANCE.
 *   6. nextAdvanceTarget null → WRAP_UP.
 *   7. Nothing actionable (empty verdicts / dodge-only / derail) → ADVANCE,
 *      UNLESS the user has now dead-ended STALL_LIMIT turns in a row (closed
 *      "yup"/"no", nothing left to add) → WRAP_UP. Never honor recommended
 *      PROBE/DEEPEN on an empty turn — that creates probe loops after
 *      off-topic chatter.
 *
 * Cheap to test, expensive to debug live — keep turnPolicy.test.ts green.
 */

import type {
  ConceptGraph,
  Verdict,
  Directive,
  PolicyState,
  NodeVerdict,
  NodeState,
} from "@/lib/types";

export type { PolicyState };

export interface TurnPolicyOptions {
  /** Max PROBE attempts per node on vague/wrong (default 2 = medium curiosity). */
  probeThreshold?: number;
}

const DEFAULT_PROBE_THRESHOLD = 2;

/**
 * Consecutive dead-end turns (this one included) that trigger wind-down.
 * 2 = one "yup" still earns a fresh question (ADVANCE to a new concept); a
 * second dead-end in a row means the user is done → WRAP_UP.
 */
export const STALL_LIMIT = 2;

const VERDICT_PRIORITY: Record<"wrong" | "vague" | "solid", number> = {
  wrong: 3,
  vague: 2,
  solid: 1,
};

const TERMINAL_STATES: NodeState[] = ["solid", "vague", "wrong", "dodged"];

function isTerminal(state: NodeState): boolean {
  return TERMINAL_STATES.includes(state);
}

function prereqDepth(graph: ConceptGraph, nodeId: string): number {
  const memo = new Map<string, number>();
  function depth(id: string): number {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const node = graph.nodes.find((n) => n.id === id);
    if (!node || node.prereqs.length === 0) {
      memo.set(id, 0);
      return 0;
    }
    const d = 1 + Math.max(...node.prereqs.map((p) => depth(p)));
    memo.set(id, d);
    return d;
  }
  return depth(nodeId);
}

/** Pick the single node thread to act on when the evaluator touched several. */
function pickPrimaryVerdict(
  graph: ConceptGraph,
  verdicts: NodeVerdict[]
): NodeVerdict | null {
  const actionable = verdicts.filter(
    (v): v is NodeVerdict & { verdict: keyof typeof VERDICT_PRIORITY } =>
      v.verdict in VERDICT_PRIORITY
  );
  if (actionable.length === 0) return null;

  return [...actionable].sort((a, b) => {
    const byPriority = VERDICT_PRIORITY[b.verdict] - VERDICT_PRIORITY[a.verdict];
    if (byPriority !== 0) return byPriority;
    const depthDiff = prereqDepth(graph, a.node_id) - prereqDepth(graph, b.node_id);
    if (depthDiff !== 0) return depthDiff;
    return (
      graph.nodes.findIndex((n) => n.id === a.node_id) -
      graph.nodes.findIndex((n) => n.id === b.node_id)
    );
  })[0];
}

function isValidRecommended(directive: Directive): boolean {
  if (directive.type === "WRAP_UP" || directive.type === "ADVANCE") return true;
  if (directive.type === "PROBE" || directive.type === "DEEPEN") {
    return !!directive.node_id;
  }
  return false;
}

/** First graph-order node ready to teach next. */
export function nextAdvanceTarget(graph: ConceptGraph): string | null {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const node of graph.nodes) {
    if (node.state !== "unvisited" && node.state !== "touched") continue;
    const prereqsMet = node.prereqs.every((pid) => {
      const prereq = byId.get(pid);
      return prereq !== undefined && isTerminal(prereq.state);
    });
    if (prereqsMet) return node.id;
  }
  return null;
}

function advanceDirective(graph: ConceptGraph): Directive {
  const target = nextAdvanceTarget(graph);
  if (!target) return { type: "WRAP_UP" };
  return { type: "ADVANCE", node_id: target };
}

export function turnPolicy(
  graph: ConceptGraph,
  verdict: Verdict,
  state: PolicyState,
  opts: TurnPolicyOptions = {}
): Directive {
  const probeThreshold = opts.probeThreshold ?? DEFAULT_PROBE_THRESHOLD;

  // WRAP_UP is categorical, unlike PROBE/DEEPEN/ADVANCE recommendations below:
  // it only ever means "the user is done" — either the graph is fully
  // covered, or (evaluator.prompt.ts) they explicitly said they're finished
  // teaching. An "I'm done teaching" utterance never touches a concept node,
  // so verdicts/nodes_touched will always be empty for exactly the case this
  // needs to catch — always honor it, even on an otherwise-empty turn.
  if (verdict.recommended_directive?.type === "WRAP_UP") {
    return { type: "WRAP_UP" };
  }

  const primary = pickPrimaryVerdict(graph, verdict.verdicts);

  if (!primary) {
    // Empty / dodge-only / derail: never chase a PROBE/DEEPEN recommendation —
    // the user didn't actually teach anything this turn. Steer back with
    // ADVANCE — unless they've now dead-ended STALL_LIMIT turns running, which
    // means they're out of things to say → wind the lesson down.
    const onlyDodged =
      verdict.verdicts.length > 0 &&
      verdict.verdicts.every((v) => v.verdict === "dodged");
    if (verdict.verdicts.length === 0 || onlyDodged) {
      if ((state.stalledTurns ?? 0) + 1 >= STALL_LIMIT) {
        return { type: "WRAP_UP" };
      }
      return advanceDirective(graph);
    }

    const rec = verdict.recommended_directive;
    if (rec && isValidRecommended(rec)) {
      if (rec.type === "PROBE" || rec.type === "DEEPEN") {
        return advanceDirective(graph);
      }
      if (rec.type === "ADVANCE" && !rec.node_id) {
        return advanceDirective(graph);
      }
      return rec;
    }
    return advanceDirective(graph);
  }

  const { node_id, verdict: label } = primary;
  const probeCount = state.probeCounts[node_id] ?? 0;

  if (label === "vague" || label === "wrong") {
    if (probeCount < probeThreshold) {
      return { type: "PROBE", node_id };
    }
    // Hit probe cap and still a mess — leave it terminal, move on (don't loop).
    return advanceDirective(graph);
  }

  if (label === "solid") {
    if (!state.deepened[node_id]) {
      return { type: "DEEPEN", node_id };
    }
    return advanceDirective(graph);
  }

  return advanceDirective(graph);
}
