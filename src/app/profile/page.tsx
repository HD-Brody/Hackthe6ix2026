import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { studentProfiles } from "@/lib/studentProfiles";
import { getAuthUser } from "@/lib/auth0";
import { listSessionsByUser, type SessionSummary } from "@/server/db/sessions";

export const dynamic = "force-dynamic";

function PersonaCard({ id }: { id: "sam" | "elena" }) {
  const profile = studentProfiles[id];
  return (
    <article className="rounded-xl border border-[#e1e0e9] bg-[#f9fafb] p-3">
      <div className="flex items-center gap-3">
        <Image src={profile.image} alt={profile.name} width={40} height={40} className="size-10 rounded-full object-cover" />
        <div><h3 className="font-semibold">{profile.name}</h3><span className="rounded bg-[#e5e3ff] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#4648d4]">{id === "sam" ? "Visual Learner" : "Coming Soon"}</span></div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-4 text-[var(--text-secondary)]">“{profile.learningNote}”</p>
    </article>
  );
}

const topicColors = ["#4648d4", "#8127cf", "#b90538", "#19704d"];

function statusLabel(s: SessionSummary): string {
  if (s.status === "ended") return "Completed";
  if (s.status === "wrapping") return "Wrapping up";
  return "In progress";
}

function SessionRow({ session, index }: { session: SessionSummary; index: number }) {
  const color = topicColors[index % topicColors.length];
  const pct = session.score ?? 0;
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(session.started_at);
  const studentParam = session.student ?? "sam";
  const href = session.has_gap_map
    ? `/session/${encodeURIComponent(session.session_id)}/report?student=${studentParam}`
    : `/session/${encodeURIComponent(session.session_id)}?student=${studentParam}`;
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-[#e8e6ef] p-3 transition hover:border-[var(--brand)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#e5e3ff] font-bold" style={{ color }}>{session.topic.charAt(0).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium">{session.topic}</h3>
        <p className="text-[10px] text-[var(--text-secondary)]">
          {date} • {statusLabel(session)} • {session.discussed}/{session.total} explored
          {session.score !== null ? ` · ${session.score}% understanding` : ""}
        </p>
        {session.feedback_rating ? (
          <div className="mt-1">
            <StarRating rating={session.feedback_rating} size="sm" />
          </div>
        ) : null}
      </div>
      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[#eceef0] sm:block"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
    </Link>
  );
}

function DiaryEntry({ session }: { session: SessionSummary }) {
  const profile = studentProfiles[session.student ?? "sam"];
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(session.feedback_ts ?? session.ended_at ?? session.started_at);

  return (
    <article className="rounded-xl border border-[#e8e6ef] bg-[#f9fafb] p-4">
      <div className="flex items-start gap-3">
        <Image src={profile.image} alt={profile.name} width={36} height={36} className="size-9 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{profile.name}</h3>
            <span className="text-[10px] text-[var(--text-secondary)]">{date}</span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-[#4648d4]">{session.topic}</p>
          {session.feedback_rating ? <StarRating rating={session.feedback_rating} size="sm" className="mt-1.5" /> : null}
          {session.feedback_comment ? (
            <p className="mt-2 text-sm italic leading-5 text-[var(--text-secondary)]">“{session.feedback_comment}”</p>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">No written note — just the star rating.</p>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function ProfilePage() {
  const user = await getAuthUser();
  const sessions = user ? await listSessionsByUser(user.sub).catch(() => []) : [];
  const totalSolid = sessions.reduce((sum, s) => sum + s.solid, 0);
  const completed = sessions.filter((s) => s.status === "ended").length;
  const diaryEntries = sessions
    .filter((s) => s.feedback_rating)
    .sort((a, b) => (b.feedback_ts ?? 0) - (a.feedback_ts ?? 0))
    .slice(0, 5);
  const ratedSessions = sessions.filter((s) => s.feedback_rating);
  const avgRating =
    ratedSessions.length > 0
      ? (ratedSessions.reduce((sum, s) => sum + (s.feedback_rating ?? 0), 0) / ratedSessions.length).toFixed(1)
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fb] text-[var(--text-primary)]">
      <SiteHeader />
      {!user ? (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">Your teaching record lives here</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Log in to keep your sessions, revisit past gap maps, and watch your students (fail to) grow.</p>
          <Link href="/login" className="mt-6 inline-block rounded-lg bg-[#4648d4] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-strong)]">Log in</Link>
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-5 pb-7 pt-14 sm:px-8 sm:pt-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-10">
          <aside className="space-y-5">
            <nav aria-label="Profile navigation" className="grid gap-1 rounded-xl border border-[#e8e6ef] bg-white p-3 shadow-sm">
              <span className="rounded-lg bg-[#e1e0ff] px-3 py-2.5 text-left text-xs font-semibold text-[#2f2ebe] sm:text-sm">Profile</span>
              <a href="/auth/logout" className="rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#464554] transition hover:bg-[#f2f4f6] sm:text-sm">Log out</a>
            </nav>
            <section className="hidden min-h-64 rounded-xl bg-[rgba(70,72,212,0.06)] p-5 lg:block">
              <p className="text-sm uppercase tracking-wider text-[#4648d4]">Teaching Tip</p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">If Sam keeps asking “why?”, that&apos;s not Sam being difficult — that&apos;s exactly where your explanation ran out of road.</p>
            </section>
          </aside>

          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-xl border border-[#ebeaf0] bg-white p-5 shadow-sm sm:p-7">
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(70,72,212,0.06)] blur-3xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                <div className="relative mx-auto size-24 shrink-0 rounded-full border-4 border-white shadow-xl sm:mx-0 sm:size-28">
                  {user.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.picture} alt={user.name} className="size-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex size-full items-center justify-center rounded-full bg-[#e1e0ff] font-heading text-4xl font-bold text-[#4648d4]">{user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {user.name.split(" ")[0]}</h1>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">{user.email ?? "Professor in residence"}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm sm:gap-3">
                    {[{ value: String(sessions.length), label: "Sessions Taught", color: "text-[#4648d4]" }, { value: String(totalSolid), label: "Concepts Made Solid", color: "text-[#8127cf]" }, ...(avgRating ? [{ value: avgRating, label: "Avg Clarity Rating", color: "text-[#f1bd43]" }] : [])].map((stat) => <div key={stat.label} className="rounded-lg bg-[#eceef0] px-2 py-2.5 sm:px-4"><strong className={`block text-lg sm:text-xl ${stat.color}`}>{stat.value}</strong><span className="text-[10px] text-[var(--text-secondary)] sm:text-xs">{stat.label}</span></div>)}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-xl border border-[#ebeaf0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-xl font-bold">Recently Taught</h2>
                  <span className="text-xs text-[var(--text-secondary)]">{completed} completed</span>
                </div>
                {sessions.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {sessions.slice(0, 6).map((session, index) => (
                      <SessionRow key={session.session_id} session={session} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-[#c7c4d7] p-6 text-center">
                    <p className="text-sm text-[var(--text-secondary)]">No sessions yet — your students are getting restless.</p>
                    <Link href="/" className="mt-3 inline-block rounded-lg bg-[#4648d4] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--brand-strong)]">Teach your first topic</Link>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-[#ebeaf0] bg-white p-5 shadow-sm">
                <h2 className="font-heading text-xl font-bold">Your Students</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <PersonaCard id="sam" />
                  <PersonaCard id="elena" />
                </div>
              </section>

              <section className="rounded-xl border border-[#ebeaf0] bg-white p-5 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-xl font-bold">Student Diary</h2>
                  <span className="text-xs text-[var(--text-secondary)]">{diaryEntries.length} entries</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Notes from your post-session clarity ratings — what felt clear and what didn&apos;t.
                </p>
                {diaryEntries.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {diaryEntries.map((session) => (
                      <DiaryEntry key={session.session_id} session={session} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-[#c7c4d7] p-6 text-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                      No diary entries yet. Finish a session and rate how clear it felt — Sam will leave a note here.
                    </p>
                    <Link href="/" className="mt-3 inline-block rounded-lg bg-[#4648d4] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--brand-strong)]">
                      Teach a topic
                    </Link>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      )}
      <SiteFooter />
    </div>
  );
}
