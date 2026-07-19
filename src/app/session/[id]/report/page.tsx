import Link from "next/link";
import { ConceptCoverage } from "@/components/ConceptCoverage";
import { ReteachButton } from "@/components/ReteachButton";
import { GapMapExportButton } from "@/components/billing/GapMapExportButton";
import { computeComprehensionStats, formatBreakdown } from "@/lib/comprehension";
import { StarRating } from "@/components/StarRating";
import { ReportLoader } from "@/components/ReportLoader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSession } from "@/server/db/sessions";
import { resolveSessionStudent } from "@/lib/studentProfiles";
import type { GapMap, Session } from "@/lib/types";

export const dynamic = "force-dynamic";

const momentTilts = ["tilt-1", "tilt-2", "tilt-3"];

/** Red-ink letter grade for the stamp — the report card moment. */
function letterGrade(score: number | null): string {
  if (score === null) return "—";
  if (score >= 93) return "A+";
  if (score >= 85) return "A";
  if (score >= 77) return "B+";
  if (score >= 68) return "B";
  if (score >= 58) return "C+";
  if (score >= 45) return "C";
  return "D";
}

const LIVE_ONE_LINER =
  "Session in progress — end the lesson for your full understanding map.";

function liveGapMapFromSession(session: Session): GapMap {
  return {
    topic: session.topic,
    nodes: session.graph.nodes.map(({ id, name, state }) => ({
      id,
      name,
      state,
    })),
    vaguest_moments: [],
    dodged_questions: [],
    reteach_order: [],
    one_liner: LIVE_ONE_LINER,
  };
}

function EmptyState({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">{body}</p>
      <Link href={href} className="mt-6 inline-block rounded-lg bg-[var(--chat-user)] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-strong)]">{cta}</Link>
    </main>
  );
}

