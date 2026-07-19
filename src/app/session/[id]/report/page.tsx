import Link from "next/link";
import { ConceptCoverage } from "@/components/ConceptCoverage";
import { ReteachButton } from "@/components/ReteachButton";
import { computeComprehensionStats, formatBreakdown } from "@/lib/comprehension";
import { StarRating } from "@/components/StarRating";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSession } from "@/server/db/sessions";
import { resolveSessionStudent } from "@/lib/studentProfiles";
import type { GapMap } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Demo fixture — shown only for local mock sessions (demo-* ids). */
const DEMO_REPORT: GapMap = {
  topic: "Quantum Computing Fundamentals",
  nodes: [
    { id: "qubits", name: "Qubits", state: "solid" },
    { id: "superposition", name: "Superposition", state: "solid" },
    { id: "entanglement", name: "Entanglement Logic", state: "vague" },
    { id: "measurement", name: "Measurement Collapse", state: "vague" },
    { id: "hadamard", name: "Hadamard Gate", state: "touched" },
    { id: "decoherence", name: "Decoherence", state: "wrong" },
    { id: "gates", name: "Quantum Gates", state: "unvisited" },
    { id: "algorithms", name: "Quantum Algorithms", state: "unvisited" },
    { id: "error_correction", name: "Error Correction", state: "unvisited" },
    { id: "teleportation", name: "Quantum Teleportation", state: "unvisited" },
  ],
  vaguest_moments: [
    { node_id: "entanglement", quote: "I think entanglement means the particles are communicating instantly... or maybe they just share the same state?" },
    { node_id: "hadamard", quote: "The Hadamard gate creates superposition, but I couldn't explain what the matrix actually changes." },
  ],
  dodged_questions: [
    "How does measurement affect entangled qubits?",
    "What makes a quantum gate reversible?",
  ],
  reteach_order: ["decoherence", "entanglement", "measurement", "hadamard"],
  one_liner: "You have a strong intuitive grasp of the core ideas. A few technical links need another pass.",
};

