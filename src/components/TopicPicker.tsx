/**
 * Topic input + five demo-topic cards + Sam intro card. Owner: C (Block C1 step 2).
 */

"use client";

import { useState, type ReactNode } from "react";

type Topic = {
  title: string;
  description: string;
  accent: "green" | "indigo" | "purple" | "rose";
  icon: ReactNode;
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6 text-purple-600">
      <path d="M12 2.75c.5 3.25 2 4.75 5.25 5.25C14 8.5 12.5 10 12 13.25 11.5 10 10 8.5 6.75 8 10 7.5 11.5 6 12 2.75Z" fill="currentColor" />
      <path d="M5.5 12.5c.28 1.8 1.2 2.72 3 3-1.8.28-2.72 1.2-3 3-.28-1.8-1.2-2.72-3-3 1.8-.28 2.72-1.2 3-3Zm13 2c.23 1.47 1 2.23 2.5 2.5-1.5.27-2.27 1.03-2.5 2.5-.27-1.47-1.03-2.23-2.5-2.5 1.47-.27 2.23-1.03 2.5-2.5Z" fill="currentColor" />
    </svg>
  );
}

function LeafIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M19.5 4.5C12.2 4.6 6.5 6.8 6.5 12.2c0 3.1 2.2 5.3 5.1 5.3 4.9 0 7.5-5.1 7.9-13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M5 19c2.8-4.2 6-6.8 10-8.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function BrainIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M9 18.5a3 3 0 0 1-3-3 3.2 3.2 0 0 1 .6-1.9A3.5 3.5 0 0 1 8 7a4 4 0 0 1 8 0 3.5 3.5 0 0 1 1.4 6.6 3.2 3.2 0 0 1 .6 1.9 3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M9 7.2v12.3m6-12.3v12.3M9 11c1.7 0 3 1.3 3 3m3-3c-1.7 0-3 1.3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function AtomIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><ellipse cx="12" cy="12" rx="9" ry="3.8" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>;
}

function BookIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M4 5.5h6.3c1 0 1.7.7 1.7 1.7v11.3c0-1.1-.9-2-2-2H4V5.5Zm16 0h-6.3c-1 0-1.7.7-1.7 1.7v11.3c0-1.1.9-2 2-2h6V5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m6.5 8 3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

const topics: Topic[] = [
  { title: "Photosynthesis", description: "Explain how plants convert sunlight into chemical energy for Sam's biology quiz.", accent: "green", icon: <LeafIcon /> },
  { title: "Machine Learning", description: "Help Sam understand neural networks without the heavy math jargon.", accent: "indigo", icon: <BrainIcon /> },
  { title: "Quantum Physics", description: "Break down entanglement and superposition into simple, everyday analogies.", accent: "purple", icon: <AtomIcon /> },
  { title: "Canadian History", description: "Narrate the key moments of Confederation for Sam's upcoming social studies project.", accent: "rose", icon: <BookIcon /> },
];

const accentClasses = {
  green: "bg-emerald-50 text-emerald-500",
  indigo: "bg-indigo-100 text-[var(--brand)]",
  purple: "bg-purple-100 text-purple-600",
  rose: "bg-rose-100 text-rose-600",
};

function TopicCard({ topic, selected, onSelect }: { topic: Topic; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex min-h-48 w-full flex-col items-start gap-2 rounded-xl border bg-white p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${selected ? "border-[var(--brand)] shadow-md" : "border-[var(--card-border)]"}`}
    >
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${accentClasses[topic.accent]}`}>
        {topic.icon}
      </span>
      <span className="mt-1">
        <span className="font-heading block text-xl font-semibold leading-8 text-[var(--text-primary)] sm:text-2xl">
          {topic.title}
        </span>
        <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          {topic.description}
        </span>
      </span>
    </button>
  );
}

export function TopicPicker() {
  const [topic, setTopic] = useState("");

  return (
    <div className="mt-8 w-full max-w-6xl sm:mt-10">
      <label className="relative mx-auto block max-w-3xl">
        <span className="sr-only">What do you want to teach today?</span>
        <span className="pointer-events-none absolute inset-y-0 left-6 flex items-center text-[var(--text-muted)]">
          <SearchIcon />
        </span>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="What do you want to teach today?"
          className="h-20 w-full rounded-xl border border-slate-500 bg-white/95 pl-16 pr-5 text-lg font-semibold text-[var(--text-primary)] shadow-[0_20px_25px_-5px_rgba(96,99,238,0.05),0_8px_10px_-6px_rgba(96,99,238,0.05)] outline-none transition placeholder:text-[#c7c4d7] focus:border-[var(--brand)] focus:ring-4 focus:ring-indigo-100 sm:text-2xl"
        />
      </label>

      <section className="mt-20 sm:mt-24" aria-labelledby="popular-topics-heading">
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <h2 id="popular-topics-heading" className="font-heading text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
            Popular with Professors
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:grid-cols-2">
          {topics.map((item) => (
            <TopicCard key={item.title} topic={item} selected={topic === item.title} onSelect={() => setTopic(item.title)} />
          ))}
        </div>
      </section>
    </div>
  );
}
