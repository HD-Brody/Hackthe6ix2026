"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MasteryBar } from "@/components/MasteryBar";
import { StarRating } from "@/components/StarRating";
import { letterGrade } from "@/lib/comprehension";
import { formatRelativeDate, sessionLink } from "@/lib/profileStats";
import { studentProfiles } from "@/lib/studentProfiles";
import type { StudentId } from "@/lib/studentProfiles";
import type { SessionSummary } from "@/server/db/sessions";

type StatusFilter = "all" | "ended" | "active";
type StudentFilter = "all" | StudentId;

function statusMeta(session: SessionSummary): { label: string; dot: string } {
  if (session.status === "ended") return { label: "Completed", dot: "bg-emerald-500" };
  if (session.status === "wrapping") return { label: "Wrapping up", dot: "bg-[var(--brand)]" };
  return { label: "In progress", dot: "bg-amber-500" };
}

function gradeTone(score: number | null): string {
  if (score === null) return "border-[var(--border)] text-[var(--text-muted)]";
  return "border-[var(--ink-stamp)] text-[var(--ink-stamp)]";
}

/** Compact library entry — one glance: grade, topic, who, when. */
function LibraryCard({
  session,
  onOpen,
}: {
  session: SessionSummary;
  onOpen: () => void;
}) {
  const student = session.student ?? "sam";
  const profile = studentProfiles[student];
  const status = statusMeta(session);

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }}
      className="card-lift spot-card flex w-full items-center gap-3.5 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      aria-label={`Open details for ${session.topic}`}
    >
      <span
        className={`font-display flex size-11 shrink-0 -rotate-6 items-center justify-center rounded-full border-2 text-base font-bold ${gradeTone(session.status === "ended" ? session.score : null)}`}
        aria-hidden
      >
        {session.status === "ended" ? letterGrade(session.score) : "…"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-[15px] font-semibold text-[var(--text-primary)]">
          {session.topic}
        </span>
        <span className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
          <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden />
          {profile.name} · {formatRelativeDate(session.started_at)}
        </span>
      </span>
      <Image
        src={profile.image}
        alt=""
        width={30}
        height={30}
        className="size-[30px] shrink-0 rounded-full object-cover opacity-90"
      />
    </button>
  );
}

