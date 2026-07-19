import Image from "next/image";
import Link from "next/link";
import type { AuthUser } from "@/lib/auth0";
import { studentProfiles } from "@/lib/studentProfiles";
import type { SessionSummary } from "@/server/db/sessions";

export function ProfileHero({
  user,
  resumeSession,
}: {
  user: AuthUser;
  resumeSession: SessionSummary | null;
}) {
  const firstName = user.name.split(" ")[0];
  const resumeStudent = resumeSession?.student ?? "sam";
  const resumeProfile = studentProfiles[resumeStudent];

  return (
    <section className="rounded-2xl border border-[#e0dfeb] bg-white p-5 shadow-[0_10px_30px_rgba(56,50,110,0.06)] sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative size-24 shrink-0 rounded-full border-4 border-white shadow-xl sm:size-28">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={user.name}
                className="size-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex size-full items-center justify-center rounded-full bg-[#e1e0ff] font-heading text-4xl font-bold text-[#4648d4]">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">
              Teaching dashboard
            </p>
            <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              {user.email ?? "Professor in residence"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#5755d8] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#4846c5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
          >
            Teach a new topic
          </Link>
          <a
            href="/auth/logout"
            className="inline-flex items-center justify-center rounded-xl border border-[#d8d6e8] bg-white px-5 py-3 text-sm font-semibold text-[#464554] transition hover:bg-[#f7f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
          >
            Log out
          </a>
        </div>
      </div>

      {resumeSession ? (
        <Link
          href={`/session/${encodeURIComponent(resumeSession.session_id)}?student=${resumeStudent}`}
          className="mt-6 flex items-center gap-4 rounded-2xl border border-[#d9d7ff] bg-[#f7f6ff] p-4 transition hover:border-[#5755d8] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        >
          <Image
            src={resumeProfile.image}
            alt={resumeProfile.name}
            width={48}
            height={48}
            className="size-12 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#7776df]">
              Resume classroom
            </p>
            <p className="mt-0.5 truncate font-heading text-lg font-bold">
              {resumeSession.topic}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {resumeProfile.name} is waiting where you left off.
            </p>
          </div>
          <span className="hidden text-sm font-semibold text-[#5755d8] sm:inline">
            Continue →
          </span>
        </Link>
      ) : null}
    </section>
  );
}
