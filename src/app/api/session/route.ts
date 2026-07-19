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
  getSession,
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
    session_id?: string;
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

  const student = parseStudentId(body.student);
  const curiosity = parseCuriosityLevel(body.curiosity);

  // resolveGraph and getUserId are fully independent — run them in parallel
  // to save one full round-trip (Auth0 session cookie read + Atlas lookup).
  const [graph, userId] = await Promise.all([
    resolveGraph(topic, sourceNotes),
    getUserId(),
  ]);

  let session;
  try {
    session = await createSession(
      userId,
      topic,
      graph,
      student,
      curiosity,
      sourceNotes,
      body.session_id
    );
  } catch (err: any) {
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
    if (err.code === 11000 && body.session_id) {
      // Handle React Strict Mode race conditions: if another identical request already
      // created this session_id, just return the existing one.
      const existingSession = await getSession(body.session_id);
      if (existingSession) {
        return NextResponse.json({ session_id: existingSession._id, graph: existingSession.graph });
      }
    }
    throw err;
  }

  // Fire the created→teaching transition in the background — the classroom
  // functions correctly regardless of whether this has landed yet, and it
  // saves one extra Atlas round-trip from the hot path before router.push.
  transition(session._id, "created", "teaching").catch((err) => {
    console.error("[session] created→teaching transition failed:", err);
  });

  return NextResponse.json({ session_id: session._id, graph: session.graph });
}

