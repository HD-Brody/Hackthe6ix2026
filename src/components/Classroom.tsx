"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { Utterance } from "@/lib/types";
import { studentProfiles, type StudentId } from "@/lib/studentProfiles";
import { MicButton } from "@/components/MicButton";
import { StudentAvatar } from "@/components/StudentAvatar";
import { Transcript } from "@/components/Transcript";
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

function sampleConversation(name: string): Utterance[] {
  const time = (hour: number, minute: number) => new Date(2026, 6, 18, hour, minute).getTime();
  return [
    {
      role: "user",
      text: `Alright ${name}, let's start with the basics. Photosynthesis is how plants turn sunlight, water, and carbon dioxide into food. Think of it like a solar-powered kitchen!`,
      ts: time(10, 2),
    },
    {
      role: "student",
      text: "Wait, so how does the plant actually get the light? Do they have sensors or something?",
      ts: time(10, 3),
    },
    {
      role: "user",
      text: "Exactly! They have special pigments called chlorophyll inside their cells. These pigments absorb the light energy.",
      ts: time(10, 4),
    },
    {
      role: "student",
      text: "I'm a bit confused about the 'chlorophyll' part. Why does it look green? If it absorbs light, shouldn't it be black like a solar panel?",
      ts: time(10, 4),
    },
    {
      role: "student",
      text: "Can you explain with an example? Like, what happens when it's cloudy?",
      ts: time(10, 5),
    },
  ];
}

function ComprehensionCard({ student }: { student: StudentId }) {
  const profile = studentProfiles[student];
  return (
    <section className="rounded-lg bg-[var(--brand)] p-5 text-white shadow-lg">
      <p className="text-sm font-semibold text-white/80">Comprehension Level</p>
      <p className="font-heading mt-1 text-3xl font-bold">68%</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-[68%] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
      </div>
      <p className="mt-4 text-xs leading-5 text-white/90">{profile.name} is currently processing the light-dependent reactions of photosynthesis.</p>
    </section>
  );
}

function ClassroomComposer({
  student,
  value,
  isSending,
  error,
  onChange,
  onSubmit,
}: {
  student: StudentId;
  value: string;
  isSending: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
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
          placeholder={`Explain this concept to ${profile.name}...`}
          rows={1}
          value={value}
          disabled={isSending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 sm:text-base"
        />
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Attach a file. Attachments are not connected yet." className="flex size-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-white hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><PaperclipIcon /></button>
          <MicButton />
          <button type="submit" disabled={isSending || !value.trim()} aria-label="Send message" className="flex size-10 items-center justify-center rounded-lg bg-[#4648d4] text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><SendIcon /></button>
        </div>
      </div>
      {error ? <p role="alert" className="mt-2 px-1 text-sm font-medium text-red-600">{error}</p> : null}
    </form>
  );
}

export function Classroom({
  sessionId,
  student,
}: {
  sessionId: string;
  student: StudentId;
}) {
  const profile = studentProfiles[student];
  const mockSession = isMockSessionId(sessionId);
  const [utterances, setUtterances] = useState<Utterance[]>(() =>
    mockSession ? [] : sampleConversation(profile.name)
  );
  const [message, setMessage] = useState("");
  const [studentState, setStudentState] = useState<"listening" | "thinking" | "speaking">("listening");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockHydrated, setMockHydrated] = useState(!mockSession);

  useEffect(() => {
    if (!mockSession) return;
    const storedSession = readMockSession(sessionId);
    setUtterances(storedSession?.utterances ?? []);
    setMockHydrated(true);
  }, [mockSession, sessionId]);

  useEffect(() => {
    if (mockSession && mockHydrated) {
      saveMockTranscript(sessionId, utterances);
    }
  }, [mockHydrated, mockSession, sessionId, utterances]);

  function appendUtterance(utterance: Utterance) {
    setUtterances((current) => [...current, utterance]);
  }

  async function sendMessage() {
    const userText = message.trim();
    if (!userText || isSending) return;

    setIsSending(true);
    setError(null);
    setMessage("");
    appendUtterance({ role: "user", text: userText, ts: Date.now() });
    setStudentState("thinking");

    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      setStudentState("speaking");
      await new Promise((resolve) => setTimeout(resolve, 750));

      const shortText = userText.length > 72
        ? `${userText.slice(0, 72)}...`
        : userText;
      appendUtterance({
        role: "student",
        text: `Hmm, I think I follow. When you say “${shortText}”, could you explain that with a simple example?`,
        ts: Date.now(),
      });
    } catch {
      setError("The mock student could not respond. Please try again.");
    } finally {
      setStudentState("listening");
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-4xl">Teaching Session</h1>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg bg-[#eceef0] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">
          <span className="size-3 rounded-full bg-emerald-500" /> Live Session
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(230px,3fr)_minmax(0,9fr)]">
        <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1" aria-label={`${profile.name}'s profile and session stats`}>
          <StudentAvatar student={student} state={studentState} />
          <ComprehensionCard student={student} />
        </aside>

        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] lg:h-[700px]" aria-label="Classroom conversation">
          <div className="border-b border-[var(--card-border)] bg-white/80 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] sm:text-base"><ChatIcon /> Conversation Flow</div>
          </div>
          <Transcript utterances={utterances} student={student} />
          <ClassroomComposer
            student={student}
            value={message}
            isSending={isSending}
            error={error}
            onChange={setMessage}
            onSubmit={sendMessage}
          />
        </section>
      </div>
    </div>
  );
}