/** Paper-slip modal with the full session record + delete. */
function SessionModal({
  session,
  onClose,
  onDeleted,
}: {
  session: SessionSummary;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const student = session.student ?? "sam";
  const profile = studentProfiles[student];
  const status = statusMeta(session);
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting" | "failed">("idle");

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    if (deleteState === "idle") {
      setDeleteState("confirm");
      return;
    }
    if (deleteState !== "confirm" && deleteState !== "failed") return;
    setDeleteState("deleting");
    try {
      const res = await fetch(`/api/session/${encodeURIComponent(session.session_id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      onDeleted(session.session_id);
      router.refresh();
    } catch {
      setDeleteState("failed");
    }
  }

  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(session.started_at);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Session details: ${session.topic}`}
        onClick={(event) => event.stopPropagation()}
        className="modal-pop tape-top relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] sm:p-7"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close session details"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        >
          ✕
        </button>

        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="min-w-0">
            <p className="eyebrow">Session record</p>
            <h3 className="font-display mt-1 text-2xl font-semibold leading-8">{session.topic}</h3>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              <span className={`size-1.5 rounded-full ${status.dot}`} aria-hidden />
              {status.label} · {profile.name} · {date}
            </p>
          </div>
          {session.status === "ended" ? (
            <div className="grade-stamp shrink-0 !h-[68px] !w-[68px]" aria-label={`Grade: ${letterGrade(session.score)}`}>
              <span className="font-display text-2xl font-bold leading-none">{letterGrade(session.score)}</span>
              <span className="mt-0.5 text-[6px] font-bold uppercase tracking-[0.2em]">Prof. Me</span>
            </div>
          ) : null}
        </div>

        {session.coverage_nodes.length > 0 ? (
          <div className="mt-5">
            <MasteryBar nodes={session.coverage_nodes} />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {session.discussed} of {session.total} concepts explored
              {session.score !== null ? <> · {session.score}% understanding</> : null}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-sm text-[var(--text-secondary)]">
            No concepts explored yet — {profile.name} is still waiting on the first explanation.
          </p>
        )}

        {session.one_liner ? (
          <blockquote className="font-display mt-4 border-l-2 border-[var(--ink-stamp)] pl-3 text-[15px] italic leading-7 text-[var(--text-secondary)]">
            &ldquo;{session.one_liner}&rdquo;
          </blockquote>
        ) : null}

        {session.feedback_rating ? (
          <div className="mt-4 flex items-center gap-2">
            <StarRating rating={session.feedback_rating} size="sm" />
            {session.feedback_comment ? (
              <span className="truncate text-xs italic text-[var(--text-muted)]">
                &ldquo;{session.feedback_comment}&rdquo;
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={sessionLink(session)}
            className="btn-ink rounded-lg bg-[var(--chat-user)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            {session.status === "ended" ? "Open report →" : "Resume lesson →"}
          </Link>
          {session.status === "ended" ? (
            <Link
              href={`/session/${encodeURIComponent(session.session_id)}?student=${student}`}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--text-primary)]"
            >
              Transcript
            </Link>
          ) : null}

          <div className="ml-auto">
            {deleteState === "confirm" || deleteState === "failed" ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--danger-text)]">
                  {deleteState === "failed" ? "Couldn't delete — retry?" : "Delete forever?"}
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg bg-[var(--danger-text)] px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-text)]"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteState("idle")}
                  className="rounded-lg px-2 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                >
                  Keep
                </button>
              </span>
            ) : deleteState === "deleting" ? (
              <span className="text-xs font-medium text-[var(--text-muted)]">Shredding…</span>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--danger-text)] transition hover:bg-[var(--danger-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger-text)]"
              >
                Remove from library
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SessionLibrary({ sessions }: { sessions: SessionSummary[] }) {
  const [query, setQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => sessions.filter((s) => !removedIds.has(s.session_id)),
    [sessions, removedIds]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return visible.filter((session) => {
      if (studentFilter !== "all" && (session.student ?? "sam") !== studentFilter) return false;
      if (statusFilter === "ended" && session.status !== "ended") return false;
      if (statusFilter === "active" && session.status === "ended") return false;
      if (normalized && !session.topic.toLowerCase().includes(normalized)) return false;
      return true;
    });
  }, [query, visible, statusFilter, studentFilter]);

  const openSession = openId
    ? visible.find((s) => s.session_id === openId) ?? null
    : null;

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">04 · Session library</p>
          <h2 className="font-display mt-1 text-2xl font-semibold">
            Every lesson you&apos;ve taught
          </h2>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
          {filtered.length} of {visible.length} session{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by topic…"
              aria-label="Search sessions by topic"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:max-w-xs"
            />
            <select
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value as StudentFilter)}
              aria-label="Filter by student"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <option value="all">All students</option>
              <option value="sam">Sam</option>
              <option value="elena">Elena</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filter by status"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <option value="all">All statuses</option>
              <option value="ended">Completed</option>
              <option value="active">In progress</option>
            </select>
          </div>

          {filtered.length > 0 ? (
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((session) => (
                <LibraryCard
                  key={session.session_id}
                  session={session}
                  onOpen={() => setOpenId(session.session_id)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                No sessions match your filters.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Your teaching insights will appear here after your first session.
          </p>
          <Link
            href="/"
            className="btn-ink mt-4 inline-block rounded-xl bg-[var(--chat-user)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--brand-strong)]"
          >
            Teach your first topic
          </Link>
        </div>
      )}

      {openSession ? (
        <SessionModal
          session={openSession}
          onClose={() => setOpenId(null)}
          onDeleted={(id) => {
            setRemovedIds((prev) => new Set(prev).add(id));
            setOpenId(null);
          }}
        />
      ) : null}
    </section>
  );
}
