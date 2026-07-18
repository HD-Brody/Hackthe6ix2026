/**
 * STT client — Web Speech API implementation. Owner: D (Block D2 step 7).
 *
 * Implements the STTClient interface from the CP0 contract.
 * Ported from public/voice-test/browser-stt.js (keep that file — it's the test harness).
 *
 * CP1 decision: Web Speech API was chosen over Whisper for low latency.
 * Swap path: if jargon accuracy becomes unacceptable during testing, replace
 * createSTTClient() with a Whisper implementation — the interface stays the same
 * so the calling component (C) never needs to change.
 *
 * ⚠️  JARGON WARNING — READ THIS:
 * Web Speech API has NO jargon-biasing mechanism. The `hints` parameter passed to
 * start() is intentionally a NO-OP here — we accept it to match the interface, but
 * the browser's speech engine has no way to use those node names as pronunciation hints.
 *
 * In practice this means technical terms like "ssthresh", "cwnd", "HTTPS handshake",
 * or "photosynthesis" may be mishear as similar-sounding common words.
 *
 * ─── MITIGATION ──────────────────────────────────────────────────────────────
 * The app's text-input fallback (the typed-input field in C's UI) becomes CRITICAL
 * for jargon-heavy topics. If we demo photosynthesis or TCP congestion control and
 * the user's speech gets garbled, they need a way to type instead.
 * If jargon mishearing becomes a consistent problem in testing, swap the STT path
 * to Whisper (server-side), which accepts a `language` + `prompt` field that can
 * prime the model with expected vocabulary.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

export interface STTClient {
  /**
   * Start listening for speech.
   *
   * @param hints - Node names from the concept graph, e.g. ["cwnd", "ssthresh"].
   *   ⚠️ NO-OP in this Web Speech API implementation — browser has no biasing API.
   *   Kept in the interface so a future Whisper implementation can use them.
   */
  start(hints: string[]): void;

  /** Stop listening and tear down the recognition session. */
  stop(): void;

  /**
   * Register a callback for interim (partial) transcript results.
   * C uses these for live caption display (Block C3 step 11).
   * Call before start().
   */
  onPartial(cb: (text: string) => void): void;

  /**
   * Register a callback for finalized transcript segments.
   * This is the text that gets POSTed to /api/session/:id/turn.
   * Call before start().
   */
  onFinal(cb: (text: string) => void): void;

  /**
   * Register a callback for errors (mic denied, no speech, network, etc).
   * "aborted" errors from stop() are suppressed automatically.
   */
  onError(cb: (message: string) => void): void;
}

/**
 * Creates a Web Speech API STT client implementing the STTClient interface.
 *
 * Usage:
 *   const stt = createSTTClient();
 *   stt.onPartial((text) => setCaption(text));
 *   stt.onFinal((text) => submitTurn(text));
 *   stt.onError((msg) => showError(msg));
 *   stt.start([]);   // hints are ignored but accepted
 *   // later:
 *   stt.stop();
 */
export function createSTTClient(): STTClient {
  // Internal state — these are set via the onX() registration methods.
  let partialCb: ((text: string) => void) | null = null;
  let finalCb: ((text: string) => void) | null = null;
  let errorCb: ((message: string) => void) | null = null;

  // The active SpeechRecognition instance. Null when not listening.
  let recognition: any = null;

  // Human-readable error messages matching the browser's error codes.
  const ERROR_MESSAGES: Record<string, string> = {
    "not-allowed": "Microphone access was denied. Please allow mic permissions and try again.",
    "no-speech":   "No speech was detected. Please try speaking again.",
    "network":     "A network error occurred during speech recognition.",
    "aborted":     "Recognition was stopped.", // Suppressed — fired by our own stop()
  };

  return {
    onPartial(cb) { partialCb = cb; },
    onFinal(cb)   { finalCb = cb; },
    onError(cb)   { errorCb = cb; },

    start(_hints: string[]) {
      // ⚠️ _hints intentionally unused — Web Speech API has no biasing mechanism.
      // See the module-level JARGON WARNING comment above.

      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionAPI) {
        errorCb?.("Web Speech API is not supported in this browser. Use Chrome.");
        return;
      }

      // Tear down any existing session before starting fresh.
      if (recognition) {
        recognition.onend = null;
        recognition.abort();
        recognition = null;
      }

      recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;     // Keep listening across pauses
      recognition.interimResults = true; // Enable live partial results for captions
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";

        // event.resultIndex is the index of the first new result in this event.
        // Results before it have already been processed.
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (interimText) partialCb?.(interimText);
        if (finalText)   finalCb?.(finalText.trim());
      };

      recognition.onerror = (event: any) => {
        // "aborted" fires when we call stop() ourselves — don't surface it as an error.
        if (event.error === "aborted") return;
        const message = ERROR_MESSAGES[event.error] ?? `Speech recognition error: ${event.error}`;
        errorCb?.(message);
      };

      recognition.onend = () => {
        // If recognition ended naturally (e.g. 60s timeout), restart it automatically
        // so the session stays open for the full conversation.
        // stop() clears recognition.onend before aborting, so this won't re-trigger.
        if (recognition) {
          try { recognition.start(); } catch (_) { /* already started */ }
        }
      };

      recognition.start();
    },

    stop() {
      if (recognition) {
        recognition.onend = null; // Prevent the auto-restart above
        recognition.abort();
        recognition = null;
      }
    },
  };
}
