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
  { title: "Photosynthesis", description: "Explain how plants convert sunlight into chemical energy for Sam's biology quiz.", accent: "green", icon: <LeafIcon /> },
  { title: "Machine Learning", description: "Help Sam understand neural networks without the heavy math jargon.", accent: "indigo", icon: <BrainIcon /> },
  { title: "Quantum Physics", description: "Break down entanglement and superposition into simple, everyday analogies.", accent: "purple", icon: <AtomIcon /> },
  { title: "Canadian History", description: "Narrate the key moments of Confederation for Sam's upcoming social studies project.", accent: "rose", icon: <BookIcon /> },
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
      className={`group flex min-h-48 w-full flex-col items-start gap-2 rounded-xl border bg-[var(--surface)] p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${selected ? "border-[var(--brand)] shadow-md" : "border-[var(--card-border)]"}`}
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
            className="absolute right-2 top-1/2 flex h-16 -translate-y-1/2 items-center justify-center gap-2 rounded-lg bg-[var(--chat-user)] px-5 font-semibold text-white transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:px-6"
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

        <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">
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
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-secondary)] shadow-sm">
              <DocumentIcon />
              <span>{notesFileName}</span>
              <button
                type="button"
                onClick={clearNotes}
                aria-label="Remove uploaded notes"
                className="rounded-full p-0.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                <CloseIcon />
              </button>
            </div>

            {extractedTopics.length > 0 ? (
              <div className="w-full">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  Topics from your notes
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {extractedTopics.map((suggestion) => {
                    const selected = topic === suggestion;
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setTopic(suggestion)}
                        aria-pressed={selected}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
                          selected
                            ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "border-[var(--card-border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand)]"
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

      <section className="mt-20 sm:mt-24" aria-labelledby="popular-topics-heading">
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <h2 id="popular-topics-heading" className="font-heading text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
            Popular with Professors
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:grid-cols-2">
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