const momentAccents = ["border-l-[#e5bd45]", "border-l-[#7776df]", "border-l-[#b7b7c3]"];

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
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">{body}</p>
      <Link href={href} className="mt-6 inline-block rounded-lg bg-[#5755d8] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#4846c5]">{cta}</Link>
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
    <div className="flex min-h-screen flex-col bg-[#f9f9fc] text-[var(--text-primary)]">
      <SiteHeader activeItem="analytics" sessionId={id} student={selectedStudent} />
      {children}
      <SiteFooter />
    </div>
  );

  if (!isMock && !session) {
    return shell(
      <EmptyState
        title="Session not found"
        body={`We couldn't find this teaching session. It may have expired — start a fresh one and teach ${studentName} something new.`}
        cta="Back to topics"
        href="/"
      />
    );
  }

  if (session && !session.gap_map) {
    return shell(
      <EmptyState
        title="Class is still in session"
        body={`${studentName} hasn't finished processing this lesson yet. End the conversation in the classroom to generate the understanding map.`}
        cta="Back to the classroom"
        href={`/session/${encodeURIComponent(id)}?student=${selectedStudent}`}
      />
    );
  }

  const report: GapMap = session?.gap_map ?? DEMO_REPORT;
  const nodeName = (nodeId: string) =>
    report.nodes.find((n) => n.id === nodeId)?.name ?? nodeId;
  const comprehension = computeComprehensionStats(report.nodes);
  const understandingScore = comprehension.score;
  const reteachNames = report.reteach_order.map(nodeName);
  const completedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  }).format(session?.ended_at ?? Date.now());

  return shell(
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Your Understanding Map</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">Session Analysis: {report.topic}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isMock ? <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700">Demo data</span> : null}
          <span className="rounded-full bg-[#ecebff] px-4 py-2 text-xs font-bold text-[#5655c8]">Completed {completedDate}</span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <article className="rounded-2xl border border-[#e0dfeb] bg-white p-5 shadow-[0_10px_30px_rgba(56,50,110,0.06)] sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">Knowledge Visualization</p>
              <h2 className="mt-1 font-heading text-xl font-bold">What You Taught</h2>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#57b98b]" />Solid</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#e4bf53]" />Hand-waved</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--state-wrong)]" />Wrong</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--state-dodged)]" />Dodged</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--state-touched)]" />Mentioned</span>
            </div>
          </div>
          <ConceptCoverage gapMap={report} />
        </article>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <article className="rounded-2xl bg-gradient-to-br from-[#5755d8] to-[#7776df] p-6 text-white shadow-[0_12px_28px_rgba(87,85,216,0.24)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/75">Professor Me Insight</p>
            <div className="mt-5 flex items-end gap-2">
              <strong className="font-heading text-5xl">
                {understandingScore !== null ? `${understandingScore}%` : "—"}
              </strong>
              <span className="pb-1 text-sm text-white/75">understanding</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${understandingScore ?? 0}%` }}
              />
            </div>
            {comprehension.discussed > 0 ? (
              <p className="mt-3 text-xs text-white/75">
                among {comprehension.discussed} concept{comprehension.discussed === 1 ? "" : "s"} you explored · {formatBreakdown(comprehension)}
              </p>
            ) : null}
            <p className="mt-5 text-sm leading-6 text-white/90">“{report.one_liner}”</p>
          </article>

          <article className="rounded-2xl border border-[#e0dfeb] bg-white p-6 shadow-[0_10px_30px_rgba(56,50,110,0.05)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">Questions Avoided</p>
            <h2 className="mt-1 font-heading text-xl font-bold">Worth revisiting</h2>
            {report.dodged_questions.length > 0 ? (
              <ol className="mt-5 space-y-4">
                {report.dodged_questions.map((question, index) => <li key={question} className="flex gap-3 text-sm leading-5 text-[var(--text-secondary)]"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#efeeff] text-xs font-bold text-[#5755d8]">{index + 1}</span>{question}</li>)}
              </ol>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">No dodged questions — you faced everything {studentName} threw at you.</p>
            )}
          </article>

          {session?.feedback ? (
            <article className="rounded-2xl border border-[#e0dfeb] bg-white p-6 shadow-[0_10px_30px_rgba(56,50,110,0.05)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">Your Reflection</p>
              <h2 className="mt-1 font-heading text-xl font-bold">Session clarity</h2>
              <StarRating rating={session.feedback.rating} className="mt-3" />
              {session.feedback.comment ? (
                <p className="mt-3 text-sm italic leading-6 text-[var(--text-secondary)]">“{session.feedback.comment}”</p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">You rated this session but left no written note.</p>
              )}
              <Link
                href={`/session/${encodeURIComponent(id)}/feedback?student=${selectedStudent}`}
                className="mt-4 inline-block text-xs font-semibold text-[#5755d8] hover:underline"
              >
                View in student diary →
              </Link>
            </article>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">Conversation Review</p>
        <h2 className="mt-1 font-heading text-2xl font-extrabold">Moments {studentName} got confused</h2>
        {report.vaguest_moments.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {report.vaguest_moments.map((moment, index) => (
              <article key={`${moment.node_id}-${index}`} className={`flex min-h-52 flex-col rounded-xl border border-[#e0dfeb] border-l-4 bg-white p-5 shadow-sm ${momentAccents[index % momentAccents.length]}`}>
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#7776df]">You said</span>
                <blockquote className="my-4 flex-1 text-sm italic leading-6 text-[var(--text-secondary)]">“{moment.quote}”</blockquote>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#858393]">{nodeName(moment.node_id)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">No vague moments captured — a remarkably crisp lesson.</p>
        )}
      </section>

      <section className="mt-10 rounded-2xl bg-[#eeedff] px-6 py-9 text-center sm:px-10">
        <h2 className="font-heading text-2xl font-extrabold">Ready to close these gaps?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {reteachNames.length > 0
            ? `Re-teach these in order: ${reteachNames.join(" → ")}.`
            : "Nothing left to re-teach — pick a harder topic."}
        </p>
        <ReteachButton
          sessionId={id}
          student={selectedStudent}
          hasGaps={reteachNames.length > 0}
          isMock={isMock}
        />
      </section>
    </main>
  );
}
