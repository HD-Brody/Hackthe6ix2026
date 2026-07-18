import { GapMapGrid } from "@/components/GapMapGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { GapMap } from "@/lib/types";

const report: GapMap = {
  topic: "Quantum Computing Fundamentals",
  nodes: [
    { id: "qubits", name: "Qubits", state: "solid" },
    { id: "superposition", name: "Superposition", state: "solid" },
    { id: "entanglement", name: "Entanglement Logic", state: "vague" },
    { id: "gates", name: "Quantum Gates", state: "unvisited" },
  ],
  vaguest_moments: [
    { node_id: "entanglement", quote: "I think entanglement means the particles are communicating instantly... or maybe they just share the same state?" },
    { node_id: "measurement", quote: "When we measure a qubit, it picks one state. But I'm not sure why the other possibilities disappear." },
    { node_id: "gates", quote: "The Hadamard gate creates superposition, but I couldn't explain what the matrix actually changes." },
  ],
  dodged_questions: [
    "How does measurement affect entangled qubits?",
    "What makes a quantum gate reversible?",
    "Why can't we copy an unknown qubit?",
  ],
  reteach_order: ["Measurement Axioms", "Quantum Gates", "No-Cloning Theorem"],
  one_liner: "You have a strong intuitive grasp of the core ideas. A few technical links need another pass.",
};

const moments = [
  { time: "04:32", label: "ENTANGLEMENT LOGIC", color: "border-l-[#e5bd45]", text: report.vaguest_moments[0].quote },
  { time: "09:18", label: "MEASUREMENT", color: "border-l-[#7776df]", text: report.vaguest_moments[1].quote },
  { time: "14:06", label: "QUANTUM GATES", color: "border-l-[#b7b7c3]", text: report.vaguest_moments[2].quote },
];

function ShareIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4"><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="m8.3 10.9 7.4-4.5M8.3 13.1l7.4 4.5" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

export default function ReportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f9f9fc] text-[var(--text-primary)]">
      <SiteHeader activeItem="analytics" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Your Understanding Map</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">Session Analysis: {report.topic}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#ecebff] px-4 py-2 text-xs font-bold text-[#5655c8]">Completed Apr 24</span>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[#c9c7d8] bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:border-[#7776df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
              <ShareIcon /> Share Report
            </button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <article className="rounded-2xl border border-[#e0dfeb] bg-white p-5 shadow-[0_10px_30px_rgba(56,50,110,0.06)] sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">Knowledge Visualization</p>
                <h2 className="mt-1 font-heading text-xl font-bold">Concept Connections</h2>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#57b98b]" />Strong</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#e4bf53]" />Clarify</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#b7b7c3]" />Gap</span>
              </div>
            </div>
            <GapMapGrid gapMap={report} />
          </article>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-2xl bg-gradient-to-br from-[#5755d8] to-[#7776df] p-6 text-white shadow-[0_12px_28px_rgba(87,85,216,0.24)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/75">Professor Me Insight</p>
              <div className="mt-5 flex items-end gap-2"><strong className="font-heading text-5xl">78%</strong><span className="pb-1 text-sm text-white/75">clarity</span></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full w-[78%] rounded-full bg-white" /></div>
              <p className="mt-5 text-sm leading-6 text-white/90">“{report.one_liner}”</p>
            </article>

            <article className="rounded-2xl border border-[#e0dfeb] bg-white p-6 shadow-[0_10px_30px_rgba(56,50,110,0.05)]">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">Questions Avoided</p>
              <h2 className="mt-1 font-heading text-xl font-bold">Worth revisiting</h2>
              <ol className="mt-5 space-y-4">
                {report.dodged_questions.map((question, index) => <li key={question} className="flex gap-3 text-sm leading-5 text-[var(--text-secondary)]"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#efeeff] text-xs font-bold text-[#5755d8]">{index + 1}</span>{question}</li>)}
              </ol>
            </article>
          </div>
        </section>

        <section className="mt-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">Conversation Review</p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold">Moments Sam got confused</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {moments.map((moment) => <article key={moment.time} className={`flex min-h-52 flex-col rounded-xl border border-[#e0dfeb] border-l-4 bg-white p-5 shadow-sm ${moment.color}`}><time className="text-xs font-bold text-[#7776df]">{moment.time}</time><blockquote className="my-4 flex-1 text-sm italic leading-6 text-[var(--text-secondary)]">“{moment.text}”</blockquote><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#858393]">{moment.label}</p></article>)}
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-[#eeedff] px-6 py-9 text-center sm:px-10">
          <h2 className="font-heading text-2xl font-extrabold">Ready to close these gaps?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Turn the concepts that need another pass into a focused follow-up lesson.</p>
          <button type="button" className="mt-5 rounded-lg bg-[#5755d8] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#4846c5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">Start Bridging Lesson</button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
