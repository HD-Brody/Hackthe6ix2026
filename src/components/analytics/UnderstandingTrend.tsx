import type { ScoreTrendPoint } from "@/lib/analyticsStats";
import { studentProfiles } from "@/lib/studentProfiles";

function scoreBarClass(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function UnderstandingTrend({ points }: { points: ScoreTrendPoint[] }) {
  return (
    <section>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">
        Progress
      </p>
      <h2 className="mt-1 font-heading text-2xl font-extrabold">
        Understanding over time
      </h2>

      {points.length > 0 ? (
        <div className="mt-4 space-y-3">
          {points.map((point) => {
            const profile = studentProfiles[point.student];
            const date = new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
            }).format(point.ended_at);

            return (
              <div
                key={point.session_id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-bold">
                      {point.topic}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {profile.name} · {date}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-lg font-bold text-[var(--nav-active)]">
                    {point.score}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarClass(point.score)}`}
                    style={{ width: `${point.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Complete a session to see your understanding trend.
          </p>
        </div>
      )}
    </section>
  );
}
