/**
 * Topic input + five demo-topic cards + notes drop zone. Owner: C (Block C1 step 2).
 */

"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { storePendingNotes } from "@/lib/sessionNotes";

type Topic = {
  title: string;
  description: string;
  accent: "green" | "indigo" | "purple" | "rose";
  icon: ReactNode;
  /** Course-catalog code — the registrar aesthetic. */
  code: string;
};

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".pdf"];
const MAX_TEXT_BYTES = 80 * 1024;

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function DocumentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
      <path d="M8 3.5h5.2L18 8.3V20a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 3.5V9H18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5">
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const topics: Topic[] = [
  { title: "Photosynthesis", description: "Light energy to glucose — plants, chlorophyll, the Calvin cycle.", accent: "green", icon: <LeafIcon />, code: "BIO 141" },
  { title: "Machine Learning", description: "Neural networks, gradient descent, overfitting, the basics.", accent: "indigo", icon: <BrainIcon />, code: "CS 3244" },
  { title: "Quantum Physics", description: "Superposition, entanglement, wave-particle duality.", accent: "purple", icon: <AtomIcon />, code: "PHY 256" },
  { title: "Canadian History", description: "Confederation, the fur trade, key turning points.", accent: "rose", icon: <BookIcon />, code: "HIS 271" },
];

const accentClasses = {
  green: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
  indigo: "bg-indigo-100 text-[var(--brand)] dark:bg-indigo-950/40 dark:text-indigo-300",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
};

