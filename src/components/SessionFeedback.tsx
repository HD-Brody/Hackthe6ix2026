"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { StudentProfile } from "@/lib/studentProfiles";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8" fill={filled ? "currentColor" : "none"}>
      <path d="m12 2.8 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17l-5.56 2.92 1.06-6.2L3 9.33l6.22-.9L12 2.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function MapIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]"><path d="m3.5 5.5 5-2 7 2 5-2v15l-5 2-7-2-5 2v-15Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8.5 3.5v15M15.5 5.5v15" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

function DashboardIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]"><rect x="3.5" y="3.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="3.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1.7"/><rect x="3.5" y="14" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1.7"/><rect x="14" y="14" width="6.5" height="6.5" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

export function SessionFeedback({ profile, sessionId }: { profile: StudentProfile; sessionId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function submitFeedback() {
    if (rating === 0 || submitState === "saving" || submitState === "saved") return;
    setSubmitState("saving");
    // Mock (demo-*) sessions have no backend doc — accept locally.
    if (sessionId.startsWith("demo-")) {
      setSubmitState("saved");
      return;
    }
    try {
      const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      setSubmitState(res.ok ? "saved" : "failed");
    } catch {
      setSubmitState("failed");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 py-6 sm:px-8 sm:py-7">
      <section className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="rounded-full bg-[#e1e0ff] p-1.5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
            <Image src={profile.image} alt={profile.name} width={160} height={160} priority className="size-32 rounded-full border-4 border-white object-cover sm:size-36" />
          </div>
          <span className="absolute bottom-3 right-3 size-7 rounded-full border-4 border-white bg-emerald-500" aria-label={`${profile.name} is online`} />
        </div>
        <h1 className="font-heading mt-4 max-w-2xl text-xl font-extrabold tracking-tight sm:text-2xl sm:leading-8">
          Great Session! How was {profile.name}&apos;s learning today?
        </h1>
        {/* Never confirm correctness — only the gap map renders verdicts. */}
        <p className="mt-1.5 text-sm font-medium italic text-[#8127cf] sm:text-base">
          “Whew, that was a lot — I need a minute to let it all sink in.” — {profile.name}
        </p>
      </section>

      <section className="mt-5 w-full rounded-2xl border border-[#e6e8ea] bg-white p-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)] sm:p-6" aria-label="Session feedback form">
        <fieldset className="flex flex-col items-center">
          <legend className="w-full text-center text-sm font-semibold text-[#464554]">Rate the session clarity</legend>
          <div className="mt-2 flex gap-1 text-[#c7c4d7]" role="radiogroup" aria-label="Session clarity rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} out of 5 stars`} onClick={() => setRating(value)} className={`rounded p-0.5 transition hover:scale-110 hover:text-[#f1bd43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${value <= rating ? "text-[#f1bd43]" : ""}`}>
                <StarIcon filled={value <= rating} />
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]" htmlFor="session-feedback">Any additional feedback? (optional)</label>
        <textarea
          id="session-feedback"
          rows={2}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          disabled={submitState === "saved"}
          placeholder="How can I improve my teaching?"
          className="mt-2 min-h-20 w-full resize-y rounded-xl border-0 bg-[#f2f4f6] px-4 py-3 text-sm outline-none placeholder:text-[#6b7280] focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:opacity-60"
        />

        {submitState === "saved" ? (
          <p className="mt-3 text-center text-sm font-medium text-emerald-700" role="status">Noted in {profile.name}&apos;s diary. Thanks!</p>
        ) : (
          <button
            type="button"
            onClick={submitFeedback}
            disabled={rating === 0 || submitState === "saving"}
            className="mt-3 w-full rounded-xl border border-[#c7c4d7] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[#f7f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitState === "saving" ? "Saving..." : submitState === "failed" ? "Couldn't save — try again" : rating === 0 ? "Pick a star rating first" : "Submit feedback"}
          </button>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Link href={`/session/${encodeURIComponent(sessionId)}/report?student=${profile.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4648d4] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"><MapIcon /> View Understanding Map</Link>
          <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c7c4d7] bg-[#f2f4f6] px-4 py-3 text-sm font-semibold text-[#4648d4] transition hover:bg-[#e8e9ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"><DashboardIcon /> Return to Main</Link>
        </div>
      </section>
    </main>
  );
}
