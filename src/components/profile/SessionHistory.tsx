import Image from "next/image";
import Link from "next/link";
import { MasteryBar } from "@/components/MasteryBar";
import { StarRating } from "@/components/StarRating";
import { formatRelativeDate, sessionLink } from "@/lib/profileStats";
import { studentProfiles } from "@/lib/studentProfiles";
import type { SessionSummary } from "@/server/db/sessions";

function statusMeta(session: SessionSummary): {
  label: string;
  className: string;
} {
  if (session.status === "ended") {
    return {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  if (session.status === "wrapping") {
    return {
      label: "Wrapping up",
      className: "bg-[#ecebff] text-[#5755d8]",
    };
  }
  return {
    label: "In progress",
    className: "bg-amber-100 text-amber-800",
  };
}

function scoreClass(score: number | null): string {
  if (score === null) return "text-[var(--text-secondary)]";
  if (score >= 75) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-rose-700";
}

export function SessionHistoryCard({ session }: { session: SessionSummary }) {
  const student = session.student ?? "sam";
  const profile = studentProfiles[student];
  const status = statusMeta(session);
  const href = sessionLink(session);

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[#e0dfeb] bg-white p-4 shadow-[0_10px_30px_rgba(56,50,110,0.04)] transition hover:border-[#c9c6ef] hover:shadow-[0_12px_28px_rgba(56,50,110,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
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

export function SessionHistory({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">
            Session history
          </p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold">
            Recently taught
          </h2>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>

      {sessions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <SessionHistoryCard key={session.session_id} session={session} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[#c7c4d7] bg-white p-8 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            No sessions yet — your students are getting restless.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-[#5755d8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4846c5]"
          >
            Teach your first topic
          </Link>
        </div>
      )}
    </section>
  );
}
