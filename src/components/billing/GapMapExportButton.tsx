"use client";

import type { GapMap } from "@/lib/types";

function gapMapToMarkdown(report: GapMap): string {
  const lines: string[] = [
    `# Understanding map — ${report.topic}`,
    "",
    report.one_liner,
    "",
    "## Concepts",
  ];
  for (const node of report.nodes) {
    lines.push(`- **${node.name}** (\`${node.id}\`): ${node.state}`);
  }
  if (report.vaguest_moments.length) {
    lines.push("", "## Vaguest moments");
    for (const m of report.vaguest_moments) {
      lines.push(`- "${m.quote}" (${m.node_id})`);
    }
  }
  if (report.dodged_questions.length) {
    lines.push("", "## Dodged questions");
    for (const q of report.dodged_questions) {
      lines.push(`- ${q}`);
    }
  }
  if (report.reteach_order.length) {
    lines.push("", "## Reteach order");
    report.reteach_order.forEach((id, i) => {
      const name = report.nodes.find((n) => n.id === id)?.name ?? id;
      lines.push(`${i + 1}. ${name}`);
    });
  }
  lines.push("");
  return lines.join("\n");
}

export function GapMapExportButton({ report }: { report: GapMap }) {
  return (
    <button
      type="button"
      onClick={() => {
        const md = gapMapToMarkdown(report);
        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gap-map-${report.topic.replace(/\s+/g, "-").toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }}
      className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand-soft)] px-4 py-2 text-xs font-semibold text-[var(--nav-active)] transition hover:bg-[var(--brand)] hover:text-white"
    >
      Export gap map
    </button>
  );
}
