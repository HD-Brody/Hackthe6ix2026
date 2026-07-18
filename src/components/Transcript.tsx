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

export function Transcript({
  utterances,
  student,
}: {
  utterances: Utterance[];
  student: StudentId;
}) {
  const profile = studentProfiles[student];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [utterances]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-label="Conversation transcript">
      {utterances.map((utterance, index) => {
        const isUser = utterance.role === "user";
        return (
          <div key={`${utterance.ts}-${index}`} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser ? (
              <Image src={profile.image} alt="" width={40} height={40} className="size-9 shrink-0 rounded-full border-2 border-white object-cover shadow-sm sm:size-10" />
            ) : null}
            <div className={`flex max-w-[86%] flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div className={`rounded-xl px-4 py-3 text-sm leading-6 shadow-sm sm:text-base ${isUser ? "bg-[#4648d4] text-white" : "bg-[#eceef0] italic text-[var(--text-secondary)]"}`}>
                {utterance.text}
              </div>
              <time className="mt-1 px-1 text-[10px] text-[var(--text-secondary)]" dateTime={new Date(utterance.ts).toISOString()}>
                {formatTime(utterance.ts)}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
