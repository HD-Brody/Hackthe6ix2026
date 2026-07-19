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
import {
  computeComprehensionStats,
  type ComprehensionStats,
} from "@/lib/comprehension";
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
import { readPendingNotes, clearPendingNotes } from "@/lib/sessionNotes";
import Image from "next/image";

const CREATION_MESSAGES = [
  "Setting up the desk and board...",
  "Reading your uploaded syllabus...",
  "Mapping out the learning path...",
  "Generating curiosity levels...",
  "Waiting for student to take a seat...",
];

function ChatIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 text-[var(--brand)]"><path d="M4 5h16v11H8l-4 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
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
  stats,
  focusName,
}: {
  student: StudentId;
  stats: ComprehensionStats;
  focusName: string | null;
}) {
  const profile = studentProfiles[student];
  const pct = stats.score;
  return (
    <section className="rounded-lg bg-[var(--brand)] p-5 text-white shadow-lg">
      <p className="eyebrow eyebrow-inverse">Understanding</p>
      <p className="font-heading mt-1 text-3xl font-bold">
        {pct !== null ? `${pct}%` : "—"}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-700"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-white/90">
        {stats.discussed > 0
          ? `${stats.discussed} explored · ${stats.solid} solid${focusName ? ` — ${profile.name} is currently curious about ${focusName}.` : "."}`
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
    <form onSubmit={submit} className="border-t border-[var(--card-border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
      <div className="flex items-end gap-2 rounded-xl bg-[var(--surface-input)] p-2">
        <textarea
          aria-label={`Explain this concept to ${profile.name}`}
          placeholder={
            micActive
              ? "Listening — start explaining out loud..."
              : `Explain this concept to ${profile.name}...`
          }
          rows={1}
          value={micActive ? partialTranscript : value}
          disabled={isSending || micActive}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 sm:text-base"
        />
        <div className="flex items-center gap-1">
          <MicButton
            active={micActive}
            disabled={isSending || !micSupported}
            onClick={onMicToggle}
          />
          <button type="submit" disabled={isSending || micActive || !value.trim()} aria-label="Send message" className="flex size-10 items-center justify-center rounded-lg bg-[var(--chat-user)] text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><SendIcon /></button>
        </div>
      </div>
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
      for (; ;) {
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
  initialTopic,
  initialCuriosity,
  shouldCreate = false,
}: {
  sessionId: string;
  student: StudentId;
  initialTopic?: string;
  initialCuriosity?: string;
  shouldCreate?: boolean;
}) {
  const profile = studentProfiles[student];
  const router = useRouter();
  const mockSession = isMockSessionId(sessionId);

  const [isInitializing, setIsInitializing] = useState(shouldCreate);
  const [creationMsgIndex, setCreationMsgIndex] = useState(0);
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [message, setMessage] = useState("");
  const [studentState, setStudentState] = useState<"listening" | "thinking" | "speaking">("listening");
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("teaching");
  const [comprehensionStats, setComprehensionStats] = useState<ComprehensionStats>(
    computeComprehensionStats([])
  );
  const [focusName, setFocusName] = useState<string | null>(null);
  const [mockHydrated, setMockHydrated] = useState(!mockSession);
  const [micActive, setMicActive] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [partialTranscript, setPartialTranscript] = useState("");

  // Voice plumbing — created once. TTS unlocks on the first Send click or mic
  // click (user gesture required by browser autoplay policy), then every reply
  // streams to both the transcript and ElevenLabs.
  const sttRef = useRef<STTClient | null>(null);
  const ttsRef = useRef<TTSClient | null>(null);
  const voiceRepliesRef = useRef(false);
  const thinkingNoiseRef = useRef<HTMLAudioElement | null>(null);
  const thinkingNoiseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDirectiveRef = useRef<Directive | null>(null);
  const graphNodesRef = useRef<Session["graph"]["nodes"]>([]);
  const openingFiredRef = useRef(false);
  const autoEndFiredRef = useRef(false);
  const [needsOpening, setNeedsOpening] = useState(false);

  const stopThinkingNoise = useCallback(() => {
    thinkingNoiseRef.current?.pause();
    thinkingNoiseRef.current = null;
    if (thinkingNoiseTimeoutRef.current) {
      clearTimeout(thinkingNoiseTimeoutRef.current);
      thinkingNoiseTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isInitializing) return;
    const id = setInterval(() => {
      setCreationMsgIndex((i) => (i + 1) % CREATION_MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [isInitializing]);

  useEffect(() => {
    const stt = createSTTClient();
    const tts = createTTSClient(profile.voiceId);
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
  }, [stopThinkingNoise, profile.voiceId]);

  const applySession = useCallback((session: Session) => {
    setUtterances(session.utterances);
    setSessionStatus(session.status);
    graphNodesRef.current = session.graph.nodes;
    setComprehensionStats(computeComprehensionStats(session.graph.nodes));
    setNeedsOpening(
      !!session.prior_gap_context && session.utterances.length === 0
    );
    if (session.pending_directive) {
      lastDirectiveRef.current = session.pending_directive;
    }
  }, []);

  // Refresh recovery or background creation:
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
        if (shouldCreate) {
          const sourceNotes = readPendingNotes();
          const response = await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              topic: initialTopic,
              student,
              curiosity: initialCuriosity,
              ...(sourceNotes ? { source_notes: sourceNotes } : {}),
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as {
            session_id?: string;
            error?: string;
          };

          if (!response.ok || !payload.session_id) {
            throw new Error(payload.error || "Unable to create a teaching session.");
          }

          clearPendingNotes();

          // The API might return graph and other fields, but we should do a GET to make sure
          // we have the complete session object. Actually, the POST returns { session_id, graph }.
          // Let's do a fresh GET to get the full session.
          const loadRes = await fetch(`/api/session/${sessionId}`);
          if (!loadRes.ok) throw new Error("Could not load the newly created session.");
          const session = (await loadRes.json()) as Session;
          if (!cancelled) {
            applySession(session);
            setIsInitializing(false);
          }
        } else {
          // Normal load
          const loadRes = await fetch(`/api/session/${sessionId}`);
          if (!loadRes.ok) throw new Error("Classroom session not found.");
          const session = (await loadRes.json()) as Session;
          if (!cancelled) {
            applySession(session);
            setIsInitializing(false);
          }
        }
      } catch (caught) {
        console.error("[classroom] session initialization failed:", caught);
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : `${profile.name} couldn't make it to class — check your connection and try again.`
          );
          setIsInitializing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession, mockSession, profile.name, sessionId, shouldCreate, initialTopic, initialCuriosity, student]);

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
      setComprehensionStats(computeComprehensionStats(session.graph.nodes));
    } catch {
      // Non-fatal: the stats card just stays a turn behind.
    }
  }

  async function playBridgingOpening() {
    setStudentState("thinking");

    const res = await fetch(`/api/session/${sessionId}/opening`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (payload.error === "opening already played") return;
      if (payload.error === "turn already in progress") {
        throw new Error(ERROR_COPY.busy(profile.name));
      }
      throw new Error(ERROR_COPY.send(profile.name));
    }

    const tee = createTokenTee();
    const speaking =
      voiceRepliesRef.current && ttsRef.current
        ? ttsRef.current.speak(tee.stream()).catch(() => {
          voiceRepliesRef.current = false;
          setStudentState("listening");
        })
        : null;

    let firstToken = true;
    for await (const event of consumeTurnStream(res)) {
      if (event.event === "token") {
        if (firstToken) {
          firstToken = false;
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
        console.warn("[classroom] opening error:", event.data.message);
      }
    }
    tee.push(null);

    if (!speaking) setStudentState("listening");
    void refreshFromServer();
  }

  useEffect(() => {
    if (mockSession || !needsOpening || openingFiredRef.current || isSending) return;
    openingFiredRef.current = true;
    setIsSending(true);
    setError(null);
    void playBridgingOpening()
      .catch((caught) => {
        setStudentState("listening");
        setError(
          caught instanceof Error ? caught.message : ERROR_COPY.send(profile.name)
        );
      })
      .finally(() => setIsSending(false));
  }, [mockSession, needsOpening, isSending, profile.name, sessionId]);

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
          clip.play().catch(() => { });
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

    // Tee tokens into the transcript and TTS (voice replies unlocked on send/mic).
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

    // Sync with the click/Enter (or prior mic gesture) that triggered this send —
    // unlock autoplay so speak() after the async turn fetch is allowed.
    ttsRef.current?.unlock();
    voiceRepliesRef.current = true;

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
    // Mic click unlocks autoplay and enables spoken replies for this session.
    ttsRef.current?.unlock();
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
    const feedbackUrl = `/session/${encodeURIComponent(sessionId)}/feedback?student=${student}`;
    if (mockSession) {
      router.push(feedbackUrl);
      return;
    }
    setIsEnding(true);
    setError(null);
    // Fire the end API in the background — the feedback page doesn't need
    // the gap map (only the report page does). Navigate immediately so the
    // user isn't waiting on Gemini's gap-map generation just to see the
    // star-rating screen.
    router.prefetch(feedbackUrl);

    fetch(`/api/session/${sessionId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch((err) => {
      // Non-fatal: gap map generation failed, but the session is still ending.
      console.warn("[classroom] end API failed:", err);
    });

    router.push(feedbackUrl);
  }

  // Sam wrapping up (either the graph is fully covered, or the user just
  // said they're done teaching — see turnPolicy.ts) means the session should
  // finish itself instead of waiting on a manual "End Conversation" click.
  // Wait for studentState to settle back to "listening" so this only fires
  // once Sam's closing line has actually finished playing/rendering — firing
  // the moment sessionStatus flips would cut voice playback off mid-sentence.
  useEffect(() => {
    if (mockSession) return;
    if (sessionStatus !== "wrapping") return;
    if (studentState !== "listening") return;
    if (autoEndFiredRef.current) return;
    autoEndFiredRef.current = true;
    const timer = setTimeout(() => {
      void endConversation();
    }, 1600);
    return () => clearTimeout(timer);
  }, [mockSession, sessionStatus, studentState]);

  if (isInitializing) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
        <div className="relative mb-6">
          <div className="rounded-full bg-[var(--brand-soft)] p-2 shadow-xl animate-pulse">
            <Image
              src={profile.image}
              alt={profile.name}
              width={112}
              height={112}
              priority
              className="size-24 rounded-full border-4 border-[var(--surface)] object-cover"
            />
          </div>
          <span className="absolute bottom-1 right-1 flex size-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand)] opacity-75"></span>
            <span className="relative inline-flex rounded-full size-5 bg-[var(--brand)]"></span>
          </span>
        </div>
        <h2 className="font-heading text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Preparing the classroom
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
          {profile.name} is getting ready for your session...
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <svg aria-hidden="true" className="size-5 animate-spin text-[var(--brand)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm font-semibold text-[var(--brand)] tracking-wide uppercase">
              {CREATION_MESSAGES[creationMsgIndex]}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error && utterances.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
        <div className="rounded-full bg-red-100 p-4 text-red-600 mb-4">
          <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-bold text-[var(--text-primary)]">
          Classroom setup failed
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          {error}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
          >
            Go back
          </button>
          {shouldCreate && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]"
            >
              Retry Setup
            </button>
          )}
        </div>
      </div>
    );
  }

  const live = sessionStatus !== "ended";

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:text-4xl">Teaching Session</h1>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg bg-[var(--surface-input)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
          <span className={`size-3 rounded-full ${live ? "bg-emerald-500" : "bg-gray-400"}`} /> {live ? (sessionStatus === "wrapping" ? "Wrapping Up" : "Live Session") : "Session Ended"}
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(230px,3fr)_minmax(0,9fr)]">
        <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1" aria-label={`${profile.name}'s profile and session stats`}>
          <StudentAvatar student={student} state={studentState} />
          <ComprehensionCard
            student={student}
            stats={comprehensionStats}
            focusName={focusName}
          />
        </aside>

        <section className="flex min-h-[555px] flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface)] shadow-[0_4px_20px_var(--shadow-color)] lg:h-[535px]" aria-label="Classroom conversation">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] bg-[var(--surface)]/80 px-4 py-3 backdrop-blur-sm sm:px-5">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"><ChatIcon /> Conversation Flow</div>
            <button
              type="button"
              onClick={endConversation}
              disabled={isEnding || isSending}
              aria-label={`End conversation and see ${profile.name}'s gap map`}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--danger-text)]/40 bg-[var(--danger-surface)] px-3 py-2 text-xs font-bold text-[var(--danger-text)] transition hover:bg-[var(--danger-surface)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-text)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              <EndConversationIcon />
              <span className="hidden xs:inline sm:inline">{isEnding ? "Wrapping up..." : "End Conversation"}</span>
              <span className="sm:hidden">{isEnding ? "..." : "End"}</span>
            </button>
          </div>
          {sessionStatus === "wrapping" ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 sm:px-5" role="status">
              💡 {profile.name} feels like they&apos;ve got the full picture — wrapping up the session now, or hit <strong>End Conversation</strong> to finish right away.
            </div>
          ) : null}
          <Transcript
            utterances={utterances}
            student={student}
            studentTyping={studentState === "thinking"}
          />
          {sessionStatus === "ended" && !mockSession ? (
            <div className="flex flex-col items-center gap-3 border-t border-[var(--card-border)] bg-[var(--surface)] px-4 py-5 sm:flex-row sm:justify-between sm:px-6">
              <p className="text-sm text-[var(--text-secondary)]">Class dismissed — {profile.name} went home to think about what you said.</p>
              <button
                type="button"
                onClick={() => router.push(`/session/${encodeURIComponent(sessionId)}/report?student=${student}`)}
                className="rounded-lg bg-[var(--chat-user)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
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
