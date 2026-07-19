"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MasteryBar } from "@/components/MasteryBar";
import { StarRating } from "@/components/StarRating";
import { formatRelativeDate, sessionLink } from "@/lib/profileStats";
import { studentProfiles, type StudentId } from "@/lib/studentProfiles";
import type { SessionSummary } from "@/server/db/sessions";

type StatusFilter = "all" | "ended" | "active";
type StudentFilter = "all" | StudentId;

function statusMeta(session: SessionSummary): {
  label: string;
  className: string;
} {
  if (session.status === "ended") {
    return {
      label: "Completed",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }
  if (session.status === "wrapping") {
    return {
      label: "Wrapping up",
      className: "bg-[var(--brand-soft)] text-[var(--nav-active)]",
    };
  }
  return {
    label: "In progress",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  };
}

function scoreClass(score: number | null): string {
  if (score === null) return "text-[var(--text-secondary)]";
  if (score >= 75) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 50) return "text-amber-700 dark:text-amber-400";
  return "text-rose-700 dark:text-rose-400";
}

function SessionLibraryCard({ session }: { session: SessionSummary }) {
  const student = session.student ?? "sam";
  const profile = studentProfiles[student];
  const status = statusMeta(session);
  const href = sessionLink(session);

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_10px_30px_var(--shadow-color)] transition hover:border-[var(--brand)] hover:shadow-[0_12px_28px_var(--shadow-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      <div className="flex items-start gap-3">
        <Image
          src={profile.image}
          alt={profile.name}
          width={44}
          height={44}
          className="size-11 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-heading text-base font-bold">
              {session.topic}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {profile.name} · {formatRelativeDate(session.started_at)} ·{" "}
            {session.discussed}/{session.total} explored
            {session.score !== null ? (
              <>
                {" "}
                ·{" "}
                <span className={scoreClass(session.score)}>
                  {session.score}% understanding
                </span>
              </>
            ) : null}
          </p>
          {session.coverage_nodes.length > 0 ? (
            <div className="mt-3">
              <MasteryBar nodes={session.coverage_nodes} />
            </div>
          ) : null}
          {session.feedback_rating ? (
            <div className="mt-2">
              <StarRating rating={session.feedback_rating} size="sm" />
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function SessionLibrary({ sessions }: { sessions: SessionSummary[] }) {
  const [query, setQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sessions.filter((session) => {
      if (studentFilter !== "all" && (session.student ?? "sam") !== studentFilter) {
        return false;
      }
      if (statusFilter === "ended" && session.status !== "ended") return false;
      if (statusFilter === "active" && session.status === "ended") return false;
      if (normalized && !session.topic.toLowerCase().includes(normalized)) {
        return false;
      }
      return true;
    });
  }, [query, sessions, statusFilter, studentFilter]);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">
            Session library
          </p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold">
            Every lesson you&apos;ve taught
          </h2>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {filtered.length} of {sessions.length} session
          {sessions.length === 1 ? "" : "s"}
        </span>
      </div>

      {sessions.length > 0 ? (
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
              onChange={(event) =>
                setStudentFilter(event.target.value as StudentFilter)
              }
              aria-label="Filter by student"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <option value="all">All students</option>
              <option value="sam">Sam</option>
              <option value="elena">Elena</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="Filter by status"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <option value="all">All statuses</option>
              <option value="ended">Completed</option>
              <option value="active">In progress</option>
            </select>
          </div>

          {filtered.length > 0 ? (
            <div className="mt-4 space-y-3">
              {filtered.map((session) => (
                <SessionLibraryCard
                  key={session.session_id}
                  session={session}
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
            className="mt-4 inline-block rounded-xl bg-[var(--chat-user)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Teach your first topic
          </Link>
        </div>
      )}
    </section>
  );
}