function TopicCard({ topic, selected, onSelect }: { topic: Topic; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      onMouseMove={(event) => {
        // Feed the cursor position to the .spot-card radial highlight.
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }}
      className={`group card-lift spot-card flex w-full items-center gap-4 rounded-xl border bg-[var(--surface)] px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 hover:border-[var(--brand)] ${selected ? "border-[var(--brand)] shadow-sm" : "border-[var(--card-border)]"}`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accentClasses[topic.accent]}`}>
        {topic.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-heading block text-base font-semibold text-[var(--text-primary)]">
            {topic.title}
          </span>
          <span className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {topic.code}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-[var(--text-secondary)]">
          {topic.description}
        </span>
      </span>
      <span className="shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100">
        <ArrowRightIcon />
      </span>
    </button>
  );
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to read PDF"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read PDF"));
    reader.readAsDataURL(file);
  });
}

export function TopicPicker() {
  const [topic, setTopic] = useState("");
  const [notesText, setNotesText] = useState<string | null>(null);
  const [notesFileName, setNotesFileName] = useState<string | null>(null);
  const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function navigateToStudent(selectedTopic: string) {
    const trimmed = selectedTopic.trim();
    if (!trimmed) return;

    if (notesText) {
      storePendingNotes(notesText);
    }

    router.push(`/student?topic=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateToStudent(topic);
  }

  function selectRecommendedTopic(selectedTopic: string) {
    setTopic(selectedTopic);
    navigateToStudent(selectedTopic);
  }

  function clearNotes() {
    setNotesText(null);
    setNotesFileName(null);
    setExtractedTopics([]);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const processFile = useCallback(async (file: File) => {
    if (!isAcceptedFile(file)) {
      setUploadError("Please upload a .txt, .md, or .pdf file.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setExtractedTopics([]);

    try {
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      let response: Response;

      if (isPdf) {
        const data = await readFileAsBase64(file);
        response = await fetch("/api/notes/extract-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: { mimeType: "application/pdf", data },
          }),
        });
      } else {
        const text = await readFileAsText(file);
        if (text.length > MAX_TEXT_BYTES) {
          throw new Error("Notes file is too large (max 80 KB).");
        }
        response = await fetch("/api/notes/extract-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }

      const payload = (await response.json().catch(() => ({}))) as {
        topics?: string[];
        notes_text?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to read your notes.");
      }

      if (!payload.topics?.length || !payload.notes_text) {
        throw new Error("Could not find teachable topics in those notes.");
      }

      setNotesText(payload.notes_text);
      setNotesFileName(file.name);
      setExtractedTopics(payload.topics);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Failed to read your notes.";
      setUploadError(message);
      clearNotes();
    } finally {
      setIsUploading(false);
    }
  }, []);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
  }

  return (
    <div className="mt-8 w-full max-w-6xl sm:mt-10">
      <div
        className={`relative mx-auto max-w-3xl rounded-xl transition ${
          isDragOver ? "ring-4 ring-[var(--brand-soft)] ring-offset-2" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <form onSubmit={handleSubmit} className="relative">
          <label htmlFor="topic-input" className="sr-only">What do you want to teach today?</label>
          <span className="pointer-events-none absolute inset-y-0 left-6 flex items-center text-[var(--text-muted)]">
            <SearchIcon />
          </span>
          <input
            id="topic-input"
            name="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="What do you want to teach today?"
            className="h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 pl-16 pr-20 text-lg font-semibold text-[var(--text-primary)] shadow-[0_20px_25px_-5px_var(--shadow-color),0_8px_10px_-6px_var(--shadow-color)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] sm:pr-52 sm:text-2xl"
          />
          <button
            type="submit"
            disabled={!topic.trim() || isUploading}
            className="btn-ink absolute right-3 top-1/2 flex h-14 -translate-y-1/2 items-center justify-center gap-2 rounded-lg bg-[var(--chat-user)] px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none sm:px-6"
          >
            <span className="hidden sm:inline">Start</span>
            <ArrowRightIcon />
          </button>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          className="sr-only"
          onChange={handleFileChange}
        />

        <p className="mt-3 text-center text-base text-[var(--text-secondary)]">
          {isUploading ? (
            <span className="font-medium text-[var(--brand)]">Reading your notes…</span>
          ) : (
            <>
              or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-semibold text-[var(--brand)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                drop your lecture notes
              </button>{" "}
              (.txt, .md, .pdf)
            </>
          )}
        </p>

        {uploadError ? (
          <p role="alert" className="mt-2 text-center text-sm font-medium text-red-600">
            {uploadError}
          </p>
        ) : null}

        {notesFileName ? (
          <div className="mt-5 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 shadow-[0_0_0_4px_rgba(16,185,129,0.08)] dark:border-emerald-800/60 dark:from-emerald-950/20 dark:to-teal-950/20 dark:shadow-[0_0_0_4px_rgba(16,185,129,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
                    <path d="M8 3.5h5.2L18 8.3V20a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M13 3.5V9H18" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M9 13h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    📎 Notes uploaded
                  </p>
                  <p className="mt-0.5 max-w-xs truncate text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {notesFileName}
                    {extractedTopics.length > 0 && (
                      <span className="ml-1.5 text-emerald-600 dark:text-emerald-500">
                        — {extractedTopics.length} topic{extractedTopics.length === 1 ? "" : "s"} found
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearNotes}
                aria-label="Remove uploaded notes"
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                Remove
              </button>
            </div>

            {extractedTopics.length > 0 ? (
              <div className="mt-3 border-t border-emerald-200 pt-3 dark:border-emerald-800/40">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-400">
                  Suggested topics from your notes
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {extractedTopics.map((suggestion) => {
                    const selected = topic === suggestion;
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setTopic(suggestion)}
                        aria-pressed={selected}
                        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
                          selected
                            ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "border-emerald-300 bg-[var(--surface)] text-emerald-800 dark:border-emerald-800/60 dark:text-emerald-300 hover:border-[var(--brand)] hover:text-[var(--brand)]"
                        }`}
                      >
                        {suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="mt-12 sm:mt-14" aria-labelledby="popular-topics-heading">
        <p id="popular-topics-heading" className="eyebrow mb-3 !text-[var(--text-muted)]">
          Or try one of these
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {topics.map((item) => (
            <TopicCard
              key={item.title}
              topic={item}
              selected={topic === item.title}
              onSelect={() => selectRecommendedTopic(item.title)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
