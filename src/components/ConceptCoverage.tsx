"use client";

import { useState } from "react";
import type { GapMap, NodeState } from "@/lib/types";
import {
  computeComprehensionStats,
  formatBreakdown,
} from "@/lib/comprehension";
import { MasteryBar } from "@/components/MasteryBar";

const chipStyles: Record<NodeState, string> = {
  solid: "border-[#57b98b] bg-[#effbf5] text-[#19704d]",
  vague: "border-[#e4bf53] bg-[#fff9e8] text-[#745b13]",
  wrong: "border-[var(--state-wrong)] bg-red-50 text-red-800",
  dodged: "border-[var(--state-dodged)] bg-purple-50 text-purple-800",
  touched: "border-[var(--state-touched)] bg-blue-50 text-blue-800",
  unvisited: "border-[#d4d4dc] bg-[#f7f7fa] text-[#696978]",
};

interface LaneProps {
  title: string;
  nodes: { id: string; name: string; state: NodeState }[];
}

function ConceptLane({ title, nodes }: LaneProps) {
  if (nodes.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#858393]">
        {title} ({nodes.length})
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {nodes.map((node) => (
          <li
            key={node.id}
            className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${chipStyles[node.state]}`}
          >
            {node.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ConceptCoverage({ gapMap }: { gapMap: GapMap }) {
  const [showUnexplored, setShowUnexplored] = useState(false);
  const stats = computeComprehensionStats(gapMap.nodes);

  const gaps = stats.discussedNodes.filter(
    (n) => n.state === "wrong" || n.state === "dodged"
  );
  const shaky = stats.discussedNodes.filter(
    (n) => n.state === "vague" || n.state === "touched"
  );
  const nailed = stats.discussedNodes.filter((n) => n.state === "solid");

  return (
    <div className="mt-5" aria-label="Concept coverage map">
      <MasteryBar nodes={stats.discussedNodes} />

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        {stats.discussed > 0 ? (
          <>
            <span className="font-semibold text-[var(--text-primary)]">
              {stats.discussed} of {stats.total} concepts discussed
            </span>
            {" · "}
            {formatBreakdown(stats)}
          </>
        ) : (
          "No concepts explored yet — start teaching to build your map."
        )}
      </p>

      {stats.discussed > 0 ? (
        <div className="mt-6 space-y-5">
          <ConceptLane title="Gaps to close" nodes={gaps} />
          <ConceptLane title="Still shaky" nodes={shaky} />
          <ConceptLane title="Nailed it" nodes={nailed} />
        </div>
      ) : null}

      {stats.unexplored > 0 ? (
        <div className="mt-6 border-t border-[#e8e6ef] pt-5">
          <button
            type="button"
            onClick={() => setShowUnexplored((v) => !v)}
            className="flex w-full items-center gap-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-expanded={showUnexplored}
          >
            <span
              className="inline-block text-xs transition-transform"
              style={{ transform: showUnexplored ? "rotate(90deg)" : "rotate(0deg)" }}
              aria-hidden
            >
              ▸
            </span>
            {stats.unexplored} concept{stats.unexplored === 1 ? "" : "s"} not discussed
          </button>
          {showUnexplored ? (
            <>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Side topics from the blueprint — not graded.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {stats.unexploredNodes.map((node) => (
                  <li
                    key={node.id}
                    className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium ${chipStyles.unvisited}`}
                  >
                    {node.name}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
