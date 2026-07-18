"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { Directive, Session, SessionStatus, Utterance } from "@/lib/types";
import { studentProfiles, type StudentId } from "@/lib/studentProfiles";
import { MicButton } from "@/components/MicButton";
import { StudentAvatar } from "@/components/StudentAvatar";
import { Transcript } from "@/components/Transcript";
import { consumeTurnStream } from "@/lib/sse";
import { createSTTClient, type STTClient } from "@/voice/sttClient";
import { createTTSClient, type TTSClient } from "@/voice/ttsClient";
import { pickThinkingNoise, shouldPlayThinkingNoise } from "@/voice/latencyMask";
import {
  isMockSessionId,
  readMockSession,
  saveMockTranscript,
} from "@/lib/mockSession";

function ChatIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 text-[var(--brand)]"><path d="M4 5h16v11H8l-4 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
}

function PaperclipIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="m8.5 12.5 6.1-6.1a3.2 3.2 0 0 1 4.5 4.5l-7.7 7.7a5 5 0 0 1-7.1-7.1l7.3-7.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function SendIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="m3 4 18 8-18 8 3-8-3-8Zm3 8h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function EndConversationIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4"><rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M9 9h6v6H9z" fill="currentColor" /></svg>;
}

/** In-character error copy — the student never blames "the API". */
const ERROR_COPY = {
  send: (name: string) => `${name} spaced out — try sending that again.`,
  busy: (name: string) => `${name} is still thinking — give them a second.`,
  ended: (name: string) => `${name} already left the classroom. View the report for this session.`,
  load: (name: string) => `Couldn't find ${name}'s classroom. Start a new session from the home page.`,
  end: (name: string) => `${name} isn't ready to wrap up — try once more.`,
};

function ComprehensionCard({
  student,
  solid,
  total,
  focusName,
}: {
  student: StudentId;
  solid: number;
  total: number;
  focusName: string | null;
}) {
  const profile = studentProfiles[student];
  const pct = total > 0 ? Math.round((solid / total) * 100) : 0;
  return (
    <section className="rounded-lg bg-[var(--brand)] p-5 text-white shadow-lg">
      <p className="text-sm font-semibold text-white/80">Comprehension Level</p>
      <p className="font-heading mt-1 text-3xl font-bold">{pct}%</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-4 text-xs leading-5 text-white/90">
        {total > 0
          ? `${solid} of ${total} concepts solid${focusName ? ` — ${profile.name} is currently curious about ${focusName}.` : "."}`
          : `${profile.name} is waiting for you to start teaching.`}
      </p>
    </section>
  );
}

