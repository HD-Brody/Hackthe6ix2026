import Link from "next/link";
import { AttentionStrip } from "@/components/profile/AttentionStrip";
import { ClarityNotes } from "@/components/profile/ClarityNotes";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { SessionHistory } from "@/components/profile/SessionHistory";
import { StudentBreakdown } from "@/components/profile/StudentBreakdown";
import { TeachingOverview } from "@/components/profile/TeachingOverview";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAuthUser, getUserId } from "@/lib/auth0";
import { computeProfileStats } from "@/lib/profileStats";
import { listSessionsByUser } from "@/server/db/sessions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getAuthUser();
  const userId = await getUserId();
  let sessions: Awaited<ReturnType<typeof listSessionsByUser>> = [];
  let loadError: string | null = null;

  try {
    sessions = await listSessionsByUser(userId);
  } catch (err) {
    console.error("[profile] failed to load sessions:", err);
    loadError = "We couldn't load your teaching history. Try refreshing.";
  }

  const stats = computeProfileStats(sessions);
  const showDashboard = Boolean(user) || sessions.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f9fc] text-[var(--text-primary)]">
      <SiteHeader />
      {!showDashboard ? (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            Your teaching record lives here
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Log in to keep your sessions, revisit past gap maps, and watch your
            students (fail to) grow.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-[#5755d8] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#4846c5]"
          >
            Log in
          </Link>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          {loadError ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </p>
          ) : null}
          {user ? (
            <ProfileHero user={user} resumeSession={stats.resumeSession} />
          ) : (
            <section className="rounded-2xl border border-[#e0dfeb] bg-white p-5 shadow-sm sm:p-7">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight">
                Your teaching history
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                You&apos;re browsing anonymously — sessions are saved on this device until you log in.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-xl bg-[#5755d8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4846c5]"
              >
                Log in to keep your record
              </Link>
            </section>
          )}
          <TeachingOverview
            overview={stats.overview}
            latestInsight={stats.latestInsight}
          />
          <AttentionStrip items={stats.attention} />
          <SessionHistory sessions={sessions} />
          <StudentBreakdown byStudent={stats.byStudent} />
          <ClarityNotes entries={stats.diaryEntries} />
        </main>
      )}
      <SiteFooter />
    </div>
  );
}