function ReportContent({
  id,
  report,
  session,
  selectedStudent,
  studentName,
  isLive,
}: {
  id: string;
  report: GapMap;
  session: Session | null;
  selectedStudent: "sam" | "elena";
  studentName: string;
  isLive: boolean;
}) {
  const nodeName = (nodeId: string) =>
    report.nodes.find((n) => n.id === nodeId)?.name ?? nodeId;
  const comprehension = computeComprehensionStats(report.nodes);
  const understandingScore = comprehension.score;
  const reteachNames = report.reteach_order.map(nodeName);
  const statusDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  }).format(session?.ended_at ?? Date.now());

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="eyebrow">Report card — final</p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Your Understanding Map</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">{report.topic}</p>
          </div>
          {!isLive ? (
            <div className="grade-stamp stamp-in shrink-0" aria-label={`Grade: ${letterGrade(understandingScore)}`}>
              <span className="font-display text-4xl font-bold leading-none">{letterGrade(understandingScore)}</span>
              <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.22em]">Prof. Me</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isLive ? (
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Live session
            </span>
          ) : (
            <span className="rounded-full bg-[var(--brand-soft)] px-4 py-2 text-xs font-bold text-[var(--nav-active)]">
              Completed {statusDate}
            </span>
          )}
          {!isLive ? <GapMapExportButton report={report} /> : null}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <article className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_30px_var(--shadow-color)] sm:p-7">
          <span className="marginalia" aria-hidden>Concept audit</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">01 · Coverage</p>
              <h2 className="mt-1 font-heading text-xl font-bold">What You Taught</h2>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--mastery-solid)]" />Solid</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--mastery-vague)]" />Hand-waved</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--state-wrong)]" />Wrong</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--state-dodged)]" />Dodged</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--state-touched)]" />Mentioned</span>
            </div>
          </div>
          <ConceptCoverage gapMap={report} />
        </article>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-2xl bg-gradient-to-br from-[#5755d8] to-[#7776df] p-6 text-white shadow-[0_12px_28px_rgba(87,85,216,0.24)]">
            <p className="eyebrow eyebrow-inverse">02 · The verdict</p>
            <div className="mt-5 flex items-end gap-2">
              <strong className="font-heading text-5xl">
                {understandingScore !== null ? `${understandingScore}%` : "—"}
              </strong>
              <span className="pb-1 text-sm text-white/75">understanding</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface)]/25">
              <div
                className="h-full rounded-full bg-[var(--surface)] transition-all"
                style={{ width: `${understandingScore ?? 0}%` }}
              />
            </div>
            {comprehension.discussed > 0 ? (
              <p className="mt-3 text-xs text-white/75">
                among {comprehension.discussed} concept{comprehension.discussed === 1 ? "" : "s"} you explored · {formatBreakdown(comprehension)}
              </p>
            ) : null}
            <p className="font-display mt-5 text-base italic leading-7 text-white/95">&ldquo;{report.one_liner}&rdquo;</p>
          </article>

          {!isLive ? (
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_var(--shadow-color)]">
              <p className="eyebrow">03 · Questions avoided</p>
              <h2 className="mt-1 font-heading text-xl font-bold">Worth revisiting</h2>
              {report.dodged_questions.length > 0 ? (
                <ol className="mt-5 space-y-4">
                  {report.dodged_questions.map((question, index) => (
                    <li key={question} className="flex gap-3 text-sm leading-5 text-[var(--text-secondary)]">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--nav-active)]">{index + 1}</span>
                      {question}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">No dodged questions — you faced everything {studentName} threw at you.</p>
              )}
            </article>
          ) : null}

          {session?.feedback ? (
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_var(--shadow-color)]">
              <p className="eyebrow">04 · Your reflection</p>
              <h2 className="mt-1 font-heading text-xl font-bold">Session clarity</h2>
              <StarRating rating={session.feedback.rating} className="mt-3" />
              {session.feedback.comment ? (
                <p className="mt-3 text-sm italic leading-6 text-[var(--text-secondary)]">&ldquo;{session.feedback.comment}&rdquo;</p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">You rated this session but left no written note.</p>
              )}
              <Link
                href={`/session/${encodeURIComponent(id)}/feedback?student=${selectedStudent}`}
                className="mt-4 inline-block text-xs font-semibold text-[var(--nav-active)] hover:underline"
              >
                View your reflection →
              </Link>
            </article>
          ) : null}
        </div>
      </section>

      {!isLive ? (
        <section className="mt-10">
          <p className="eyebrow">05 · Conversation review</p>
          <h2 className="font-display mt-1 text-2xl font-semibold">Moments {studentName} got confused</h2>
          {report.vaguest_moments.length > 0 ? (
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {report.vaguest_moments.map((moment, index) => (
                <article key={`${moment.node_id}-${index}`} className={`index-card flex min-h-52 flex-col border border-[var(--border)] p-5 pl-10 shadow-sm ${momentTilts[index % momentTilts.length]}`}>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--brand)]">You said</span>
                  <blockquote className="font-display my-4 flex-1 text-[15px] italic leading-[28px] text-[var(--text-secondary)]">&ldquo;{moment.quote}&rdquo;</blockquote>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-stamp)]">↳ {nodeName(moment.node_id)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">No vague moments captured — a remarkably crisp lesson.</p>
          )}
        </section>
      ) : (
        <section className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            End the lesson to unlock dodged questions, vague moments, and a re-teach plan.
          </p>
          <Link
            href={`/session/${encodeURIComponent(id)}?student=${selectedStudent}`}
            className="mt-4 inline-block rounded-lg bg-[var(--chat-user)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Back to classroom
          </Link>
        </section>
      )}

      {!isLive ? (
        <section className="mt-10 rounded-2xl bg-[var(--accent-soft)] px-6 py-9 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Next lesson plan</p>
            <h2 className="font-display mt-1 text-2xl font-semibold">Ready to close these gaps?</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              {reteachNames.length > 0
                ? `Start your next lesson with ${reteachNames.length === 1 ? "this concept" : `these ${Math.min(reteachNames.length, 3)}`} — the highest-leverage ${reteachNames.length === 1 ? "gap" : "gaps"} to re-teach first.`
                : "Nothing left to re-teach — pick a harder topic."}
            </p>
          </div>

          {reteachNames.length > 0 ? (
            <ol className="mx-auto mt-6 flex max-w-xl flex-col gap-2.5">
              {reteachNames.slice(0, 3).map((name, index) => (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left shadow-sm"
                >
                  <span className="font-display flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--nav-active)]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="mt-6 text-center">
            <ReteachButton
              sessionId={id}
              student={selectedStudent}
              hasGaps={reteachNames.length > 0}
              isMock={false}
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { id } = await params;
  const { student } = await searchParams;
  const isMock = id.startsWith("demo-");

  const session = isMock ? null : await getSession(id).catch(() => null);
  const selectedStudent = resolveSessionStudent(session?.student, student);
  const studentName = selectedStudent === "elena" ? "Elena" : "Sam";

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)] text-[var(--text-primary)]">
      <SiteHeader activeItem="analytics" sessionId={id} student={selectedStudent} />
      {children}
      <SiteFooter />
    </div>
  );

  if (isMock) {
    return shell(
      <EmptyState
        title="Analytics unavailable for demo sessions"
        body="Local demo sessions don't persist concept data. Start a live session to get a real understanding map."
        cta="Start teaching"
        href="/"
      />
    );
  }

  if (!session) {
    return shell(
      <EmptyState
        title="Session not found"
        body={`We couldn't find this teaching session. It may have expired — start a fresh one and teach ${studentName} something new.`}
        cta="Back to topics"
        href="/"
      />
    );
  }

  if (!session.gap_map && session.status === "ended") {
    return shell(
      <ReportLoader sessionId={id} studentName={studentName} />
    );
  }

  const isLive = !session.gap_map;
  const report: GapMap = session.gap_map ?? liveGapMapFromSession(session);

  return shell(
    <ReportContent
      id={id}
      report={report}
      session={session}
      selectedStudent={selectedStudent}
      studentName={studentName}
      isLive={isLive}
    />
  );
}
