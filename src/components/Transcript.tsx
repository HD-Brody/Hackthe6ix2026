/**
 * Transcript pane — user right, student left. Owner: C (Block C1 step 3).
 * Streams in tokens via consumeTurnStream (src/lib/sse.ts) in C2.
 */

"use client";

import type { Utterance } from "@/lib/types";

export function Transcript({ utterances }: { utterances: Utterance[] }) {
  // TODO(C)
  return <div>{utterances.length} utterances</div>;
}
