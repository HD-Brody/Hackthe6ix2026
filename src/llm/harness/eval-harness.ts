/**
 * B's eval harness (Block B1 step 4). Run: npm run eval
 *
 * CP1 scope: exercises generateGraph() against the 5 fixed demo topics and
 * dumps every node so you can eyeball probeability fast, without opening
 * JSON files by hand. Crude is fine — you'll run this fifty times this
 * weekend.
 *
 * Never wait on the app to test a prompt; this script hits Gemini directly.
 *
 * `npm run eval -- --save` additionally writes each vetted graph to
 * fixtures/graphs/graph-<slug>.json (the CP1 cached-demo-graph deliverable).
 *
 * Block B2 will extend this file (or add a sibling script) to run
 * evaluate() over test-utterances.json the same way — not needed yet.
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { generateGraph } from "../generateGraph";
import type { ConceptGraph } from "@/lib/types";

const DEMO_TOPICS = [
  "TCP congestion control",
  "how HTTPS works",
  "photosynthesis",
  "inflation",
  "binary search trees",
];

const FIXTURES_DIR = join(__dirname, "..", "..", "..", "fixtures", "graphs");

function slugify(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truncate(text: string, max = 70): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function printGraph(graph: ConceptGraph): void {
  console.log(`\n=== ${graph.topic} (${graph.nodes.length} nodes) ===`);
  for (const node of graph.nodes) {
    const prereqs = node.prereqs.length ? node.prereqs.join(",") : "-";
    console.log(
      `  ${node.id.padEnd(4)} d${node.difficulty} [${prereqs.padEnd(10)}] ${node.name.padEnd(32)} ${truncate(node.truth)}`
    );
    console.log(`       probes: ${node.probes.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const shouldSave = process.argv.includes("--save");
  const results: ConceptGraph[] = [];
  const failures: string[] = [];

  for (const topic of DEMO_TOPICS) {
    try {
      console.log(`\nGenerating graph for "${topic}"...`);
      const graph = await generateGraph(topic);
      printGraph(graph);
      results.push(graph);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${message}`);
      failures.push(topic);
    }
  }

  console.log(`\n--- ${results.length}/${DEMO_TOPICS.length} graphs generated ---`);
  if (failures.length) {
    console.log(`Failed: ${failures.join(", ")}`);
  }

  if (shouldSave && results.length) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
    for (const graph of results) {
      const path = join(FIXTURES_DIR, `graph-${slugify(graph.topic)}.json`);
      writeFileSync(path, JSON.stringify(graph, null, 2) + "\n");
      console.log(`Saved ${path}`);
    }
  } else if (!shouldSave) {
    console.log("\n(Eyeball the output above. Re-run with --save once you're happy to write fixtures/graphs/.)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
