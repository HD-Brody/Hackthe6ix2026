import { randomUUID } from "crypto";
import { getDb } from "./mongo";
import type {
  Session,
  Utterance,
  Verdict,
  ConceptGraph,
  PolicyState,
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
