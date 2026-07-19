import type { WeakConcept } from "@/lib/analyticsStats";
import type { NodeState } from "@/lib/types";

const stateLabels: Record<NodeState, string> = {
  wrong: "Wrong",
  dodged: "Dodged",
  vague: "Hand-waved",
  touched: "Mentioned",
  solid: "Solid",
  unvisited: "Unvisited",
};

const stateTone: Record<NodeState, string> = {
  wrong: "text-rose-700 dark:text-rose-400",
  dodged: "text-[var(--state-dodged)]",
  vague: "text-amber-700 dark:text-amber-400",
  touched: "text-[var(--text-secondary)]",
  solid: "text-emerald-700 dark:text-emerald-400",
  unvisited: "text-[var(--text-secondary)]",
};

export function WeakConcepts({ concepts }: { concepts: WeakConcept[] }) {
  return (
    <section>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">
        Patterns
      </p>
      <h2 className="mt-1 font-heading text-2xl font-extrabold">
        Concepts that keep tripping you up
      </h2>

      {concepts.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {concepts.map((concept, index) => (
            <li
              key={concept.name}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--nav-active)]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold">
                  {concept.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Appeared in {concept.sessionCount} session
                  {concept.sessionCount === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-bold uppercase tracking-[0.08em] ${stateTone[concept.worstState]}`}
              >
                {stateLabels[concept.worstState]}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            No recurring weak spots yet — keep teaching and patterns will emerge.
          </p>
        </div>
      )}
    </section>
  );
}
