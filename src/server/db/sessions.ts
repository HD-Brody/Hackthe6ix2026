import { randomUUID } from "crypto";
import { getDb } from "./mongo";
import type { Session, Utterance, Verdict, GapMap, ConceptGraph } from "@/lib/types";

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
