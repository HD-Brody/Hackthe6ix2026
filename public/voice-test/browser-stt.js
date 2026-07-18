/**
 * browser-stt.js — Web Speech API wrapper
 *
 * Swappable design: all callbacks receive plain text strings, so if you
 * later switch to Whisper (or any other transcription service), only THIS
 * file changes. The calling code stays the same.
 *
 * Usage:
 *   import { startListening, stopListening } from './browser-stt.js';
 *   startListening(
 *     (final)   => console.log("Final:", final),
 *     (interim) => console.log("Interim:", interim),
 *     (err)     => console.error("Error:", err)
 *   );
 */

let recognition = null;

/**
 * Start listening for speech.
 *
 * @param {(finalTranscript: string) => void} onResult - Fires when a phrase finalizes.
 * @param {(partialTranscript: string) => void} [onInterim] - Fires with live partial text.
 * @param {(errorMessage: string) => void} [onError] - Fires on any error.
 */
export function startListening(onResult, onInterim, onError) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError?.("Web Speech API is not supported in this browser. Use Chrome.");
    return;
  }

  // Clean up any existing session before starting a new one.
  if (recognition) {
    recognition.abort();
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;   // Keep listening between pauses
  recognition.interimResults = true; // Enable live partial results
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    let interimText = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }

    if (interimText) {
      onInterim?.(interimText);
    }
    if (finalText) {
      onResult(finalText.trim());
    }
  };

  recognition.onerror = (event) => {
    const messages = {
      "not-allowed": "Microphone access was denied. Please allow mic permissions and try again.",
      "no-speech":   "No speech was detected. Please try speaking again.",
      "network":     "A network error occurred during speech recognition.",
      "aborted":     "Recognition was stopped.",
    };
    const message = messages[event.error] || `Speech recognition error: ${event.error}`;
    // Don't surface "aborted" as a visible error — it's triggered by stopListening().
    if (event.error !== "aborted") {
      onError?.(message);
    }
  };

  recognition.onend = () => {
    // If recognition ended naturally (not via stopListening), restart it
    // so the session stays open for continuous use.
    if (recognition) {
      try { recognition.start(); } catch (_) { /* already started */ }
    }
  };

  recognition.start();
}

/**
 * Stop listening and tear down the recognition session.
 */
export function stopListening() {
  if (recognition) {
    recognition.onend = null; // Prevent the auto-restart above
    recognition.abort();
    recognition = null;
  }
}
