/**
 * SSE helpers — shared by A (server: writing the stream) and C/D (client:
 * consuming it). Event format is defined in contracts/api.md.
 *
 * Owner: A writes the server half; C writes the client half. Coordinate once
 * at hour 4, then diverge.
 */

import type { TurnSSEEvent } from "./types";

/** Server: format one SSE event for a ReadableStream. */
export function formatSSE(event: TurnSSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/** Client: consume the turn endpoint's SSE stream. */
export async function* consumeTurnStream(
  _response: Response
): AsyncGenerator<TurnSSEEvent> {
  // TODO(C, Block C2 step 6): parse the SSE body, yield typed events.
  // D's TTS client consumes the same generator (Block D2 step 5).
  throw new Error("not implemented");
}
