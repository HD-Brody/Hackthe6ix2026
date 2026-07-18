/**
 * Crash-safety drill — demo insurance (A3 step 3).
 *
 * Run (server must be up with ECHO_MODE=false, LLM_MOCK=true):
 *   npm run crash-drill
 *
 * Simulates kill -9 mid-stream: two complete turns, then a stuck lock with
 * an orphaned user utterance (post-kill state). Verifies recovery via HTTP.
 */

import { consumeTurnStream } from "../src/lib/sse";
import { getDb } from "../src/server/db/mongo";
import { hasOrphanedUserTurn } from "../src/server/db/sessions";
import { collectGapMapMaterials } from "../src/server/orchestrator/gapMapMaterials";
import type { Session, TurnSSEEvent } from "../src/lib/types";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

async function createSession(): Promise<string> {
  const res = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "TCP congestion control" }),
  });
  if (!res.ok) throw new Error(`create session failed: ${res.status}`);
  const { session_id } = await res.json();
  return session_id;
}

async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/session/${id}`);
  if (!res.ok) throw new Error(`get session failed: ${res.status}`);
  return res.json();
}

async function postTurn(
  sessionId: string,
  userText: string
): Promise<{ events: TurnSSEEvent[]; studentText: string }> {
  const res = await fetch(`${BASE}/api/session/${sessionId}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_text: userText }),
  });
  if (res.status === 409) {
    throw new Error("turn already in progress (409)");
  }
  if (!res.ok) throw new Error(`turn failed: ${res.status} ${await res.text()}`);

  const events: TurnSSEEvent[] = [];
  let studentText = "";
  for await (const event of consumeTurnStream(res)) {
    events.push(event);
    if (event.event === "token") studentText += event.data.text;
  }
  return { events, studentText };
}

async function simulateKillMidStream(
  sessionId: string,
  orphanedUserText: string
): Promise<void> {
  const db = await getDb();
  const col = db.collection<Session>("sessions");
  const now = Date.now();

  await col.updateOne(
    { _id: sessionId },
    {
      $push: {
        utterances: { role: "user", text: orphanedUserText, ts: now },
      },
      $set: { turn_in_progress: true, turn_lock_at: now },
    }
  );
}

async function main(): Promise<void> {
  console.log(`\n=== Crash-safety drill @ ${BASE} ===\n`);

  if (process.env.ECHO_MODE === "true") {
    console.error("Set ECHO_MODE=false for crash drill.");
    process.exit(1);
  }

  let failures = 0;
  const sessionId = await createSession();
  log("✓", `session ${sessionId} created`);

  await postTurn(sessionId, "During slow start the window doubles every RTT.");
  await postTurn(sessionId, "It speeds up until congestion is detected.");
  log("✓", "2 complete turns");

  const beforeCrash = await getSession(sessionId);
  const utteranceCountBefore = beforeCrash.utterances.length;

  const orphanedText = "This utterance was mid-stream when the server died.";
  await simulateKillMidStream(sessionId, orphanedText);
  log("✓", "simulated kill -9 mid-stream (orphaned user + stuck lock)");

  const afterCrash = await getSession(sessionId);
  if (afterCrash.utterances.length !== utteranceCountBefore + 1) {
    log("✗", `expected ${utteranceCountBefore + 1} utterances after crash, got ${afterCrash.utterances.length}`);
    failures++;
  } else {
    log("✓", "GET /session — transcript includes orphaned user utterance");
  }

  const last = afterCrash.utterances[afterCrash.utterances.length - 1];
  if (last.role !== "user" || last.text !== orphanedText) {
    log("✗", "orphaned user utterance missing or wrong");
    failures++;
  } else {
    log("✓", "last utterance is the killed turn's user text (pre-stream persist)");
  }

  if (!hasOrphanedUserTurn(afterCrash.utterances)) {
    log("✗", "hasOrphanedUserTurn should be true");
    failures++;
  }

  if (!afterCrash.turn_in_progress) {
    log("✗", "turn_in_progress should be true after simulated crash");
    failures++;
  }

  try {
    const { events } = await postTurn(
      sessionId,
      "Recovery turn after restart."
    );
    const done = events.find((e) => e.event === "done");
    if (!done) {
      log("✗", "recovery turn: no done event");
      failures++;
    } else {
      log("✓", "recovery turn succeeded (orphan lock stolen)");
    }
  } catch (err) {
    log("✗", `recovery turn failed: ${err instanceof Error ? err.message : err}`);
    failures++;
  }

  const recovered = await getSession(sessionId);
  if (recovered.turn_in_progress) {
    log("⚠️", "turn_in_progress still true after completed recovery turn");
  }

  const { quotes, dodged } = collectGapMapMaterials(recovered.graph);
  log("✓", `gap-map materials: ${quotes.length} quote(s), ${dodged.length} dodged`);

  const endRes = await fetch(`${BASE}/api/session/${sessionId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!endRes.ok) {
    log("✗", `POST /end failed: ${endRes.status} ${await endRes.text()}`);
    failures++;
  } else {
    const { gap_map } = await endRes.json();
    log("✓", `POST /end on crashed session → gap_map: "${gap_map.one_liner}"`);
  }

  const ended = await getSession(sessionId);
  if (ended.turn_in_progress) {
    log("✗", "turn_in_progress should be cleared after /end");
    failures++;
  } else {
    log("✓", "stuck lock cleared on /end");
  }

  console.log(`\n=== ${failures === 0 ? "PASS" : `FAIL (${failures})`} ===\n`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
