/**
 * Transcript pane — user right, student left. Owner: C (Block C1 step 3).
 * Streams in tokens via consumeTurnStream (src/lib/sse.ts) in C2.
 */

"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Utterance } from "@/lib/types";
import { studentProfiles, type StudentId } from "@/lib/studentProfiles";

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function TypingIndicator({ image }: { image: string }) {
  return (
    <div className="flex gap-3">
      <Image src={image} alt="" width={40} height={40} className="size-9 shrink-0 rounded-full border-2 border-[var(--surface)] object-cover shadow-sm sm:size-10" />
      <div className="flex items-center gap-1 rounded-xl bg-[var(--chat-student)] px-4 py-3 shadow-sm" aria-label="Student is thinking">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-2 animate-bounce rounded-full bg-[var(--text-secondary)]/50"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function Transcript({
  utterances,
  student,
  studentTyping = false,
}: {
  utterances: Utterance[];
  student: StudentId;
  studentTyping?: boolean;
}) {
  const profile = studentProfiles[student];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [utterances, studentTyping]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-label="Conversation transcript">
      {utterances.map((utterance, index) => {
        const isUser = utterance.role === "user";
        return (
          <div key={`${utterance.ts}-${index}`} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser ? (
              <Image src={profile.image} alt="" width={40} height={40} className="size-9 shrink-0 rounded-full border-2 border-[var(--surface)] object-cover shadow-sm sm:size-10" />
            ) : null}
            <div className={`flex max-w-[86%] flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div className={`rounded-xl px-4 py-3 text-sm leading-6 shadow-sm sm:text-base ${isUser ? "bg-[var(--chat-user)] text-white" : "bg-[var(--chat-student)] italic text-[var(--text-secondary)]"}`}>
                {utterance.text}
              </div>
              <time className="mt-1 px-1 text-[10px] text-[var(--text-secondary)]" dateTime={new Date(utterance.ts).toISOString()}>
                {formatTime(utterance.ts)}
              </time>
            </div>
          </div>
        );
      })}
      {studentTyping ? <TypingIndicator image={profile.image} /> : null}
    </div>
  );
}