function ClassroomComposer({
  student,
  value,
  isSending,
  error,
  micActive,
  micSupported,
  partialTranscript,
  onChange,
  onSubmit,
  onMicToggle,
}: {
  student: StudentId;
  value: string;
  isSending: boolean;
  error: string | null;
  micActive: boolean;
  micSupported: boolean;
  partialTranscript: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicToggle: () => void;
}) {
  const profile = studentProfiles[student];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-[var(--card-border)] bg-white px-4 py-4 sm:px-6">
      <div className="flex items-end gap-2 rounded-xl bg-[#eceef0] p-2">
        <textarea
          aria-label={`Explain this concept to ${profile.name}`}
          placeholder={
            micActive
              ? partialTranscript || "Listening — start explaining out loud..."
              : `Explain this concept to ${profile.name}...`
          }
          rows={1}
          value={value}
          disabled={isSending || micActive}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 sm:text-base"
        />
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Attach a file. Attachments are not connected yet." className="flex size-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-white hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><PaperclipIcon /></button>
          <MicButton
            active={micActive}
            disabled={isSending || !micSupported}
            onClick={onMicToggle}
          />
          <button type="submit" disabled={isSending || micActive || !value.trim()} aria-label="Send message" className="flex size-10 items-center justify-center rounded-lg bg-[#4648d4] text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><SendIcon /></button>
        </div>
      </div>
      {micActive ? (
        <p className="mt-2 px-1 text-sm text-[var(--text-secondary)]">
          🎙 {partialTranscript || "Listening..."}
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-2 px-1 text-sm font-medium text-red-600">{error}</p> : null}
    </form>
  );
}

/** Async token queue: lets one SSE read loop feed both the transcript and TTS. */
function createTokenTee() {
  const queue: (string | null)[] = [];
  let wake: (() => void) | null = null;

  return {
    push(token: string | null) {
      queue.push(token);
      wake?.();
      wake = null;
    },
    async *stream(): AsyncGenerator<string> {
      for (;;) {
        if (queue.length > 0) {
          const token = queue.shift()!;
          if (token === null) return;
          yield token;
        } else {
          await new Promise<void>((resolve) => (wake = resolve));
        }
      }
    },
  };
}

export function Classroom({
  sessionId,
  student,
}: {
  sessionId: string;
  student: StudentId;
}) {
  const profile = studentProfiles[student];
  const router = useRouter();
  const mockSession = isMockSessionId(sessionId);

  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [message, setMessage] = useState("");
  const [studentState, setStudentState] = useState<"listening" | "thinking" | "speaking">("listening");
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("teaching");
  const [graphStats, setGraphStats] = useState<{ solid: number; total: number }>({ solid: 0, total: 0 });
  const [focusName, setFocusName] = useState<string | null>(null);
  const [mockHydrated, setMockHydrated] = useState(!mockSession);
  const [micActive, setMicActive] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [partialTranscript, setPartialTranscript] = useState("");

  // Voice plumbing — created once; TTS speaks only after the user has used the
  // mic (which doubles as the browser autoplay-unlock gesture).
  const sttRef = useRef<STTClient | null>(null);
  const ttsRef = useRef<TTSClient | null>(null);
  const voiceRepliesRef = useRef(false);
  const thinkingNoiseRef = useRef<HTMLAudioElement | null>(null);
  const thinkingNoiseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDirectiveRef = useRef<Directive | null>(null);
  const graphNodesRef = useRef<Session["graph"]["nodes"]>([]);

  const stopThinkingNoise = useCallback(() => {
    thinkingNoiseRef.current?.pause();
    thinkingNoiseRef.current = null;
    if (thinkingNoiseTimeoutRef.current) {
      clearTimeout(thinkingNoiseTimeoutRef.current);
      thinkingNoiseTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const stt = createSTTClient();
    const tts = createTTSClient();
    tts.onPlaybackStart(() => {
      stopThinkingNoise();
      setStudentState("speaking");
    });
    tts.onPlaybackEnd(() => {
      setStudentState("listening");
    });
    sttRef.current = stt;
    ttsRef.current = tts;
    return () => {
      stt.stop();
      tts.stop();
      stopThinkingNoise();
    };
  }, [stopThinkingNoise]);

  const applySession = useCallback((session: Session) => {
    setUtterances(session.utterances);
    setSessionStatus(session.status);
    graphNodesRef.current = session.graph.nodes;
    setGraphStats({
      solid: session.graph.nodes.filter((n) => n.state === "solid").length,
      total: session.graph.nodes.length,
    });
  }, []);

  // Refresh recovery: rebuild the classroom from the persisted session.
  useEffect(() => {
    if (mockSession) {
      const storedSession = readMockSession(sessionId);
      setUtterances(storedSession?.utterances ?? []);
      setMockHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error("not found");
        const session = (await res.json()) as Session;
        if (!cancelled) applySession(session);
      } catch {
        if (!cancelled) setError(ERROR_COPY.load(profile.name));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession, mockSession, profile.name, sessionId]);

  useEffect(() => {
    if (mockSession && mockHydrated) {
      saveMockTranscript(sessionId, utterances);
    }
  }, [mockHydrated, mockSession, sessionId, utterances]);

  function appendUtterance(utterance: Utterance) {
    setUtterances((current) => [...current, utterance]);
  }

  /** Extend the streaming student bubble with the next token. */
  function appendStudentToken(token: string) {
    setUtterances((current) => {
      const last = current[current.length - 1];
      if (!last || last.role !== "student") {
        return [...current, { role: "student", text: token, ts: Date.now() }];
      }
      const updated = [...current];
      updated[updated.length - 1] = { ...last, text: last.text + token };
      return updated;
    });
  }

  async function refreshFromServer() {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (!res.ok) return;
      const session = (await res.json()) as Session;
      setSessionStatus(session.status);
      graphNodesRef.current = session.graph.nodes;
      setGraphStats({
        solid: session.graph.nodes.filter((n) => n.state === "solid").length,
        total: session.graph.nodes.length,
      });
    } catch {
      // Non-fatal: the stats card just stays a turn behind.
    }
  }

  async function sendMockTurn(userText: string) {
    appendUtterance({ role: "user", text: userText, ts: Date.now() });
    setStudentState("thinking");
    await new Promise((resolve) => setTimeout(resolve, 650));
    setStudentState("speaking");
    await new Promise((resolve) => setTimeout(resolve, 750));
    const shortText = userText.length > 72 ? `${userText.slice(0, 72)}...` : userText;
    appendUtterance({
      role: "student",
      text: `Hmm, I think I follow. When you say “${shortText}”, could you explain that with a simple example?`,
      ts: Date.now(),
    });
    setStudentState("listening");
  }

  async function sendRealTurn(userText: string) {
    appendUtterance({ role: "user", text: userText, ts: Date.now() });
    setStudentState("thinking");

    // Latency mask: if no reply audio/text within the threshold, Sam audibly thinks.
    if (voiceRepliesRef.current) {
      const clipUrl = pickThinkingNoise(lastDirectiveRef.current?.type ?? "PROBE");
      thinkingNoiseTimeoutRef.current = setTimeout(() => {
        if (shouldPlayThinkingNoise(1500)) {
          const clip = new Audio(clipUrl);
          thinkingNoiseRef.current = clip;
          clip.play().catch(() => {});
        }
      }, 1500);
    }

    const res = await fetch(`/api/session/${sessionId}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_text: userText }),
    });

    if (!res.ok) {
      stopThinkingNoise();
      const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (res.status === 409) throw new Error(ERROR_COPY.busy(profile.name));
      if (payload.error === "turn_cap_reached") throw new Error(payload.message ?? ERROR_COPY.ended(profile.name));
      if (payload.error === "session ended") throw new Error(ERROR_COPY.ended(profile.name));
      throw new Error(ERROR_COPY.send(profile.name));
    }

    // Tee tokens: transcript always, TTS when voice replies are unlocked.
    const tee = createTokenTee();
    const speaking =
      voiceRepliesRef.current && ttsRef.current
        ? ttsRef.current.speak(tee.stream()).catch(() => {
            // TTS failure (missing key, WS error) downgrades to text-only, silently.
            voiceRepliesRef.current = false;
            setStudentState("listening");
          })
        : null;

    let firstToken = true;
    for await (const event of consumeTurnStream(res)) {
      if (event.event === "token") {
        if (firstToken) {
          firstToken = false;
          stopThinkingNoise();
          if (!voiceRepliesRef.current) setStudentState("speaking");
        }
        appendStudentToken(event.data.text);
        tee.push(event.data.text);
      } else if (event.event === "done") {
        setSessionStatus(event.data.session_status);
        if (event.data.directive) lastDirectiveRef.current = event.data.directive;
        const focusId = event.data.directive?.node_id;
        setFocusName(
          focusId
            ? graphNodesRef.current.find((n) => n.id === focusId)?.name ?? null
            : null
        );
      } else if (event.event === "error") {
        // The backend already streamed the in-character fallback line as tokens.
        console.warn("[classroom] turn error:", event.data.message);
      }
    }
    tee.push(null);

    // Text mode wraps up now; voice mode stays "speaking" until playback ends.
    if (!speaking) setStudentState("listening");
    void refreshFromServer();
  }

  async function sendMessage(overrideText?: string) {
    const userText = (overrideText ?? message).trim();
    if (!userText || isSending || isEnding) return;
    if (!mockSession && sessionStatus === "ended") {
      setError(ERROR_COPY.ended(profile.name));
      return;
    }

    setIsSending(true);
    setError(null);
    setMessage("");
    try {
      if (mockSession) {
        await sendMockTurn(userText);
      } else {
        await sendRealTurn(userText);
      }
    } catch (caught) {
      stopThinkingNoise();
      setStudentState("listening");
      setError(caught instanceof Error ? caught.message : ERROR_COPY.send(profile.name));
    } finally {
      setIsSending(false);
    }
  }

  function toggleMic() {
    const stt = sttRef.current;
    if (!stt) return;
    if (micActive) {
      stt.stop();
      setMicActive(false);
      setPartialTranscript("");
      return;
    }
    // Mic click is the user gesture that unlocks audio playback — enable voice replies.
    voiceRepliesRef.current = true;
    setPartialTranscript("");
    stt.onPartial((text) => setPartialTranscript(text));
    stt.onFinal((finalText) => {
      stt.stop();
      setMicActive(false);
      setPartialTranscript("");
      if (finalText) void sendMessage(finalText);
    });
    stt.onError((msg) => {
      if (msg.includes("stopped") || msg.includes("aborted")) return;
      if (msg.includes("not supported")) setMicSupported(false);
      setMicActive(false);
      setError(msg);
    });
    setMicActive(true);
    stt.start(graphNodesRef.current.map((n) => n.name));
  }

  async function endConversation() {
    if (isEnding || isSending) return;
    if (mockSession) {
      router.push(`/session/${encodeURIComponent(sessionId)}/feedback?student=${student}`);
      return;
    }
    setIsEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error === "session has not started" ? ERROR_COPY.end(profile.name) : ERROR_COPY.end(profile.name));
      }
      router.push(`/session/${encodeURIComponent(sessionId)}/feedback?student=${student}`);
    } catch (caught) {
      setIsEnding(false);
      setError(caught instanceof Error ? caught.message : ERROR_COPY.end(profile.name));
    }
  }

  const live = sessionStatus !== "ended";

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-4xl">Teaching Session</h1>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg bg-[#eceef0] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
          <span className={`size-3 rounded-full ${live ? "bg-emerald-500" : "bg-gray-400"}`} /> {live ? (sessionStatus === "wrapping" ? "Wrapping Up" : "Live Session") : "Session Ended"}
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(230px,3fr)_minmax(0,9fr)]">
        <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1" aria-label={`${profile.name}'s profile and session stats`}>
          <StudentAvatar student={student} state={studentState} />
          <ComprehensionCard
            student={student}
            solid={graphStats.solid}
            total={graphStats.total}
            focusName={focusName}
          />
        </aside>

        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] lg:h-[700px]" aria-label="Classroom conversation">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] sm:text-base"><ChatIcon /> Conversation Flow</div>
            <button
              type="button"
              onClick={endConversation}
              disabled={isEnding || isSending}
              aria-label={`End conversation and see ${profile.name}'s gap map`}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#df6b71] bg-[#fff5f5] px-3 py-2 text-xs font-bold text-[#b83d45] transition hover:bg-[#ffe8e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c94c54] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              <EndConversationIcon />
              <span className="hidden xs:inline sm:inline">{isEnding ? "Wrapping up..." : "End Conversation"}</span>
              <span className="sm:hidden">{isEnding ? "..." : "End"}</span>
            </button>
          </div>
          {sessionStatus === "wrapping" ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 sm:px-5" role="status">
              💡 {profile.name} feels like they&apos;ve got the full picture — hit <strong>End Conversation</strong> when you&apos;re ready to see your gap map.
            </div>
          ) : null}
          <Transcript
            utterances={utterances}
            student={student}
            studentTyping={studentState === "thinking"}
          />
          {sessionStatus === "ended" && !mockSession ? (
            <div className="flex flex-col items-center gap-3 border-t border-[var(--card-border)] bg-white px-4 py-5 sm:flex-row sm:justify-between sm:px-6">
              <p className="text-sm text-[var(--text-secondary)]">Class dismissed — {profile.name} went home to think about what you said.</p>
              <button
                type="button"
                onClick={() => router.push(`/session/${encodeURIComponent(sessionId)}/report?student=${student}`)}
                className="rounded-lg bg-[#4648d4] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
              >
                View Understanding Map →
              </button>
            </div>
          ) : (
            <ClassroomComposer
              student={student}
              value={message}
              isSending={isSending || isEnding}
              error={error}
              micActive={micActive}
              micSupported={micSupported}
              partialTranscript={partialTranscript}
              onChange={setMessage}
              onSubmit={() => void sendMessage()}
              onMicToggle={toggleMic}
            />
          )}
        </section>
      </div>
    </div>
  );
}
