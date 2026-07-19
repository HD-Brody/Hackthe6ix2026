import { randomUUID } from "crypto";
import { getDb } from "./mongo";
import type {
  Session,
  Utterance,
  Verdict,
  ConceptGraph,
  PolicyState,
  GapMap,
  TurnTiming,
  Directive,
  CuriosityLevel,
  StudentId,
  PriorGapContext,
} from "@/lib/types";
import {
  buildPriorGapContext,
  PriorSessionForbiddenError,
  PriorSessionInvalidError,
  PriorSessionNotFoundError,
} from "../reteach/priorGapContext";

async function sessions() {
  return (await getDb()).collection<Session>("sessions");
}

/** Max sessions per user_id — quota insurance (A4). Env-tunable. */
export const MAX_SESSIONS_PER_USER = Number(
  process.env.MAX_SESSIONS_PER_USER ?? "10"
);

export const SESSION_CAP_MESSAGE =
  "You've taught me enough for now — take a break, then come back.";

export function isSessionCapReached(sessionCount: number): boolean {
  return sessionCount >= MAX_SESSIONS_PER_USER;
}

export async function countSessionsForUser(userId: string): Promise<number> {
  return (await sessions()).countDocuments({ user_id: userId });
}

export class SessionCapError extends Error {
  readonly code = "session_cap_reached" as const;
  constructor(
    public readonly userId: string,
    public readonly count: number
  ) {
    super(SESSION_CAP_MESSAGE);
    this.name = "SessionCapError";
  }
}

export async function createSession(
  userId: string,
  topic: string,
  graph: ConceptGraph,
  student: StudentId = "sam",
  curiosity: CuriosityLevel = "medium",
  sourceNotes?: string,
  priorGapContext?: PriorGapContext
): Promise<Session> {
  const count = await countSessionsForUser(userId);
  if (isSessionCapReached(count)) {
    throw new SessionCapError(userId, count);
  }

  const pendingDirective: Directive | undefined =
    priorGapContext && priorGapContext.reteach_order.length > 0
      ? { type: "PROBE", node_id: priorGapContext.reteach_order[0] }
      : undefined;

  const session: Session = {
    _id: randomUUID(),
    user_id: userId,
    topic,
    student,
    curiosity,
    status: "created",
    graph,
    utterances: [],
    started_at: Date.now(),
    ...(sourceNotes?.trim() ? { source_notes: sourceNotes.trim() } : {}),
    ...(priorGapContext ? { prior_gap_context: priorGapContext } : {}),
    ...(pendingDirective ? { pending_directive: pendingDirective } : {}),
  };
  await (await sessions()).insertOne(session);
  return session;
}

export async function getSession(id: string): Promise<Session | null> {
  return (await sessions()).findOne({ _id: id });
}

/** Load and validate a prior session's gap map for re-teach memory. */
export async function loadPriorGapContext(
  priorSessionId: string,
  userId: string
): Promise<{ prior: PriorGapContext; session: Session }> {
  const session = await getSession(priorSessionId);
  if (!session) {
    throw new PriorSessionNotFoundError(priorSessionId);
  }
  if (session.user_id !== userId) {
    throw new PriorSessionForbiddenError();
  }
  if (session.status !== "ended") {
    throw new PriorSessionInvalidError("prior session has not ended yet");
  }
  if (!session.gap_map) {
    throw new PriorSessionInvalidError("prior session has no gap map");
  }

  const prior = buildPriorGapContext(priorSessionId, session.gap_map);
  return { prior, session };
}

export async function appendUtterance(
  sessionId: string,
  utterance: Utterance
): Promise<void> {
  const res = await (await sessions()).updateOne(
    { _id: sessionId },
    { $push: { utterances: utterance } }
  );
  if (res.matchedCount === 0) throw new Error(`session not found: ${sessionId}`);
}

/**
 * Apply an evaluator verdict to the session graph and persist policy counters.
 *
 * Semantics (v1 spec):
 * - For each NodeVerdict: set that node's state to the verdict label.
 *   Latest verdict wins — no downgrade protection (a solid node re-explained
 *   badly should go vague; that's honest).
 * - If the verdict has a quote, push it onto the node's vague_quotes (raw
 *   material for the gap map — never lose one).
 * - Nodes in nodes_touched that have no verdict entry and are currently
 *   unvisited → set to touched.
 * - Persist policy counters in the same write.
 *
 * Read-modify-write: whole graph + policy in one updateOne $set.
 */
export async function applyVerdict(
  sessionId: string,
  verdict: Verdict,
  policy: PolicyState
): Promise<Session> {
  const session = await getSession(sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);

  const graph = applyVerdictToGraph(session.graph, verdict);

  const res = await (await sessions()).updateOne(
    { _id: sessionId },
    { $set: { graph, policy } }
  );
  if (res.matchedCount === 0) throw new Error(`session not found: ${sessionId}`);

  return { ...session, graph, policy };
}

export async function updatePolicy(
  sessionId: string,
  policy: PolicyState
): Promise<void> {
  const res = await (await sessions()).updateOne(
    { _id: sessionId },
    { $set: { policy } }
  );
  if (res.matchedCount === 0) throw new Error(`session not found: ${sessionId}`);
}

/** Locks older than this are treated as stale (crashed stream, stuck demo). */
export const TURN_LOCK_STALE_MS = 60_000;

/**
 * True when the last utterance is user with no following student reply.
 * Happens when the server dies mid-stream after pre-stream user persist.
 */
export function hasOrphanedUserTurn(utterances: Utterance[]): boolean {
  if (utterances.length === 0) return false;
  return utterances[utterances.length - 1].role === "user";
}

