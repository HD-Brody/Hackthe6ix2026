import type { NodeState } from "@/lib/types";
import type { CoverageNode } from "@/lib/comprehension";

const segmentColors: Record<NodeState, string> = {
  solid: "bg-[#57b98b]",
  vague: "bg-[#e4bf53]",
  wrong: "bg-[var(--state-wrong)]",
  dodged: "bg-[var(--state-dodged)]",
  touched: "bg-[var(--state-touched)]",
  unvisited: "bg-[#c7c7d2]",
};

const stateLabels: Record<NodeState, string> = {
  solid: "Solid",
  vague: "Hand-waved",
  wrong: "Got it wrong",
  dodged: "Dodged",
  touched: "Mentioned",
  unvisited: "Not discussed",
};

/** Worst-first for left-to-right reading. */
const barOrder: NodeState[] = ["wrong", "dodged", "vague", "touched", "solid"];

export function MasteryBar({ nodes }: { nodes: CoverageNode[] }) {
  if (nodes.length === 0) {
    return (
      <div
        className="h-3 w-full rounded-full bg-[#eceef0]"
        aria-label="No concepts explored yet"
      />
    );
  }

  const sorted = [...nodes].sort(
    (a, b) => barOrder.indexOf(a.state) - barOrder.indexOf(b.state)
  );

  return (
    <div
      className="flex h-3 w-full overflow-hidden rounded-full bg-[#eceef0]"
      role="img"
      aria-label={`Mastery bar: ${sorted.map((n) => `${n.name} (${stateLabels[n.state]})`).join(", ")}`}
    >
      {sorted.map((node) => (
        <div
          key={node.id}
          className={`min-w-[4px] flex-1 ${segmentColors[node.state]}`}
          title={`${node.name} — ${stateLabels[node.state]}`}
        />
      ))}
    </div>
  );
}
