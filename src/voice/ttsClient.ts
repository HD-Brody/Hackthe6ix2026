/**
 * TTS client — ElevenLabs browser-side WebSocket streaming. Owner: D (Block D2 step 5).
 *
 * Implements the TTSClient interface from the CP0 contract.
 *
 * Architecture decision (hackathon CP): The browser connects DIRECTLY to ElevenLabs'
 * WebSocket — NOT through our own server. This is because Vercel serverless functions
 * can't hold long-lived WebSocket connections. The tradeoff: the ElevenLabs API key
 * is exposed client-side. To mitigate this, use a SEPARATE restricted-permission key
 * (Text-to-Speech access only, not the same key as the server uses).
 *
 * ─── API KEY SETUP ───────────────────────────────────────────────────────────
 * Environment variable name: NEXT_PUBLIC_ELEVENLABS_TTS_KEY
 *
 * Why this exact name:
 *   - NEXT_PUBLIC_ prefix is required by Next.js to expose any env var to the browser.
 *     Without this prefix, the variable is stripped from the client bundle entirely.
 *   - _TTS_KEY suffix makes it obvious this is the restricted key, not the server's
 *     ELEVENLABS_API_KEY which has full account access.
 *
 * Add to your .env.local:
 *   NEXT_PUBLIC_ELEVENLABS_TTS_KEY=your_restricted_key_here
 *
 * Add to Vercel project settings → Environment Variables:
 *   NEXT_PUBLIC_ELEVENLABS_TTS_KEY = <same key>
 *
 * To create a restricted key: ElevenLabs dashboard → Profile → API Keys →
 *   Create key with "Text-to-Speech" permission only, NOT "Manage API keys" etc.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Audio playback strategy — MediaSource API:
 *   ElevenLabs sends back base64-encoded MP3 fragments. The Web Audio API doesn't
 *   support streaming MP3 fragments well (it needs a complete file). Instead, we use
 *   MediaSource + SourceBuffer, which is designed exactly for appending media chunks
 *   incrementally, so audio starts playing before the full response arrives.
 *
 *   Flow:
 *     1. Create a MediaSource and attach it to an <audio> element
 *     2. On sourceopen: create a SourceBuffer for audio/mpeg
 *     3. As ElevenLabs sends base64 audio chunks: decode → append to SourceBuffer
 *     4. On isFinal: call endOfStream() to signal no more data
 *     5. Audio plays continuously as the buffer fills
 *
 * ElevenLabs WebSocket protocol (same as ttsStreamClient.ts — browser vs server
 * is the only difference, the wire protocol is identical):
 *   1. Connect to wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input
 *   2. First message (BOS): { text: " ", voice_settings: {...}, xi_api_key: "..." }
 *   3. Text chunks: { text: "each token" }
 *   4. EOS: { text: "" }
 *   5. Receive: { audio: "<base64 mp3>", isFinal: true|false }
 */

"use client";

// ── Config ────────────────────────────────────────────────────────────────────

// Default voice (Jessica — Playful, Bright, Warm). Overridden per-student via createTTSClient().
const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9";

// eleven_turbo_v2 = lowest-latency model. Don't use eleven_multilingual_v2 here —
// it has noticeably higher TTFA (time-to-first-audio) which hurts the demo feel.
function makeWsEndpoint(voiceId: string) {
  return `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2`;
}

// MIME type for the SourceBuffer. ElevenLabs streams MP3 fragments.
// 'audio/mpeg' is supported in Chrome, Edge, and Safari 15+.
const AUDIO_MIME = "audio/mpeg";

/** Tiny silent WAV — played during unlock() to satisfy autoplay policy. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

// ── Interface ─────────────────────────────────────────────────────────────────

export interface TTSClient {
  /**
   * Feed persona tokens as they arrive from the SSE stream.
   * Accepts either a full string or an AsyncIterable of tokens (from consumeTurnStream).
   * Returns a promise that resolves when all audio has finished playing.
   */
  speak(tokens: string | AsyncIterable<string>): Promise<void>;

  /**
   * Immediately stop audio playback and close the ElevenLabs WebSocket.
   * Use this when the user interrupts mid-sentence (starts speaking again).
   * onPlaybackEnd will NOT fire after stop() — the caller should handle cleanup.
   */
  stop(): void;

  /**
   * Consume a user gesture (click/tap) so later async `speak()` calls are
   * allowed under the browser autoplay policy. Must be called synchronously
   * inside the gesture handler (Send click, mic click, etc.) — not after await.
   */
  unlock(): void;

  /** Fires when the first audio chunk starts playing in the browser. */
  onPlaybackStart(cb: () => void): void;

  /** Fires when all audio has finished playing (not called after stop()). */
  onPlaybackEnd(cb: () => void): void;
}

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Creates a browser-side TTS client that streams directly to ElevenLabs.
 *
 * Usage:
 *   const tts = createTTSClient();
 *   tts.onPlaybackStart(() => showSpeakingIndicator());
 *   tts.onPlaybackEnd(() => hideSpeakingIndicator());
 *   await tts.speak(tokenStream);   // tokenStream is the SSE token async generator
 *   // to interrupt:
 *   tts.stop();
 */