/** Mongo filter for atomic lock acquire — exported for unit tests. */
export function buildTurnLockAcquireFilter(
  sessionId: string,
  now: number,
  orphaned: boolean
): {
  _id: string;
  $or: Record<string, unknown>[];
} {
  const or: Record<string, unknown>[] = [
    { turn_in_progress: { $ne: true } },
    { turn_in_progress: { $exists: false } },
    { turn_lock_at: { $lt: now - TURN_LOCK_STALE_MS } },
  ];
  if (orphaned) {
    or.push({ turn_in_progress: true });
  }
  return { _id: sessionId, $or: or };
}

/**
 * Test-and-set turn lock. Returns false if another turn is in progress.
 *
 * Acquires when: not locked, lock is stale (>60s), or orphaned user turn
 * (server died mid-stream after pre-stream user persist).
 */
export async function acquireTurnLock(sessionId: string): Promise<boolean> {
  const col = await sessions();
  const now = Date.now();

  const session = await col.findOne({ _id: sessionId });
  if (!session) return false;

  const orphaned = hasOrphanedUserTurn(session.utterances);

  const res = await col.findOneAndUpdate(
    buildTurnLockAcquireFilter(sessionId, now, orphaned),
    { $set: { turn_in_progress: true, turn_lock_at: now } },
    { returnDocument: "after" }
  );

  return res !== null;
}

export async function releaseTurnLock(sessionId: string): Promise<void> {
  await (await sessions()).updateOne(
    { _id: sessionId },
    { $set: { turn_in_progress: false }, $unset: { turn_lock_at: "" } }
  );
}

export async function pushTurnTiming(
  sessionId: string,
  timing: TurnTiming
): Promise<void> {
  const res = await (await sessions()).updateOne(
    { _id: sessionId },
    { $push: { timings: timing } }
  );
  if (res.matchedCount === 0) throw new Error(`session not found: ${sessionId}`);
}

export async function setPendingDirective(
  sessionId: string,
  directive: Directive
): Promise<void> {
  const res = await (await sessions()).updateOne(
    { _id: sessionId },
    { $set: { pending_directive: directive } }
  );
  if (res.matchedCount === 0) throw new Error(`session not found: ${sessionId}`);
}

/** Max user turns per session — quota insurance (A4). Env-tunable for drills. */
export const MAX_TURNS_PER_SESSION = Number(
  process.env.MAX_TURNS_PER_SESSION ?? "40"
);

export const TURN_CAP_MESSAGE =
  "I think my brain is full — can we wrap up?";

export function countUserTurns(utterances: Utterance[]): number {
  return utterances.filter((u) => u.role === "user").length;
}

export function isTurnCapReached(utterances: Utterance[]): boolean {
  return countUserTurns(utterances) >= MAX_TURNS_PER_SESSION;
}

export async function setGapMap(
  sessionId: string,
  gapMap: GapMap
): Promise<void> {
  const res = await (await sessions()).updateOne(
    { _id: sessionId },
    { $set: { gap_map: gapMap, ended_at: Date.now() } }
  );
  if (res.matchedCount === 0) throw new Error(`session not found: ${sessionId}`);
}

/** Lightweight per-session summary for profile/history views. */
export interface SessionSummary {
  session_id: string;
  topic: string;
  student?: StudentId;
  status: Session["status"];
  started_at: number;
  ended_at?: number;
  solid: number;
  total: number;
  has_gap_map: boolean;
  feedback_rating?: number;
  feedback_comment?: string;
  feedback_ts?: number;
}

export async function listSessionsByUser(
  userId: string,
  limit = 20
): Promise<SessionSummary[]> {
  const docs = await (await sessions())
    .find(
      { user_id: userId },
      {
        projection: {
          _id: 1,
          topic: 1,
          student: 1,
          status: 1,
          started_at: 1,
          ended_at: 1,
          "graph.nodes.state": 1,
          gap_map: 1,
          "feedback.rating": 1,
          "feedback.comment": 1,
          "feedback.ts": 1,
        },
        sort: { started_at: -1 },
        limit,
      }
    )
    .toArray();

  return docs.map((doc) => ({
    session_id: doc._id,
    topic: doc.topic,
    student: doc.student,
    status: doc.status,
    started_at: doc.started_at,
    ended_at: doc.ended_at,
    solid: doc.graph?.nodes?.filter((n) => n.state === "solid").length ?? 0,
    total: doc.graph?.nodes?.length ?? 0,
    has_gap_map: !!doc.gap_map,
    feedback_rating: doc.feedback?.rating,
    feedback_comment: doc.feedback?.comment,
    feedback_ts: doc.feedback?.ts,
  }));
}

export async function setFeedback(
  sessionId: string,
  feedback: NonNullable<Session["feedback"]>
): Promise<void> {
  const res = await (await sessions()).updateOne(
    { _id: sessionId },
    { $set: { feedback } }
  );
  if (res.matchedCount === 0) throw new Error(`session not found: ${sessionId}`);
}

/** Pure graph mutation — exported for unit tests. */
export function applyVerdictToGraph(
  graph: ConceptGraph,
  verdict: Verdict
): ConceptGraph {
  const verdictByNode = new Map(
    verdict.verdicts.map((nv) => [nv.node_id, nv])
  );
  const touched = new Set(verdict.nodes_touched);

  const nodes = graph.nodes.map((node) => {
    const nv = verdictByNode.get(node.id);
    if (nv) {
      return {
        ...node,
        state: nv.verdict,
        vague_quotes: nv.quote
          ? [...node.vague_quotes, nv.quote]
          : node.vague_quotes,
      };
    }
    if (touched.has(node.id) && node.state === "unvisited") {
      return { ...node, state: "touched" as const };
    }
    return node;
  });

  return { ...graph, nodes };
}
