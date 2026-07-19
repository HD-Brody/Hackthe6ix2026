"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSTTClient, type STTClient } from "@/voice/sttClient";
import { createTTSClient, type TTSClient } from "@/voice/ttsClient";
import { consumeTurnStream } from "@/lib/sse";
import { shouldPlayThinkingNoise, pickThinkingNoise } from "@/voice/latencyMask";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TestVoiceLoopPage() {
  const [topic, setTopic] = useState("TCP congestion control");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    | "Idle"
    | "Creating Session..."
    | "Listening (Speak into Mic)..."
    | "You said: [processing]"
    | "Thinking..."
    | "Thinking... (thinking sound played)"
    | "AI is speaking..."
    | "Done"
    | "Error"
  >("Idle");

  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [liveTimer, setLiveTimer] = useState<number | null>(null);

  // STT/TTS client refs
  const sttRef = useRef<STTClient | null>(null);
  const ttsRef = useRef<TTSClient | null>(null);

  // State machine flags — used inside event callbacks, so must be refs not state
  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);

  // Session ID ref — mirrors state so callbacks always have the current value
  const sessionIdRef = useRef<string | null>(null);

  // Abort controller for the fetch/SSE stream
  const abortControllerRef = useRef<AbortController | null>(null);

  // Latency stopwatch
  const tSpeechFinishedRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Thinking noise —————————————————————————————————————————————————————————————
  // We use the "PROBE" filler clip (confused-hmm.mp3) for the thinking sound as requested.
  const thinkingNoiseRef = useRef<HTMLAudioElement | null>(null);
  const thinkingNoiseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realAudioStartedRef = useRef<boolean>(false);

  // Keep sessionId accessible inside stable callbacks without re-registering them
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ── Stable helper: stop any playing thinking-noise clip ────────────────────
  const stopThinkingNoise = useCallback(() => {
    if (thinkingNoiseRef.current) {
      thinkingNoiseRef.current.pause();
      thinkingNoiseRef.current.src = "";
      thinkingNoiseRef.current = null;
    }
    if (thinkingNoiseTimeoutRef.current) {
      clearTimeout(thinkingNoiseTimeoutRef.current);
      thinkingNoiseTimeoutRef.current = null;
    }
  }, []);

  // ── Forward-ref for startListeningInternal ────────────────────────────────
  const startListeningInternalRef = useRef<
    ((stt: STTClient, tts: TTSClient, sid?: string) => void) | null
  >(null);

  // ── Client initialization ─────────────────────────────────────────────────
  useEffect(() => {
    const stt = createSTTClient();
    const tts = createTTSClient();

    tts.onPlaybackStart(() => {
      isSpeakingRef.current = true;
      isThinkingRef.current = false;
      realAudioStartedRef.current = true;

      // Cancel any pending/playing thinking-noise — real audio has arrived
      stopThinkingNoise();

      setStatus("AI is speaking...");

      // Finalize latency measurement
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (tSpeechFinishedRef.current) {
        setLatencyMs(Date.now() - tSpeechFinishedRef.current);
      }

      // NOTE: Interruption has been disabled to prevent the AI from interrupting itself.
      // We no longer restart the microphone here during playback.
    });

    tts.onPlaybackEnd(() => {
      isSpeakingRef.current = false;
      stt.stop(); // Ensure mic is stopped
      setStatus("Done");
      // Auto-restart for the next turn (short pause to feel natural)
      setTimeout(() => {
        startListeningInternalRef.current?.(stt, tts);
      }, 800);
    });

    sttRef.current = stt;
    ttsRef.current = tts;

    return () => {
      stt.stop();
      tts.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      stopThinkingNoise();
    };
  }, [stopThinkingNoise]);

  // ── submitTurn ────────────────────────────────────────────────────────────
  const submitTurn = useCallback(async (
    sId: string,
    text: string,
    stt: STTClient,
    tts: TTSClient,
  ) => {
    setStatus("Thinking...");
    isThinkingRef.current = true;
    realAudioStartedRef.current = false;

    // Start latency stopwatch
    tSpeechFinishedRef.current = Date.now();
    setLiveTimer(0);
    timerIntervalRef.current = setInterval(() => {
      if (tSpeechFinishedRef.current) {
        setLiveTimer(Date.now() - tSpeechFinishedRef.current);
      }
    }, 50);

    // ── THINKING NOISE — single timeout at the 1500ms threshold ──────────────
    // Plays the "PROBE" clip (confused-hmm.mp3) as the thinking noise.
    const thinkingNoiseClipUrl = pickThinkingNoise("PROBE");
    thinkingNoiseTimeoutRef.current = setTimeout(() => {
      thinkingNoiseTimeoutRef.current = null;
      if (!realAudioStartedRef.current) {
        const elapsed = tSpeechFinishedRef.current
          ? Date.now() - tSpeechFinishedRef.current
          : 0;
        if (shouldPlayThinkingNoise(elapsed)) {
          const clip = new Audio(thinkingNoiseClipUrl);
          thinkingNoiseRef.current = clip;
          clip.play().catch((err) => {
            console.warn("[test-voice-loop] Thinking noise autoplay blocked:", err.message);
          });
          setStatus("Thinking... (thinking sound played)");
        }
      }
    }, 1500); // matches DEFAULT_THRESHOLD_MS in latencyMask.ts

    // Abort controller for this fetch/SSE
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/session/${sId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_text: text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Turn request failed: ${response.statusText}`);
      }

      async function* yieldTokens() {
        try {
          for await (const event of consumeTurnStream(response)) {
            if (event.event === "token") {
              setAiText((prev) => prev + event.data.text);
              yield event.data.text;
            } else if (event.event === "error") {
              console.error("[test-voice-loop] SSE error:", event.data.message);
              setError(`Orchestrator error: ${event.data.message}`);
            }
          }
        } catch (err: any) {
          if (err.name !== "AbortError") throw err;
        }
      }

      // Blocks until all audio has finished playing.
      await tts.speak(yieldTokens());
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[test-voice-loop] Fetch aborted.");
      } else {
        console.error("[test-voice-loop] submitTurn error:", err);
        setStatus("Error");
        setError(err.message ?? String(err));
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      stopThinkingNoise();
    } finally {
      isThinkingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [stopThinkingNoise]);

  // ── startListeningInternal ────────────────────────────────────────────────
  const startListeningInternal = useCallback((
    stt: STTClient,
    tts: TTSClient,
    sid?: string,
  ) => {
    const currentSessionId = sid ?? sessionIdRef.current;
    if (!currentSessionId) return;

    setError(null);

    stt.onPartial((partialText) => {
      setTranscript(partialText);
      setStatus("You said: [processing]");
    });

    stt.onFinal((finalText) => {
      if (!finalText) return;
      setTranscript(finalText);

      // Stop mic while we wait for backend + TTS
      stt.stop();

      submitTurn(currentSessionId, finalText, stt, tts);
    });

    stt.onError((errStr) => {
      // Suppress "aborted" / "stopped" — those come from our own stt.stop() calls
      if (errStr.includes("stopped") || errStr.includes("aborted")) return;
      setStatus("Error");
      setError(errStr);
    });

    setStatus("Listening (Speak into Mic)...");
    stt.start([]);
  }, [submitTurn]);

  // Keep the ref in sync so the useEffect closure always calls the latest version
  useEffect(() => {
    startListeningInternalRef.current = startListeningInternal;
  }, [startListeningInternal]);

  // ── initSession ───────────────────────────────────────────────────────────
  const initSession = async () => {
    setError(null);
    setStatus("Creating Session...");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error(`Failed to create session: ${res.statusText}`);
      const data = await res.json() as { session_id: string };
      setSessionId(data.session_id);
      sessionIdRef.current = data.session_id;
      return data.session_id;
    } catch (err: any) {
      setStatus("Error");
      setError(err.message ?? String(err));
      return null;
    }
  };

  // ── Public button handler ─────────────────────────────────────────────────
  const startListening = async () => {
    let currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      currentSessionId = await initSession();
      if (!currentSessionId) return;
    }
    if (!sttRef.current || !ttsRef.current) return;

    setTranscript("");
    setAiText("");
    setLatencyMs(null);
    setLiveTimer(null);

    startListeningInternal(sttRef.current, ttsRef.current, currentSessionId);
  };

  // ── Stop all ──────────────────────────────────────────────────────────────
  const handleStopAll = () => {
    sttRef.current?.stop();
    ttsRef.current?.stop();
    isSpeakingRef.current = false;
    isThinkingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopThinkingNoise();
    setStatus("Idle");
  };


  const statusColor =
    status.startsWith("Listening") ? "text-blue-500 dark:text-blue-400" :
    status === "AI is speaking..." ? "text-emerald-600 dark:text-emerald-400" :
    status === "Thinking..." ? "text-amber-600 dark:text-amber-400" :
    "text-purple-600 dark:text-purple-400";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)] text-[var(--text-primary)]">
      <header className="flex items-center justify-end px-5 py-4 sm:px-8">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_24px_48px_var(--shadow-color)] sm:p-9">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[var(--brand)]">
            End-to-End Voice Loop Test
          </h1>
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
            Test Web Speech API STT, Next.js API turns, and ElevenLabs client WebSockets together
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Demo Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={status !== "Idle" && status !== "Done"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-input)] px-3 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-60"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={startListening}
              className="flex-[2] rounded-lg bg-[var(--chat-user)] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-strong)]"
            >
              Start Listening / Talk
            </button>
            <button
              onClick={handleStopAll}
              className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
            >
              Stop / Reset
            </button>
          </div>

          {(liveTimer !== null || latencyMs !== null) && (
            <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Latency (STT End to AI Speech Start):
              </span>
              <span className="font-mono text-base font-bold text-amber-700 dark:text-amber-300">
                {latencyMs !== null
                  ? `${(latencyMs / 1000).toFixed(2)}s (Final)`
                  : `${((liveTimer ?? 0) / 1000).toFixed(2)}s`}
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Your Speech (Microphone)
              </span>
              <p className={`mt-2 text-sm ${transcript ? "text-[var(--text-primary)]" : "italic text-[var(--text-muted)]"}`}>
                {transcript || "Waiting for you to speak..."}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                AI Student Reply (Speaker)
              </span>
              <p className={`mt-2 text-sm ${aiText ? "text-emerald-600 dark:text-emerald-400" : "italic text-[var(--text-muted)]"}`}>
                {aiText || "Waiting for AI response..."}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">System Status:</span>
              <strong className={`text-sm ${statusColor}`}>{status}</strong>
            </div>

            {status === "Thinking... (thinking sound played)" && (
              <div className="mt-3 border-t border-purple-500/20 pt-3 text-xs text-purple-600 dark:text-purple-400">
                Latency mask triggered (&gt;1500ms silence) — playing confused-hmm.mp3
              </div>
            )}

            {error && (
              <div className="mt-3 border-t border-red-500/20 pt-3 text-sm text-red-600 dark:text-red-400">
                <strong>System Error:</strong> {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