export function createTTSClient(voiceId: string = DEFAULT_VOICE_ID): TTSClient {
  let playbackStartCb: (() => void) | null = null;
  let playbackEndCb: (() => void) | null = null;

  // Track the active WebSocket so stop() can reach it.
  let activeWs: WebSocket | null = null;
  // One audio element for the client lifetime — unlock() + speak() reuse it so
  // the autoplay entitlement from the user gesture sticks across async turns.
  const audioEl = new Audio();
  let objectUrl: string | null = null;
  let stopped = false;

  function clearObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  return {
    onPlaybackStart(cb) { playbackStartCb = cb; },
    onPlaybackEnd(cb)   { playbackEndCb = cb; },

    unlock() {
      // Must run synchronously in a click/keydown handler. play()+pause of a
      // silent clip marks this element as user-activated for later speak().
      audioEl.src = SILENT_WAV;
      const playAttempt = audioEl.play();
      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt.then(() => audioEl.pause()).catch(() => {});
      } else {
        audioEl.pause();
      }
    },

    stop() {
      stopped = true;

      if (activeWs && activeWs.readyState === WebSocket.OPEN) {
        activeWs.close();
      }
      activeWs = null;

      audioEl.pause();
      clearObjectUrl();
      audioEl.removeAttribute("src");
      audioEl.load();
    },

    speak(tokens: string | AsyncIterable<string>): Promise<void> {
      stopped = false;

      return new Promise((resolve, reject) => {
        const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_TTS_KEY;
        if (!apiKey) {
          reject(new Error(
            "NEXT_PUBLIC_ELEVENLABS_TTS_KEY is not set. " +
            "Add it to .env.local and Vercel env vars. See ttsClient.ts for instructions."
          ));
          return;
        }

        if (!MediaSource.isTypeSupported(AUDIO_MIME)) {
          reject(new Error(`MediaSource does not support ${AUDIO_MIME} in this browser.`));
          return;
        }

        clearObjectUrl();
        const mediaSource = new MediaSource();
        objectUrl = URL.createObjectURL(mediaSource);
        audioEl.src = objectUrl;

        let sourceBuffer: SourceBuffer | null = null;
        const pendingChunks: Uint8Array[] = [];
        let isEos = false;
        let isAppending = false;

        function flushChunks() {
          if (isAppending || !sourceBuffer || sourceBuffer.updating) return;
          if (pendingChunks.length === 0) {
            if (isEos) {
              try { mediaSource.endOfStream(); } catch (_) {}
            }
            return;
          }
          isAppending = true;
          sourceBuffer.appendBuffer(pendingChunks.shift()! as BufferSource);
        }

        mediaSource.addEventListener("sourceopen", () => {
          sourceBuffer = mediaSource.addSourceBuffer(AUDIO_MIME);

          sourceBuffer.addEventListener("updateend", () => {
            isAppending = false;
            flushChunks();
          });

          const ws = new WebSocket(makeWsEndpoint(voiceId));
          activeWs = ws;

          const queue: string[] = [];
          let wsOpen = false;

          function wsSend(data: object) {
            if (stopped) return;
            const json = JSON.stringify(data);
            if (wsOpen && ws.readyState === WebSocket.OPEN) {
              ws.send(json);
            } else {
              queue.push(json);
            }
          }

          ws.onopen = () => {
            wsOpen = true;
            ws.send(JSON.stringify({
              text: " ",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
              xi_api_key: apiKey,
            }));
            while (queue.length > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(queue.shift()!);
            }
          };

          ws.onmessage = (event) => {
            if (stopped) return;
            try {
              const msg = JSON.parse(event.data as string);

              if (msg.audio) {
                const binary = atob(msg.audio);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                pendingChunks.push(bytes);
                flushChunks();
              }

              if (msg.isFinal) {
                isEos = true;
                flushChunks();
                ws.close();
                activeWs = null;
              }
            } catch (e) {
              console.error("[ttsClient] Failed to parse ElevenLabs message:", e);
            }
          };

          ws.onerror = () => {
            if (!stopped) reject(new Error("ElevenLabs WebSocket error."));
          };

          ws.onclose = () => { activeWs = null; };

          (async () => {
            try {
              if (typeof tokens === "string") {
                wsSend({ text: tokens });
              } else {
                for await (const token of tokens) {
                  if (stopped) break;
                  wsSend({ text: token });
                }
              }
              if (!stopped) wsSend({ text: "" });
            } catch (e) {
              reject(e);
            }
          })();
        });

        audioEl.addEventListener("playing", () => {
          playbackStartCb?.();
        }, { once: true });

        audioEl.addEventListener("ended", () => {
          if (!stopped) {
            playbackEndCb?.();
            resolve();
          }
          clearObjectUrl();
        }, { once: true });

        audioEl.addEventListener("error", () => {
          if (!stopped) {
            reject(new Error(`Audio playback error: ${audioEl.error?.message ?? "unknown"}`));
          }
        }, { once: true });

        audioEl.play().catch((err) => {
          if (!stopped) reject(err);
        });
      });
    },
  };
}
