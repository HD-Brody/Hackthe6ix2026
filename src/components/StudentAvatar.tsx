/**
 * Student avatar + the three state indicators used all weekend:
 * listening / thinking (animated) / speaking. Owner: C (Block C1 step 4).
 * Transitions are faked until CP3; D's audio pipeline drives `speaking` after.
 */

"use client";

import Image from "next/image";
import { studentProfiles, type StudentId } from "@/lib/studentProfiles";

export type StudentState = "listening" | "thinking" | "speaking";

const states: Array<{
  id: StudentState;
  label: string;
  color: string;
}> = [
  { id: "listening", label: "Listening", color: "bg-emerald-500" },
  { id: "thinking", label: "Thinking", color: "bg-amber-400" },
  { id: "speaking", label: "Speaking", color: "bg-indigo-400" },
];

export function StudentAvatar({
  student,
  state,
}: {
  student: StudentId;
  state: StudentState;
}) {
  const profile = studentProfiles[student];

  return (
    <section className="rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-5 py-6 shadow-[0_4px_10px_var(--shadow-color)]">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Image
            src={profile.image}
            alt={profile.name}
            width={128}
            height={128}
            priority
            className="size-28 rounded-full border-4 border-[var(--surface-elevated)] object-cover shadow-lg sm:size-32"
          />
          <span className="absolute bottom-1 right-1 size-6 rounded-full border-4 border-[var(--surface)] bg-emerald-500" aria-label="Online" />
        </div>
        <h2 className="font-heading mt-3 text-2xl font-semibold text-[var(--text-primary)]">{profile.name}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)] sm:text-base">AI Learning Companion</p>
      </div>

      <div className="mt-5 space-y-3 border-t border-[var(--card-border)] pt-5" aria-label={`${profile.name}'s current status`}>
        {states.map((item) => {
          const active = state === item.id;
          return (
            <div key={item.id} className={`flex items-center justify-between ${active ? "opacity-100" : "opacity-40"}`}>
              <div className="flex items-center gap-3">
                <span className={`size-3 rounded-full ${item.color}`} />
                <span className="text-sm text-[var(--text-primary)] sm:text-base">{item.label}</span>
              </div>
              {active ? <span aria-label="Active" className="text-xs text-[var(--text-secondary)]">✓</span> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
