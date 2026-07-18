"use client";

import { useEffect, useRef, useState } from "react";
import { createSTTClient, type STTClient } from "@/voice/sttClient";
import { createTTSClient, type TTSClient } from "@/voice/ttsClient";
import { consumeTurnStream } from "@/lib/sse";

export default function TestVoiceLoopPage() {
  const [topic, setTopic] = useState("TCP congestion control");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    | "Idle"
    | "Creating Session..."
    | "Listening (Speak into Mic)..."
    | "You said: [processing]"
    | "Thinking..."
    | "AI is speaking..."
    | "Interrupted"
    | "Done"
    | "Error"
  >("Idle");
  
  const [transcript, setTranscript] = useState("");
  const [aiText, setAiText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [liveTimer, setLiveTimer] = useState<number | null>(null);

  // Refs for tracking active objects and timestamps
  const sttRef = useRef<STTClient | null>(null);
  const ttsRef = useRef<TTSClient | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Latency timer references
  const tSpeechFinishedRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize clients on mount
    const stt = createSTTClient();
    const tts = createTTSClient();

    // Register TTS Callbacks
    tts.onPlaybackStart(() => {
      isSpeakingRef.current = true;
      isThinkingRef.current = false;
      setStatus("AI is speaking...");

      // Stop the latency stopwatch timer and log final duration
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (tSpeechFinishedRef.current) {
        setLatencyMs(Date.now() - tSpeechFinishedRef.current);
      }
    });

    tts.onPlaybackEnd(() => {
      isSpeakingRef.current = false;
      setStatus("Done");
    });

    sttRef.current = stt;
    ttsRef.current = tts;

    return () => {
      stt.stop();
      tts.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Initialize Session
  const initSession = async () => {
    setError(null);
    setStatus("Creating Session...");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create session: ${res.statusText}`);
      }

      const data = await res.json() as { session_id: string };
      setSessionId(data.session_id);
      return data.session_id;
    } catch (err: any) {
      setStatus("Error");
      setError(err.message ?? String(err));
      return null;
    }
  };

  // Start Listening loop
  const startListening = async () => {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await initSession();
      if (!currentSessionId) return;
    }

    if (!sttRef.current || !ttsRef.current) return;

    setError(null);
    setTranscript("");
    setAiText("");
    setLatencyMs(null);
    setLiveTimer(null);

    // Register STT callbacks
    sttRef.current.onPartial((partialText) => {
      setTranscript(partialText);
      setStatus("You said: [processing]");

      // --- Interruption detection ---
      // If the user starts speaking while AI is speaking OR while waiting for backend,
      // trigger immediate stop/reset
      if (isSpeakingRef.current || isThinkingRef.current) {
        handleInterruption();
      }
    });

    sttRef.current.onFinal((finalText) => {
      if (!finalText) return;
      setTranscript(finalText);
      
      // Stop the microphone temporarily during the backend call
      sttRef.current?.stop();

      // Trigger the backend request
      submitTurn(currentSessionId!, finalText);
    });

    sttRef.current.onError((errStr) => {
      setStatus("Error");
      setError(errStr);
    });

    setStatus("Listening (Speak into Mic)...");
    sttRef.current.start([]);
  };

  // Process Interruption
  const handleInterruption = () => {
    // 1. Halt TTS playback
    ttsRef.current?.stop();
    isSpeakingRef.current = false;
    isThinkingRef.current = false;

    // 2. Abort active backend HTTP/SSE calls
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 3. Reset timers
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setStatus("Interrupted");
  };

  // Submit transcript to Backend Turn Route
  const submitTurn = async (sId: string, text: string) => {
    if (!ttsRef.current) return;
    setStatus("Thinking...");
    isThinkingRef.current = true;

    // Start latency stopwatch timer
    tSpeechFinishedRef.current = Date.now();
    setLiveTimer(0);
    timerIntervalRef.current = setInterval(() => {
      if (tSpeechFinishedRef.current) {
        setLiveTimer(Date.now() - tSpeechFinishedRef.current);
      }
    }, 50);

    // Setup fetch abort controller
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

      // Generator yielding tokens as they arrive from SSE
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
          if (err.name !== "AbortError") {
            throw err;
          }
        }
      }

      // Feed tokens to client-side speaker client
      await ttsRef.current.speak(yieldTokens());

      // Restart listening for the next turn automatically once playback completes
      if (!isSpeakingRef.current && status !== "Interrupted") {
        setTimeout(() => {
          startListening();
        }, 1500);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[test-voice-loop] Fetch aborted due to interruption.");
      } else {
        console.error("[test-voice-loop] submitTurn error:", err);
        setStatus("Error");
        setError(err.message ?? String(err));
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStopAll = () => {
    sttRef.current?.stop();
    ttsRef.current?.stop();
    isSpeakingRef.current = false;
    isThinkingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setStatus("Idle");
  };

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
            disabled={status !== "Idle" && status !== "Done" && status !== "Interrupted"}
            style={{
              width: "100%",
              backgroundColor: "#1a1b26",
              color: "#c0caf5",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "15px",
              outline: "none"
            }}
          />
        </div>

        {/* Actions */}
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "32px"
        }}>
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

        {/* Stopwatch & Latency diagnostics */}
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
              {latencyMs !== null ? `${(latencyMs / 1000).toFixed(2)}s (Final)` : `${((liveTimer ?? 0) / 1000).toFixed(2)}s`}
            </span>
          </div>
        )}

        {/* Live Conversation Transcript Display */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginBottom: "32px"
        }}>
          {/* User speech */}
          <div style={{
            backgroundColor: "#16161e",
            borderRadius: "10px",
            padding: "18px",
            border: "1px solid rgba(255, 255, 255, 0.04)"
          }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#565f89", textTransform: "uppercase", marginBottom: "8px" }}>
              Your Speech (Microphone)
            </span>
            <p style={{
              fontSize: "15px",
              margin: 0,
              color: transcript ? "#c0caf5" : "#565f89",
              fontStyle: transcript ? "normal" : "italic"
            }}>
              {transcript || "Waiting for you to speak..."}
            </p>
          </div>

          {/* Sam's reply */}
          <div style={{
            backgroundColor: "#16161e",
            borderRadius: "10px",
            padding: "18px",
            border: "1px solid rgba(255, 255, 255, 0.04)"
          }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#565f89", textTransform: "uppercase", marginBottom: "8px" }}>
              AI Student Reply (Speaker)
            </span>
            <p style={{
              fontSize: "15px",
              margin: 0,
              color: aiText ? "#9ece6a" : "#565f89",
              fontStyle: aiText ? "normal" : "italic"
            }}>
              {aiText || "Waiting for AI response..."}
            </p>
          </div>
        </div>

        {/* System Diagnostics Status */}
        <div style={{
          backgroundColor: "#16161e",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid rgba(255, 255, 255, 0.05)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "14px", color: "#565f89" }}>System Status:</span>
            <strong style={{
              fontSize: "14px",
              color:
                status.startsWith("Listening") ? "#7aa2f7" :
                status === "AI is speaking..." ? "#9ece6a" :
                status === "Interrupted" ? "#f7768e" :
                status === "Thinking..." ? "#e0af68" : "#bb9af3"
            }}>
              {status}
            </strong>
          </div>

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
