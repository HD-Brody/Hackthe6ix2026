"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSTTClient, type STTClient } from "@/voice/sttClient";
import { createTTSClient, type TTSClient } from "@/voice/ttsClient";
import { consumeTurnStream } from "@/lib/sse";
import { shouldPlayThinkingNoise, pickThinkingNoise } from "@/voice/latencyMask";

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
    status.startsWith("Listening") ? "#7aa2f7" :
    status === "AI is speaking..." ? "#9ece6a" :
    status === "Thinking..." ? "#e0af68" :
    status.startsWith("Thinking... (thinking") ? "#bb9af3" : "#bb9af3";

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top left, #0d0e15, #161824)",
      color: "#c0caf5",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "40px 20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        maxWidth: "640px",
        width: "100%",
        backgroundColor: "rgba(30, 32, 48, 0.75)",
        backdropFilter: "blur(16px)",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "36px",
        boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)"
      }}>
        <h1 style={{
          fontSize: "26px",
          fontWeight: 800,
          color: "#7aa2f7",
          marginTop: 0,
          marginBottom: "6px",
          letterSpacing: "-0.5px"
        }}>
          End-to-End Voice Loop Test
        </h1>
        <p style={{
          color: "#9ece6a",
          fontSize: "14px",
          marginBottom: "28px"
        }}>
          Test Web Speech API STT, Next.js API turns, and ElevenLabs client WebSockets together
        </p>

        {/* Topic Input */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#565f89",
            marginBottom: "8px"
          }}>
            Demo Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={status !== "Idle" && status !== "Done"}
            style={{
              width: "100%",
              backgroundColor: "#1a1b26",
              color: "#c0caf5",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "15px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          <button
            onClick={startListening}
            style={{
              flex: 2,
              backgroundColor: "#7aa2f7",
              color: "#1a1b26",
              fontWeight: 700,
              fontSize: "15px",
              padding: "14px 28px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(122, 162, 247, 0.25)"
            }}
          >
            Start Listening / Talk
          </button>
          <button
            onClick={handleStopAll}
            style={{
              flex: 1,
              backgroundColor: "rgba(247, 118, 142, 0.15)",
              color: "#f7768e",
              fontWeight: 600,
              fontSize: "15px",
              padding: "14px 28px",
              border: "1px solid rgba(247, 118, 142, 0.3)",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Stop / Reset
          </button>
        </div>

        {/* Stopwatch & Latency */}
        {(liveTimer !== null || latencyMs !== null) && (
          <div style={{
            backgroundColor: "rgba(224, 175, 104, 0.08)",
            border: "1px solid rgba(224, 175, 104, 0.2)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "14px", color: "#e0af68", fontWeight: 600 }}>
              ⏱️ Latency (STT End → AI Speech Start):
            </span>
            <span style={{ fontSize: "16px", fontWeight: 700, fontFamily: "monospace", color: "#e0af68" }}>
              {latencyMs !== null
                ? `${(latencyMs / 1000).toFixed(2)}s (Final)`
                : `${((liveTimer ?? 0) / 1000).toFixed(2)}s`}
            </span>
          </div>
        )}

        {/* Transcript panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
          <div style={{
            backgroundColor: "#16161e",
            borderRadius: "10px",
            padding: "18px",
            border: "1px solid rgba(255, 255, 255, 0.04)"
          }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#565f89", textTransform: "uppercase", marginBottom: "8px" }}>
              Your Speech (Microphone)
            </span>
            <p style={{ fontSize: "15px", margin: 0, color: transcript ? "#c0caf5" : "#565f89", fontStyle: transcript ? "normal" : "italic" }}>
              {transcript || "Waiting for you to speak..."}
            </p>
          </div>

          <div style={{
            backgroundColor: "#16161e",
            borderRadius: "10px",
            padding: "18px",
            border: "1px solid rgba(255, 255, 255, 0.04)"
          }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#565f89", textTransform: "uppercase", marginBottom: "8px" }}>
              AI Student Reply (Speaker)
            </span>
            <p style={{ fontSize: "15px", margin: 0, color: aiText ? "#9ece6a" : "#565f89", fontStyle: aiText ? "normal" : "italic" }}>
              {aiText || "Waiting for AI response..."}
            </p>
          </div>
        </div>

        {/* Status panel */}
        <div style={{
          backgroundColor: "#16161e",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid rgba(255, 255, 255, 0.05)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#565f89" }}>System Status:</span>
            <strong style={{ fontSize: "14px", color: statusColor }}>
              {status}
            </strong>
          </div>

          {status === "Thinking... (thinking sound played)" && (
            <div style={{
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(187, 154, 243, 0.15)",
              fontSize: "12px",
              color: "#bb9af3",
              opacity: 0.8,
            }}>
              🎵 Latency mask triggered (&gt;1500ms silence) — playing filler clip:
              <br />
              <span style={{ opacity: 0.8, fontWeight: "bold" }}>
                confused-hmm.mp3 (&quot;hmm?&quot; thinking sound)
              </span>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(247, 118, 142, 0.2)",
              color: "#f7768e",
              fontSize: "13px",
              lineHeight: "1.4"
            }}>
              <strong>System Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
