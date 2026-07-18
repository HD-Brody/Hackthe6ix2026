/**
 * Shared types — mirrors /contracts/*.schema.json (the CP0 contracts).
 *
 * FROZEN at CP0. Changing anything here requires all four to agree.
 * If you need a new field, add it as optional and announce it in the group chat.
 */

// ── Concept graph (contracts/concept-graph.schema.json) ─────────

export type NodeState =
  | "unvisited"
  | "touched"
  | "vague"
  | "solid"
  | "wrong"
  | "dodged";

export type ProbeAngle = "ask-example" | "ask-why" | "ask-edge-case";

export interface ConceptNode {
  id: string;
  name: string;
  /** One-sentence ground truth. Only the Evaluator ever sees this. */
  truth: string;
  difficulty: 1 | 2 | 3;
  prereqs: string[];
  probes: ProbeAngle[];
  state: NodeState;
  vague_quotes: string[];
}

export interface ConceptGraph {
  topic: string;
  nodes: ConceptNode[];
}

// ── Evaluator verdict (contracts/verdict.schema.json) ───────────

export type VerdictLabel = "solid" | "vague" | "wrong" | "dodged";

/** The ONLY vocabulary A's policy and B's prompts share. */
export type DirectiveType = "PROBE" | "DEEPEN" | "ADVANCE" | "WRAP_UP";

export interface Directive {
  type: DirectiveType;
  node_id?: string;
}

export interface NodeVerdict {
  node_id: string;
  verdict: VerdictLabel;
  /** VERBATIM from the user — never paraphrased. */
  quote?: string;
}

export interface Verdict {
  nodes_touched: string[];
  verdicts: NodeVerdict[];
  recommended_directive: Directive;
}

// ── Gap map (contracts/gap-map.schema.json) ─────────────────────

export interface VagueMoment {
  quote: string;
  node_id: string;
}

export interface GapMap {
  topic: string;
  nodes: Pick<ConceptNode, "id" | "name" | "state">[];
  vaguest_moments: VagueMoment[];
  dodged_questions: string[];
  reteach_order: string[];
  one_liner: string;
}

// ── Session (data model, design doc §4) ─────────────────────────

export type SessionStatus = "created" | "teaching" | "wrapping" | "ended";

export interface Utterance {
  role: "user" | "student";
  text: string;
  ts: number;
  eval?: Verdict;
}

/** Turn-policy counters — persisted on the session so they survive restarts. */
export interface PolicyState {
  probeCounts: Record<string, number>;
  deepened: Record<string, boolean>;
}

export interface Session {
  _id: string;
  user_id: string;
  topic: string;
  status: SessionStatus;
  graph: ConceptGraph;
  utterances: Utterance[];
  gap_map?: GapMap;
  /** Turn-policy state (probe counts, deepened flags). Optional — added post-CP0. */
  policy?: PolicyState;
  /**
   * Directive computed at end of turn N, spoken at start of turn N+1 (parallel eval).
   * Optional — added post-CP0 for A3 crash/serverless safety.
   */
  pending_directive?: Directive;
  /** Mongo test-and-set lock — one turn stream at a time (serverless-safe). */
  turn_in_progress?: boolean;
  /** When the turn lock was acquired; stale after ~60s. */
  turn_lock_at?: number;
  started_at: number;
  ended_at?: number;
  /** Per-stage timing (A, Block A3) — D's CP4 latency report reads from this. */
  timings?: TurnTiming[];
}

export interface TurnTiming {
  turn: number;
  stt_end_to_first_token_ms?: number;
  first_token_to_first_audio_ms?: number;
  eval_ms?: number;
  policy_ms?: number;
  /** Time from policy done to persona's first streamed token (sequential mode). */
  persona_first_token_ms?: number;
  /** Request received to persona's first token — use for sequential vs parallel A/B. */
  perceived_first_token_ms?: number;
  /** Request received to persona stream complete (server-side). */
  total_ms?: number;
  mode?: "sequential" | "parallel";
}

// ── SSE events (contracts/api.md) ───────────────────────────────

export type TurnSSEEvent =
  | { event: "token"; data: { text: string } }
  | {
      event: "done";
      data: {
        verdict: Verdict;
        session_status: SessionStatus;
        /** Policy output for this turn (optional — added post-CP0 for debugging/C). */
        directive?: Directive;
        /** Per-stage timing (optional — added post-CP0 for D's latency work). */
        timing?: TurnTiming;
      };
    }
  | { event: "error"; data: { message: string; fallback_line: string } };
