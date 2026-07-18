/**
 * SSE helpers — shared by A (server: writing the stream) and C/D (client:
 * consuming it). Event format is defined in contracts/api.md.
 *
 * Owner: A writes the server half; C writes the client half. Coordinate once
 * at hour 4, then diverge.
 */

import type { TurnSSEEvent, Verdict, SessionStatus, Directive } from "./types";

/** Server: format one SSE event for a ReadableStream. */
export function formatSSE(event: TurnSSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/** Client: consume the turn endpoint's SSE stream. */
export async function* consumeTurnStream(
  response: Response
): AsyncGenerator<TurnSSEEvent> {
  if (!response.body) throw new Error("no response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseSseBlock(block);
      if (event) yield event;
    }
  }
}

function parseSseBlock(block: string): TurnSSEEvent | null {
  let eventType = "";
  let dataLine = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) eventType = line.slice(7).trim();
    if (line.startsWith("data: ")) dataLine = line.slice(6);
  }
  if (!eventType || !dataLine) return null;

  const data = JSON.parse(dataLine) as TurnSSEEvent["data"];
  if (eventType === "token") {
    return { event: "token", data: data as { text: string } };
  }
  if (eventType === "done") {
    return {
      event: "done",
      data: data as {
        verdict: Verdict;
        session_status: SessionStatus;
        directive?: Directive;
      },
    };
  }
  if (eventType === "error") {
    return {
      event: "error",
      data: data as { message: string; fallback_line: string },
    };
  }
  return null;
}
