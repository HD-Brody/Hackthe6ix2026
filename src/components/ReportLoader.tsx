"use client";

/**
 * ReportLoader — shown on the report page while the gap map is still generating.
 *
 * Polls /api/session/:id every 2 seconds until gap_map appears, then reloads
 * the page so the server component re-renders with the full report.
 *
 * Why polling instead of a server-sent event?
 *   The gap map generation is a one-shot Gemini call fired from the end API.
 *   Polling every 2s is simple, reliable, and the wait is typically 3–8s total
 *   so we're looking at 2–4 poll cycles before the page reloads.
 */

import { useEffect, useState } from "react";

const MESSAGES = [
  "Grading your lesson notes…",
  "Mapping your explanation…",
  "Identifying the fuzzy bits…",
  "Connecting the concept dots…",
  "Reviewing your teaching moves…",
  "Almost there…",
];

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-10 animate-spin text-[#7776df]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function ReportLoader({
  sessionId,
  studentName,
}: {
  sessionId: string;
  studentName: string;
}) {
  const [msgIndex, setMsgIndex] = useState(0);

  // Cycle through friendly messages every 2.5s
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Poll the session API until gap_map is ready, then reload
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) break;
        try {
          const res = await fetch(`/api/session/${sessionId}`);
          if (!res.ok) break;
          const session = (await res.json()) as { gap_map?: unknown };
          if (session.gap_map) {
            // Gap map is ready — reload the page to get the full server render.
            window.location.reload();
            return;
          }
        } catch {
          // Network hiccup — keep polling
        }
      }
    }

    void poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <SpinnerIcon />
      <h1 className="font-heading mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Building your understanding map
      </h1>
      <p
        key={msgIndex}
        className="mt-3 text-sm leading-6 text-[var(--text-secondary)] transition-opacity duration-500 sm:text-base"
        aria-live="polite"
      >
        {MESSAGES[msgIndex]}
      </p>
      <p className="mt-5 text-xs text-[var(--text-secondary)]/60">
        {studentName} is reviewing your lesson — this takes about 5–10 seconds.
      </p>
    </main>
  );
}
