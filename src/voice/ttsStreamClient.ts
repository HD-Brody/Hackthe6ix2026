/**
 * TTS streaming client — ElevenLabs WebSocket input streaming. Owner: D (Block D2 step 5).
 *
 * Server-side only. Uses ElevenLabs' streaming-input WebSocket endpoint, which accepts
 * text token-by-token and sends back audio chunks as they're ready — so playback can
 * start before the full sentence is synthesized.
 *
 * How it differs from ttsServer.ts:
 *   ttsServer.ts    → HTTP, full sentence in → full MP3 out (simple, higher latency)
 *   ttsStreamClient → WebSocket, tokens in → audio chunks out (lower latency, better UX)
 *
 * ElevenLabs WebSocket protocol summary:
 *   1. Connect to the wss:// URL
 *   2. First message (BOS): send voice settings + API key — this opens the stream
 *   3. Send text chunks as they arrive: { text: "each token or phrase" }
 *   4. Optionally send { text: " ", flush: true } to force immediate processing
 *   5. Close the stream with { text: "" } (empty string = EOS signal)
 *   6. Receive audio chunks as base64-encoded MP3 in response messages
 *
 * Voice choice: Jessica (cgSgspJ2msm6clMCkdW9) — Playful, Bright, Warm
 * stability=0.5 gives expressive/variable delivery (good for "confused student")
 * Auditioned and documented in src/voice/latency/README.md
 */

// No "use client" — this is server-side only (runs in API routes, not the browser)

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9"; // Jessica

// ElevenLabs WebSocket streaming-input endpoint.
// eleven_turbo_v2 is the lowest-latency model — use this for real-time streaming.
const WS_ENDPOINT = (voiceId: string) =>
  `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2`;


// ── Types ─────────────────────────────────────────────────────────────────────

/** The callbacks you provide when opening a stream. */
export interface TTSStreamCallbacks {
  /**
   * Fires each time ElevenLabs sends back an audio chunk.
   * The chunk is a raw MP3 fragment — concatenate them all to get a full playable file.
   * In a browser pipeline, pipe each chunk directly to the audio player.
   */
  onAudioChunk(chunk: Buffer): void;

  /** Fires when the stream ends normally (all audio has been received). */
  onEnd?(): void;

  /** Fires on WebSocket errors or malformed response messages. */
  onError?(err: Error): void;
}

/** The handle returned by createTTSStream — use this to drive the stream. */
export interface TTSStreamHandle {
  /**
   * Feed a text chunk to ElevenLabs. Safe to call before the WebSocket is fully open
   * — messages are queued internally until the connection is ready.
   *
   * Send tokens here as they arrive from the Gemini SSE stream.
   */
  sendText(text: string): void;

  /**
   * Signal that no more text is coming. ElevenLabs will flush its buffer,
   * finish generating audio, and close the stream.
   * Call this after the last token.
   */
  finish(): void;

  /**
   * Immediately halt the stream and close the WebSocket.
   * Use this for interruptions (user starts speaking mid-sentence).
   * onEnd will NOT be called after stop().
   */
  stop(): void;
}


// ── Core: createTTSStream ─────────────────────────────────────────────────────

/**
 * Opens a WebSocket stream to ElevenLabs and returns a handle to drive it.
 *
 * Use this when you need full control over when text tokens are sent
 * (e.g., piping a live Gemini stream token-by-token).
 *
 * @example
 * const stream = createTTSStream({
 *   onAudioChunk: (chunk) => audioPlayer.feed(chunk),
 *   onEnd: () => audioPlayer.finish(),
 * });
 * for await (const token of geminiStream) stream.sendText(token);
 * stream.finish();
 */
