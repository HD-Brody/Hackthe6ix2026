import type { ProfileOverview } from "@/lib/profileStats";
import { formatDuration } from "@/lib/profileStats";

function scoreTone(score: number | null): string {
  if (score === null) return "text-white/80";
  if (score >= 75) return "text-emerald-100";
  if (score >= 50) return "text-amber-100";
  return "text-rose-100";
}

export function TeachingOverview({
  overview,
  latestInsight,
}: {
  overview: ProfileOverview;
  latestInsight: string | null;
}) {
  const avgScore = overview.avgScore;

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
      <article className="rounded-2xl bg-gradient-to-br from-[#5755d8] to-[#7776df] p-6 text-white shadow-[0_12px_28px_rgba(87,85,216,0.24)] sm:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/75">
          Teaching insight
        </p>
        <div className="mt-5 flex items-end gap-2">
          <strong className={`font-heading text-5xl ${scoreTone(avgScore)}`}>
            {avgScore !== null ? `${avgScore}%` : "—"}
          </strong>
          <span className="pb-1 text-sm text-white/75">avg understanding</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface)]/25">
          <div
            className="h-full rounded-full bg-[var(--surface)] transition-all"
            style={{ width: `${avgScore ?? 0}%` }}
          />
        </div>
        {overview.totalDiscussed > 0 ? (
          <p className="mt-3 text-xs text-white/75">
            {overview.totalDiscussed} concept
            {overview.totalDiscussed === 1 ? "" : "s"} explored across your
            sessions · {overview.aggregateBreakdown}
          </p>
        ) : (
          <p className="mt-3 text-xs text-white/75">
            Start teaching to unlock cross-session insights.
          </p>
        )}
        {overview.avgRating !== null ? (
          <p className="mt-4 text-sm text-white/85">
            Students rated your clarity{" "}
            <strong className="font-semibold">{overview.avgRating}/5</strong> on
            average.
          </p>
        ) : null}
        {latestInsight ? (
          <p className="mt-5 border-t border-white/20 pt-4 text-sm leading-6 text-white/90">
            “{latestInsight}”
          </p>
        ) : null}
      </article>

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            value: String(overview.totalSessions),
            label: "Sessions taught",
            tone: "text-[var(--nav-active)]",
          },
          {
            value: String(overview.totalDiscussed),
            label: "Concepts explored",
            tone: "text-[var(--state-dodged)]",
          },
          {
            value: `${overview.completionRate}%`,
            label: "Completion rate",
            tone: "text-[var(--chip-solid-text)]",
          },
          {
            value: formatDuration(overview.totalDurationMs),
            label: "Teaching time",
            tone: "text-amber-600 dark:text-amber-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_10px_30px_var(--shadow-color)]"
          >
            <strong className={`block font-heading text-2xl ${stat.tone}`}>
              {stat.value}
            </strong>
            <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
