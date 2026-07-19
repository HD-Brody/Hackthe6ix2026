"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  studentProfiles,
  type StudentId,
} from "@/lib/studentProfiles";
import { createMockSession, isForcedMockMode } from "@/lib/mockSession";

type CuriosityLevel = "low" | "medium" | "high";

const students = Object.values(studentProfiles);

/** Pre-rendered ElevenLabs clip (the actual student voice) used as the preview. */
const VOICE_PREVIEW_CLIP = "/audio/curious-oh.mp3";

const curiosityLevels: Array<{ id: CuriosityLevel; label: string }> = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function PlayIcon() {
  return <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3"><path d="m3.5 2.5 5 3.5-5 3.5v-7Z" fill="currentColor" /></svg>;
}

function ArrowRightIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function StudentPortrait({ student }: { student: StudentId }) {
  const profile = studentProfiles[student];
  return (
    <Image
      src={profile.image}
      alt={profile.name}
      width={104}
      height={104}
      priority
      className="relative z-10 size-24 rounded-full object-cover sm:size-[104px]"
    />
  );
}

export function StudentSelector({ topic }: { topic: string }) {
  const [student, setStudent] = useState<StudentId>("sam");
  const [curiosity, setCuriosity] = useState<CuriosityLevel>("medium");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function startTeaching() {
    if (isCreating) return;

    const selectedTopic = topic.trim();
    if (!selectedTopic) {
      setError("Choose a topic before starting a teaching session.");
      return;
    }

    setIsCreating(true);
    setError(null);

    if (isForcedMockMode) {
      const mockSession = createMockSession(selectedTopic, student);
      router.push(`/session/${mockSession.id}?student=${student}`);
      return;
    }

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selectedTopic, student }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        session_id?: string;
        error?: string;
      };

      if (!response.ok || !payload.session_id) {
        throw new Error(payload.error || "Unable to create a teaching session.");
      }

      router.push(`/session/${payload.session_id}?student=${student}`);
    } catch (caught) {
      // No silent mock fallback: a failed session must LOOK failed, or a demo
      // outage gets papered over with a fake student. (NEXT_PUBLIC_MOCK_MODE
      // still forces mock sessions explicitly for frontend-only dev.)
      console.warn("[student-selector] session create failed:", caught);
      setError(
        `${students.find((s) => s.id === student)?.name ?? "Your student"} couldn't make it to class — check your connection and try again.`
      );
      setIsCreating(false);
    }
  }

  return (
    <div className="flex w-full max-w-[762px] flex-col items-center">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">Choose Your AI Student</h1>
        <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Customize your learning companion to match your teaching style.</p>
        {topic ? <p className="sr-only">Selected topic: {topic}</p> : null}
      </div>

      <fieldset className="mt-7 w-full sm:mt-8">
        <legend className="sr-only">Choose a student</legend>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {students.map((item) => {
            const selected = student === item.id;
            return (
              <div key={item.id} className={`relative flex min-h-[218px] flex-col items-center justify-center rounded-xl border-2 bg-white p-5 transition ${selected ? "border-[#4648d4] shadow-[0_0_0_4px_rgba(70,72,212,0.1)]" : "border-[var(--card-border)]"}`}>
                <label className="flex cursor-pointer flex-col items-center focus-within:outline-none">
                  <input type="radio" name="student" value={item.id} checked={selected} onChange={() => setStudent(item.id)} className="peer sr-only" />
                  <StudentPortrait student={item.id} />
                  <span className={`font-heading relative z-10 mt-2 text-sm font-semibold sm:text-base ${selected ? "text-[#4648d4]" : "text-[var(--text-primary)]"}`}>{item.name}</span>
                  <span className="absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand)] peer-focus-visible:ring-offset-2" aria-hidden="true" />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    // Pre-rendered ElevenLabs clip — this IS the student's real voice.
                    new Audio(VOICE_PREVIEW_CLIP).play().catch(() => {});
                  }}
                  aria-label={`Preview ${item.name}'s voice`}
                  className="relative z-10 mt-1 flex items-center gap-1 rounded-full bg-[#9c48ea] px-3 py-1 text-[10px] font-medium text-white transition hover:bg-[#8127cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                >
                  <PlayIcon /> Preview Voice
                </button>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7 w-full rounded-xl border border-[var(--card-border)] bg-white p-5 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:mt-8">
        <legend className="sr-only">Curiosity level</legend>
        <p aria-hidden="true" className="text-center text-sm font-semibold tracking-[0.05em] text-[var(--text-secondary)]">CURIOSITY LEVEL</p>
        <div className="mt-2.5 grid grid-cols-3 rounded-xl bg-[var(--surface-muted)] p-1.5">
          {curiosityLevels.map((level) => {
            const selected = curiosity === level.id;
            return (
              <label key={level.id} className={`cursor-pointer rounded-lg px-2 py-2.5 text-center text-sm font-semibold transition focus-within:ring-2 focus-within:ring-[var(--brand)] ${selected ? "bg-white font-bold text-[#4648d4] shadow-[0_1px_1px_rgba(0,0,0,0.05)]" : "text-[var(--text-primary)] hover:bg-white/60"}`}>
                <input type="radio" name="curiosity" value={level.id} checked={selected} onChange={() => setCuriosity(level.id)} className="sr-only" />
                {level.label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-center text-xs italic leading-5 text-[var(--text-secondary)]">Determines how often the student asks clarifying questions.</p>
      </fieldset>

      <button
        type="button"
        onClick={startTeaching}
        disabled={isCreating}
        aria-describedby="confirm-help"
        className="font-heading mt-7 flex items-center gap-3 rounded-xl bg-[#4648d4] px-9 py-4 font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:mt-8 sm:px-11"
      >
        {isCreating ? "Creating Classroom..." : "Confirm & Start Teaching"}
        {!isCreating ? <ArrowRightIcon /> : null}
      </button>
      <p id="confirm-help" className="sr-only">Creates a classroom for the selected topic and student.</p>
      {error ? <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
