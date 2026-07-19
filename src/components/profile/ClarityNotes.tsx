import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { sessionLink } from "@/lib/profileStats";
import { studentProfiles } from "@/lib/studentProfiles";
import type { SessionSummary } from "@/server/db/sessions";

const accents = [
  "border-l-[#e5bd45]",
  "border-l-[#7776df]",
  "border-l-[#57b98b]",
];

function DiaryEntry({
  session,
  accent,
}: {
  session: SessionSummary;
  accent: string;
}) {
  const profile = studentProfiles[session.student ?? "sam"];
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(session.feedback_ts ?? session.ended_at ?? session.started_at);

  return (
    <Link
      href={sessionLink(session)}
      className={`flex min-h-40 flex-col rounded-xl border border-[var(--border)] border-l-4 bg-[var(--surface)] p-5 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${accent}`}
    >
      <div className="flex items-start gap-3">
        <Image
          src={profile.image}
          alt={profile.name}
          width={36}
          height={36}
          className="size-9 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{profile.name}</h3>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {date}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-[var(--nav-active)]">
            {session.topic}
          </p>
          {session.feedback_rating ? (
            <StarRating
              rating={session.feedback_rating}
              size="sm"
              className="mt-1.5"
            />
          ) : null}
        </div>
      </div>
      {session.feedback_comment ? (
        <blockquote className="mt-4 flex-1 text-sm italic leading-6 text-[var(--text-secondary)]">
          “{session.feedback_comment}”
        </blockquote>
      ) : (
        <p className="mt-4 flex-1 text-sm text-[var(--text-secondary)]">
          No written note — just the star rating.
        </p>
      )}
    </Link>
  );
}

export function ClarityNotes({ entries }: { entries: SessionSummary[] }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">
            Student feedback
          </p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold">
            Clarity notes
          </h2>
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {entries.length} entr{entries.length === 1 ? "y" : "ies"}
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Notes from your post-session clarity ratings — what felt clear and what
        didn&apos;t.
      </p>

      {entries.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((session, index) => (
            <DiaryEntry
              key={session.session_id}
              session={session}
              accent={accents[index % accents.length]}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            No clarity notes yet. Finish a session and rate how clear it felt —
            your student will leave a note here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-[var(--chat-user)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Teach a topic
          </Link>
        </div>
      )}
    </section>
  );
}
