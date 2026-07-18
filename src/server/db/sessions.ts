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
} from "@/lib/types";

async function sessions() {
  return (await getDb()).collection<Session>("sessions");
}

export async function createSession(
  userId: string,
  topic: string,
  graph: ConceptGraph
): Promise<Session> {
  const session: Session = {
    _id: randomUUID(),
    user_id: userId,
    topic,
    status: "created",
    graph,
    utterances: [],
    started_at: Date.now(),
  };
  await (await sessions()).insertOne(session);
  return session;
}

export async function getSession(id: string): Promise<Session | null> {
  return (await sessions()).findOne({ _id: id });
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
 * Test-and-set turn lock. Returns false if another turn is in progress.
 * Steals locks older than TURN_LOCK_STALE_MS before attempting acquire.
 */
export async function acquireTurnLock(sessionId: string): Promise<boolean> {
  const col = await sessions();
  const now = Date.now();

  await col.updateOne(
    {
      _id: sessionId,
      turn_in_progress: true,
      turn_lock_at: { $lt: now - TURN_LOCK_STALE_MS },
    },
    { $set: { turn_in_progress: false }, $unset: { turn_lock_at: "" } }
  );

  const res = await col.findOneAndUpdate(
    {
      _id: sessionId,
      $or: [
        { turn_in_progress: { $ne: true } },
        { turn_in_progress: { $exists: false } },
      ],
    },
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
