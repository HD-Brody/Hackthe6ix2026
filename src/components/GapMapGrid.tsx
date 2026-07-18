/** Color-coded concept map for the report page. */

import type { GapMap, NodeState } from "@/lib/types";

const stateStyles: Record<NodeState, string> = {
  solid: "border-[#57b98b] bg-[#effbf5] text-[#19704d]",
  vague: "border-[#e4bf53] bg-[#fff9e8] text-[#745b13]",
  wrong: "border-[var(--state-wrong)] bg-red-50 text-red-800",
  dodged: "border-[var(--state-dodged)] bg-orange-50 text-orange-800",
  touched: "border-[var(--state-touched)] bg-blue-50 text-blue-800",
  unvisited: "border-[#c7c7d2] bg-[#f7f7fa] text-[#696978]",
};

const positions = [
  "left-[3%] top-[16%] sm:left-[7%] sm:top-[18%]",
  "bottom-[4%] left-[8%] sm:bottom-[8%] sm:left-[25%]",
  "right-[2%] top-[9%] sm:right-[10%] sm:top-[12%]",
  "bottom-[3%] right-[3%] sm:bottom-[8%] sm:right-[8%]",
];

export function GapMapGrid({ gapMap }: { gapMap: GapMap }) {
  return (
    <div className="relative h-[330px] w-full sm:h-[430px]" aria-label="Knowledge concept map">
      <svg aria-hidden="true" className="absolute inset-0 size-full text-[#bab7d0]" viewBox="0 0 700 430" preserveAspectRatio="none">
        <path d="M350 215 120 110M350 215 235 350M350 215 570 95M350 215 610 350" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" />
      </svg>

      <div className="absolute left-1/2 top-1/2 z-10 flex size-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#6766db] bg-[#eeedff] px-3 text-center font-heading text-sm font-bold leading-tight text-[#4240b7] shadow-sm sm:size-36 sm:text-base">
        Quantum<br />Basics
      </div>

      {gapMap.nodes.slice(0, 4).map((node, index) => (
        <div
          key={node.id}
          className={`absolute z-10 flex size-[88px] items-center justify-center rounded-full border-[3px] px-2 text-center text-xs font-bold leading-tight shadow-sm sm:size-28 sm:text-sm ${positions[index]} ${stateStyles[node.state]}`}
        >
          {node.name}
        </div>
      ))}
    </div>
  );
}
