/**
 * POST /api/session  {topic} → {session_id, graph}
 *
 * Owner: A (Block A1 step 2, A2 step 6)
 * - Five demo topics → B's vetted graphs in fixtures/graphs/
 * - Unknown topics → generateGraph(topic) with retry, TCP cache on total failure
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  MAX_SESSIONS_PER_USER,
  SessionCapError,
} from "@/server/db/sessions";
import { resolveGraph } from "@/server/orchestrator/resolveGraph";
import { transition } from "@/server/orchestrator/stateMachine";
import { getUserId } from "@/lib/auth0";
import { parseCuriosityLevel } from "@/lib/curiosity";
import { parseStudentId } from "@/lib/studentProfiles";
import { truncateNotes } from "@/llm/extractTopics";

export async function POST(req: NextRequest) {
  let body: {
    topic?: string;
    student?: string;
    curiosity?: string;
    source_notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const topic = body.topic?.trim();
  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const sourceNotes = body.source_notes?.trim()
    ? truncateNotes(body.source_notes.trim())
    : undefined;

  const graph = await resolveGraph(topic, sourceNotes);
  const student = parseStudentId(body.student);
  const curiosity = parseCuriosityLevel(body.curiosity);
  // Auth0 sub when logged in; anonymous "dev" pool otherwise (demo-safe).
  const userId = await getUserId();

  let session;
  try {
    session = await createSession(
      userId,
      topic,
      graph,
      student,
      curiosity,
      sourceNotes
    );
  } catch (err) {
    if (err instanceof SessionCapError) {
      return NextResponse.json(
        {
          error: err.code,
          message: err.message,
          limit: MAX_SESSIONS_PER_USER,
          current: err.count,
        },
        { status: 429 }
      );
    }
    throw err;
  }

  await transition(session._id, "created", "teaching");

  return NextResponse.json({ session_id: session._id, graph: session.graph });
}
