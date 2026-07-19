import Image from "next/image";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/profileStats";
import type { StudentStats } from "@/lib/profileStats";
import { studentProfiles } from "@/lib/studentProfiles";

function teachAgainHref(stats: StudentStats): string {
  const topic = stats.lastSession?.topic;
  const student = stats.student;
  if (topic) {
    return `/student?topic=${encodeURIComponent(topic)}&student=${student}`;
  }
  return `/student?student=${student}`;
}

function StudentCard({ stats }: { stats: StudentStats }) {
  const profile = studentProfiles[stats.student];
  const comingSoon = stats.student === "elena" && stats.sessionCount === 0;

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_30px_var(--shadow-color)]">
      <div className="flex items-center gap-3">
        <Image
          src={profile.image}
          alt={profile.name}
          width={56}
          height={56}
          className="size-14 rounded-full object-cover"
        />
        <div>
          <h3 className="font-heading text-lg font-bold">{profile.name}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {profile.learningNote}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            Sessions
          </dt>
          <dd className="mt-1 font-heading text-xl font-bold text-[var(--nav-active)]">
            {stats.sessionCount}
          </dd>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            Avg understanding
          </dt>
          <dd className="mt-1 font-heading text-xl font-bold text-[var(--state-dodged)]">
            {stats.avgScore !== null ? `${stats.avgScore}%` : "—"}
          </dd>
        </div>
      </dl>

      {stats.lastSession ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Last taught{" "}
          <strong className="font-semibold text-[var(--text-primary)]">
            {stats.lastSession.topic}
          </strong>{" "}
          {formatRelativeDate(stats.lastSession.started_at)}
        </p>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {comingSoon
            ? "Elena is ready when you are — no sessions together yet."
            : `You haven't taught ${profile.name} yet.`}
        </p>
      )}

      <Link
        href={teachAgainHref(stats)}
        className="mt-4 inline-flex rounded-xl bg-[var(--chat-user)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
      >
        Teach {profile.name} again
      </Link>
    </article>
  );
}

export function StudentBreakdown({
  byStudent,
}: {
  byStudent: {
    sam: StudentStats;
    elena: StudentStats;
  };
}) {
  return (
    <section>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">
        Your students
      </p>
      <h2 className="mt-1 font-heading text-2xl font-extrabold">
        Who you&apos;ve been teaching
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <StudentCard stats={byStudent.sam} />
        <StudentCard stats={byStudent.elena} />
      </div>
    </section>
  );
}
