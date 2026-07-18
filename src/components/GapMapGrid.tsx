/**
 * Color-coded concept map for the report page. Renders EVERY node (the plan:
 * a sorted grid reads better on a projector than a fancy graph layout).
 * Sorted worst-first so the gaps lead. State colors match the legend.
 */

import type { GapMap, NodeState } from "@/lib/types";

const stateStyles: Record<NodeState, string> = {
  solid: "border-[#57b98b] bg-[#effbf5] text-[#19704d]",
  vague: "border-[#e4bf53] bg-[#fff9e8] text-[#745b13]",
  wrong: "border-[var(--state-wrong)] bg-red-50 text-red-800",
  dodged: "border-[var(--state-dodged)] bg-purple-50 text-purple-800",
  touched: "border-[var(--state-touched)] bg-blue-50 text-blue-800",
  unvisited: "border-[#c7c7d2] bg-[#f7f7fa] text-[#696978]",
};

const stateLabels: Record<NodeState, string> = {
  solid: "Solid",
  vague: "Hand-waved",
  wrong: "Got it wrong",
  dodged: "Dodged",
  touched: "Mentioned",
  unvisited: "Never reached",
};

/** Worst-first: the gaps are the story. */
const stateOrder: NodeState[] = ["wrong", "dodged", "vague", "touched", "unvisited", "solid"];

export function GapMapGrid({ gapMap }: { gapMap: GapMap }) {
  const sorted = [...gapMap.nodes].sort(
    (a, b) => stateOrder.indexOf(a.state) - stateOrder.indexOf(b.state)
  );

  return (
    <div className="mt-5" aria-label="Knowledge concept map">
      <div className="mx-auto mb-5 w-fit rounded-full border-4 border-[#6766db] bg-[#eeedff] px-6 py-3 text-center font-heading text-base font-bold text-[#4240b7] shadow-sm sm:text-lg">
        {gapMap.topic}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((node) => (
          <li
            key={node.id}
            className={`flex min-h-20 flex-col justify-between rounded-xl border-[3px] p-3 shadow-sm ${stateStyles[node.state]}`}
          >
            <span className="text-sm font-bold leading-tight">{node.name}</span>
            <span className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-70">
              {stateLabels[node.state]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