export function createTTSStream(callbacks: TTSStreamCallbacks): TTSStreamHandle {
  const { onAudioChunk, onEnd, onError } = callbacks;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set in the environment variables.");
  }

  // Internal state ─────────────────────────────────────────────────────────────
  let ws: WebSocket | null = new WebSocket(WS_ENDPOINT(VOICE_ID));
  let isOpen = false;
  let stopped = false;  // true after stop() is called — suppresses onEnd callback
  const queue: string[] = []; // Holds JSON strings buffered before the socket opens

  // Sends a raw JSON string, queuing it if the socket isn't open yet.
  function enqueue(json: string) {
    if (stopped) return;
    if (isOpen && ws?.readyState === WebSocket.OPEN) {
      ws.send(json);
    } else {
      queue.push(json);
    }
  }

  // Drains the queue once the socket is confirmed open.
  function flushQueue() {
    while (queue.length > 0 && ws?.readyState === WebSocket.OPEN) {
      ws.send(queue.shift()!);
    }
  }

  // WebSocket lifecycle ─────────────────────────────────────────────────────────

  ws.onopen = () => {
    isOpen = true;
    // BOS (Beginning Of Stream): ElevenLabs requires this exact first message.
    // The initial text must be a non-empty string (convention: a single space).
    // This also authenticates the connection with the API key.
    ws!.send(JSON.stringify({
      text: " ",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      xi_api_key: apiKey,
    }));
    // Now drain anything that was enqueued before the socket opened.
    flushQueue();
  };

  ws.onmessage = (event) => {
    if (stopped) return;
    try {
      const msg = JSON.parse(event.data as string);

      // ElevenLabs sends audio as a base64-encoded MP3 fragment.
      if (msg.audio) {
        onAudioChunk(Buffer.from(msg.audio, "base64"));
      }

      // isFinal=true means ElevenLabs is done — no more audio is coming.
      if (msg.isFinal) {
        onEnd?.();
        ws?.close();
        ws = null;
      }
    } catch (e) {
      onError?.(new Error(`Failed to parse ElevenLabs message: ${e}`));
    }
  };

  ws.onerror = () => {
    if (!stopped) onError?.(new Error("ElevenLabs WebSocket error."));
  };

  ws.onclose = () => {
    // Only fire onEnd for unexpected closes (e.g. network drop).
    // Normal end fires via isFinal above; stop() fires nothing.
    if (!stopped && ws !== null) {
      onEnd?.();
    }
    ws = null;
  };

  // Public handle ───────────────────────────────────────────────────────────────

  return {
    sendText(text: string) {
      enqueue(JSON.stringify({ text }));
    },

    finish() {
      // EOS signal: empty string tells ElevenLabs to flush and close.
      enqueue(JSON.stringify({ text: "" }));
    },

    stop() {
      stopped = true;
      queue.length = 0; // Discard any buffered messages
      ws?.close();
      ws = null;
    },
  };
}


// ── Convenience: streamTextToSpeech ──────────────────────────────────────────

/**
 * Convenience wrapper: streams a complete string or an AsyncIterable of tokens.
 * Returns a stop() function you can call to interrupt playback.
 *
 * @example — full string:
 * const stop = await streamTextToSpeech("Hello, how are you?", { onAudioChunk });
 *
 * @example — token stream (from Gemini SSE):
 * const stop = await streamTextToSpeech(geminiStream, { onAudioChunk });
 * // call stop() if user interrupts
 */
export async function streamTextToSpeech(
  text: string | AsyncIterable<string>,
  callbacks: TTSStreamCallbacks
): Promise<() => void> {
  return new Promise((resolve, reject) => {
    let endFired = false;

    const handle = createTTSStream({
      onAudioChunk: callbacks.onAudioChunk,
      onEnd() {
        if (endFired) return;
        endFired = true;
        callbacks.onEnd?.();
        resolve(handle.stop);
      },
      onError(err) {
        callbacks.onError?.(err);
        reject(err);
      },
    });

    // Feed text asynchronously, then signal EOS.
    (async () => {
      try {
        if (typeof text === "string") {
          handle.sendText(text);
        } else {
          for await (const token of text) {
            handle.sendText(token);
          }
        }
        handle.finish();
      } catch (e) {
        handle.stop();
        reject(e);
      }
    })();

    // Expose stop() immediately so callers can interrupt before onEnd fires.
    resolve(handle.stop);
  });
}
