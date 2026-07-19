import Link from "next/link";
import { AnalyticsHero } from "@/components/analytics/AnalyticsHero";
import { AttentionStrip } from "@/components/analytics/AttentionStrip";
import { SessionLibrary } from "@/components/analytics/SessionLibrary";
import { StudentComparison } from "@/components/analytics/StudentComparison";
import { UnderstandingTrend } from "@/components/analytics/UnderstandingTrend";
import { WeakConcepts } from "@/components/analytics/WeakConcepts";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { computeAnalyticsStats } from "@/lib/analyticsStats";
import { getUserId } from "@/lib/auth0";
import { listSessionsByUser } from "@/server/db/sessions";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const userId = await getUserId();
  let sessions: Awaited<ReturnType<typeof listSessionsByUser>> = [];
  let loadError: string | null = null;

  try {
    sessions = await listSessionsByUser(userId, 50);
  } catch (err) {
    console.error("[analytics] failed to load sessions:", err);
    loadError = "We couldn't load your teaching history. Try refreshing.";
  }

  const stats = computeAnalyticsStats(sessions);
  const hasSessions = sessions.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)] text-[var(--text-primary)]">
      <SiteHeader activeItem="analytics" />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Teaching Analytics
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
              Cross-session insights, trends, and your full session library.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-fit items-center justify-center rounded-xl bg-[var(--chat-user)] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-strong)]"
          >
            Teach a new topic
          </Link>
        </section>

        {loadError ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {loadError}
          </p>
        ) : null}

        {hasSessions ? (
          <>
            <AnalyticsHero
              overview={stats.overview}
              latestInsight={stats.latestInsight}
            />
            <AttentionStrip items={stats.attention} />
            <div className="grid gap-8 lg:grid-cols-2">
              <UnderstandingTrend points={stats.scoreTrend} />
              <WeakConcepts concepts={stats.weakConcepts} />
            </div>
            <SessionLibrary sessions={stats.sessions} />
            <StudentComparison byStudent={stats.byStudent} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
            <h2 className="font-heading text-2xl font-extrabold">
              No teaching data yet
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              Your teaching insights will appear here after your first session —
              understanding scores, weak concepts, and a searchable session
              library.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-[var(--chat-user)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
            >
              Start your first lesson
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
