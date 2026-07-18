/**
 * TTS client — ElevenLabs streaming. Owner: D (Block D2 step 5).
 *
 * Takes a text-token stream (A's SSE), feeds the ElevenLabs websocket
 * streaming-input endpoint, emits playable audio chunks.
 * Test standalone against fixtures/persona-replies.json before CP3.
 *
 * stop() is the interruption hook C calls (Block C3 step 12 / D3 step 11):
 * stop playback + flush the ElevenLabs buffer + ready for the new utterance.
 *
 * Voice choice + stability/similarity settings documented in
 * src/voice/latency/README.md once auditioned (Block D2 step 6).
 * BROWSER_TTS_FALLBACK flag: ugly but demo-saving if credits run dry.
 */

"use client";

export interface TTSClient {
  /** Feed persona tokens as they arrive from the SSE stream. */
  speak(tokens: AsyncIterable<string>): Promise<void>;
  /** Interruption hook. Get it right once, at CP3. */
  stop(): void;
  onPlaybackStart(cb: () => void): void;
  onPlaybackEnd(cb: () => void): void;
}

export function createTTSClient(): TTSClient {
  // TODO(D)
  throw new Error("not implemented");
}
