/**
 * B's eval harness. Run: npm run eval
 *
 * Four modes, selected via --mode=graph|evaluator|persona|gapmap (default:
 * evaluator — cheap and fast enough to run constantly). Never wait on the
 * app to test a prompt; this script hits Gemini directly.
 *
 * --mode=graph (Block B1 step 4, CP1): exercises generateGraph() against the
 *   5 fixed demo topics, dumps every node for eyeballing. `--save` writes
 *   fixtures/graphs/graph-<slug>.json.
 * --mode=evaluator (Block B2 step 6-7, CP2): runs evaluate() over every
 *   entry in test-utterances.json against fixtures/graph-tcp.json, prints
 *   utterance | verdict | quote side by side, and flags any quote that
 *   ISN'T a verbatim substring of what the user actually said — this is the
 *   paraphrase bug the build plan calls out explicitly.
 * --mode=persona (Block B2 step 8-9, CP2): takes each evaluator run's
 *   recommended_directive and runs personaReply(), prints Sam's reply, and
 *   flags cheap guardrail violations (too many sentences, likely
 *   term-leakage) so adversarial breaks are easy to spot.
 * --mode=gapmap (Block B3 step 11, CP3): runs generateGapMap() over a few
 *   synthetic "played session" versions of fixtures/graph-tcp.json (mostly
 *   solid / mixed / mostly rough), prints the one_liner + reteach_order +
 *   vaguest_moments for eyeballing (iterate on the one_liner here), and
 *   flags anything that fails the deterministic-passthrough or
 *   verbatim-quote guarantees generateGapMap.ts is supposed to enforce.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { generateGraph } from "../generateGraph";
import { evaluate } from "../evaluate";
import { personaReply } from "../personaReply";
import { generateGapMap } from "../generateGapMap";
import { collectGapMapMaterials } from "@/server/orchestrator/gapMapMaterials";
import type { ConceptGraph, ConceptNode, NodeState, Utterance, Verdict } from "@/lib/types";

const DEMO_TOPICS = [
  "TCP congestion control",
  "how HTTPS works",
  "photosynthesis",
  "inflation",
  "binary search trees",
];

const ROOT = join(__dirname, "..", "..", "..");
const FIXTURES_DIR = join(ROOT, "fixtures", "graphs");
const TCP_GRAPH_PATH = join(ROOT, "fixtures", "graph-tcp.json");
const TEST_UTTERANCES_PATH = join(__dirname, "test-utterances.json");

function slugify(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truncate(text: string, max = 70): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/** Free-tier RPM limits are easy to blow through firing N test cases back to
 * back (confirmed via 429s as low as 5 req/min) — pace requests defensively
 * between iterations. gemini.ts also retries individual 429s with backoff,
 * so this is belt-and-suspenders, not the only safety net. */
const RATE_LIMIT_DELAY_MS = 13000;
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── --mode=graph (CP1) ───────────────────────────────────────────

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

async function runGraphMode(): Promise<void> {
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
  if (failures.length) console.log(`Failed: ${failures.join(", ")}`);

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

// ── shared test-utterance loading (CP2) ─────────────────────────

interface RawTestUtterance {
  kind: string;
  node?: string;
  nodes?: string[];
  transcript?: { role: "user" | "student"; text: string }[];
  text: string;
}

function loadTestUtterances(): RawTestUtterance[] {
  const raw = JSON.parse(readFileSync(TEST_UTTERANCES_PATH, "utf8"));
  return raw.utterances as RawTestUtterance[];
}

function loadTcpGraph(): ConceptGraph {
  return JSON.parse(readFileSync(TCP_GRAPH_PATH, "utf8")) as ConceptGraph;
}

/** Prior turns as real Utterance objects (ts filled in, oldest first). */
function priorTranscript(tc: RawTestUtterance): Utterance[] {
  const base = Date.now() - 60_000;
  return (tc.transcript ?? []).map((t, i) => ({ ...t, ts: base + i * 1000 }));
}

// ── --mode=evaluator (CP2) ───────────────────────────────────────

/** A quote is verbatim if it's an exact substring of something a user actually said —
 * either in this turn's text or in an earlier "user" turn in the fixture transcript. */
function isVerbatim(quote: string, tc: RawTestUtterance): boolean {
  const userTexts = [tc.text, ...(tc.transcript ?? []).filter((t) => t.role === "user").map((t) => t.text)];
  return userTexts.some((text) => text.includes(quote));
}

async function runEvaluatorMode(): Promise<void> {
  const graph = loadTcpGraph();
  const testCases = loadTestUtterances();
  let paraphraseFlags = 0;

  for (const [i, tc] of testCases.entries()) {
    if (i > 0) await delay(RATE_LIMIT_DELAY_MS);
    console.log(`\n--- [${tc.kind}] ---`);
    console.log(`  text: "${truncate(tc.text, 100)}"`);
    try {
      const verdict = await evaluate(graph, priorTranscript(tc), tc.text);
      console.log(`  nodes_touched: [${verdict.nodes_touched.join(", ")}]`);
      for (const v of verdict.verdicts) {
        const quoteOk = v.quote === undefined || isVerbatim(v.quote, tc);
        const flag = quoteOk ? "" : "  <-- NOT VERBATIM, paraphrase suspected";
        console.log(`    ${v.node_id}: ${v.verdict}${v.quote ? ` quote="${v.quote}"` : ""}${flag}`);
        if (!quoteOk) paraphraseFlags++;
      }
      console.log(
        `  directive: ${verdict.recommended_directive.type}${verdict.recommended_directive.node_id ? `(${verdict.recommended_directive.node_id})` : ""}`
      );
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n--- ${testCases.length} utterances evaluated, ${paraphraseFlags} paraphrase flag(s) ---`);
}

// ── --mode=persona (CP2) ─────────────────────────────────────────

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "to", "and", "or", "is", "are", "as",
  "per", "at", "for", "with", "via",
]);

function graphKeywords(graph: ConceptGraph, exclude: Set<string>): string[] {
  const words = new Set<string>();
  for (const node of graph.nodes) {
    for (const word of node.name.toLowerCase().split(/\W+/)) {
      if (word.length > 3 && !STOPWORDS.has(word) && !exclude.has(word)) words.add(word);
    }
  }
  return [...words];
}

function userIntroducedWords(tc: RawTestUtterance): Set<string> {
  const texts = [tc.text, ...(tc.transcript ?? []).map((t) => t.text)];
  const words = new Set<string>();
  for (const text of texts) {
    for (const word of text.toLowerCase().split(/\W+/)) words.add(word);
  }
  return words;
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
}

async function runPersonaMode(): Promise<void> {
  const graph = loadTcpGraph();
  const testCases = loadTestUtterances();

  for (const [i, tc] of testCases.entries()) {
    if (i > 0) await delay(RATE_LIMIT_DELAY_MS);
    console.log(`\n--- [${tc.kind}] ---`);
    console.log(`  text: "${truncate(tc.text, 100)}"`);
    try {
      const verdict: Verdict = await evaluate(graph, priorTranscript(tc), tc.text);
      const transcript: Utterance[] = [
        ...priorTranscript(tc),
        { role: "user", text: tc.text, ts: Date.now() },
      ];

      let reply = "";
      for await (const token of personaReply(transcript, verdict.recommended_directive)) {
        reply += token;
      }

      const sentences = sentenceCount(reply);
      const introduced = userIntroducedWords(tc);
      const leaked = graphKeywords(graph, introduced).filter((kw) => reply.toLowerCase().includes(kw));

      console.log(`  directive: ${verdict.recommended_directive.type}${verdict.recommended_directive.node_id ? `(${verdict.recommended_directive.node_id})` : ""}`);
      console.log(`  Sam: "${reply}"`);
      if (sentences > 2) console.log(`    <-- GUARDRAIL: ${sentences} sentences (max 2)`);
      if (leaked.length) console.log(`    <-- GUARDRAIL: possible term leak: ${leaked.join(", ")}`);
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    "\n(Manually try the 3 adversarial attacks too: ask Sam a direct factual question, bait it into using an unintroduced term, feed it a wrong answer and see if it ever sounds like it's confirming.)"
  );
}

// ── --mode=gapmap (CP3) ──────────────────────────────────────────

/** Node-state overrides + optional vague_quotes to stamp onto a cloned
 * fixtures/graph-tcp.json, simulating what a real played session would
 * leave behind on the graph. */
type StateOverride = { id: string; state: NodeState; vague_quotes?: string[] };

interface GapMapScenario {
  name: string;
  overrides: StateOverride[];
}

const GAPMAP_SCENARIOS: GapMapScenario[] = [
  {
    name: "mostly-solid",
    overrides: [
      { id: "n1", state: "solid" },
      { id: "n2", state: "solid" },
      { id: "n3", state: "vague", vague_quotes: ["there's a threshold thing that changes how it grows, somehow"] },
      { id: "n4", state: "solid" },
      { id: "n5", state: "solid" },
      { id: "n6", state: "solid" },
      { id: "n7", state: "solid" },
      { id: "n8", state: "solid" },
    ],
  },
  {
    name: "mixed",
    overrides: [
      { id: "n1", state: "solid" },
      { id: "n2", state: "solid" },
      { id: "n3", state: "vague", vague_quotes: ["the threshold is just, you know, a number the connection picks"] },
      { id: "n4", state: "vague", vague_quotes: ["after that it grows... slower? in some proportional way"] },
      { id: "n5", state: "solid" },
      { id: "n6", state: "dodged" },
      { id: "n7", state: "unvisited" },
      { id: "n8", state: "wrong" },
    ],
  },
  {
    name: "mostly-rough",
    overrides: [
      { id: "n1", state: "vague", vague_quotes: ["it like... speeds up until it doesn't, you know?"] },
      { id: "n2", state: "wrong" },
      { id: "n3", state: "vague", vague_quotes: ["there's a threshold thing that changes how it grows, somehow"] },
      { id: "n4", state: "dodged" },
      { id: "n5", state: "vague", vague_quotes: ["it's like a signal that something bad happened I guess"] },
      { id: "n6", state: "dodged" },
      { id: "n7", state: "unvisited" },
      { id: "n8", state: "wrong" },
    ],
  },
];

function applyOverrides(graph: ConceptGraph, overrides: StateOverride[]): ConceptGraph {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  const nodes: ConceptNode[] = graph.nodes.map((n) => {
    const override = byId.get(n.id);
    if (!override) return n;
    return { ...n, state: override.state, vague_quotes: override.vague_quotes ?? [] };
  });
  return { ...graph, nodes };
}

async function runGapMapScenario(scenario: GapMapScenario, baseGraph: ConceptGraph): Promise<void> {
  const playedGraph = applyOverrides(baseGraph, scenario.overrides);
  const { quotes, dodged } = collectGapMapMaterials(playedGraph);

  console.log(`\n--- [${scenario.name}] ---`);
  console.log(`  candidate quotes: ${quotes.length}, dodged: [${dodged.join(", ")}]`);

  try {
    const gapMap = await generateGapMap(playedGraph, quotes, dodged);

    console.log(`  one_liner: "${gapMap.one_liner}"`);
    console.log(`  reteach_order: [${gapMap.reteach_order.join(", ")}]`);
    console.log(`  vaguest_moments:`);
    for (const m of gapMap.vaguest_moments) {
      console.log(`    [${m.node_id}] "${m.quote}"`);
    }

    // Deterministic-passthrough sanity checks — these must NEVER fail; a
    // failure here means generateGapMap.ts stopped injecting these fields
    // in code and let the model touch them instead.
    const nodesMatch =
      gapMap.nodes.length === playedGraph.nodes.length &&
      gapMap.nodes.every((n, i) => n.id === playedGraph.nodes[i].id && n.state === playedGraph.nodes[i].state);
    if (!nodesMatch) console.log(`    <-- CHECK FAILED: gap map nodes don't match input graph passthrough`);

    const dodgedMatch = JSON.stringify(gapMap.dodged_questions) === JSON.stringify(dodged);
    if (!dodgedMatch) console.log(`    <-- CHECK FAILED: dodged_questions isn't an exact passthrough of dodged input`);

    // Verbatim-by-construction check — every featured quote must be a member
    // of the candidate list we actually gave the model.
    const allVerbatim = gapMap.vaguest_moments.every((m) =>
      quotes.some((q) => q.quote === m.quote && q.node_id === m.node_id)
    );
    if (!allVerbatim) console.log(`    <-- CHECK FAILED: a vaguest_moments quote isn't verbatim from the candidate list`);

    // Every reteach_order id must be a real, non-solid node.
    const nonSolidIds = new Set(playedGraph.nodes.filter((n) => n.state !== "solid").map((n) => n.id));
    const reteachValid = gapMap.reteach_order.every((id) => nonSolidIds.has(id));
    if (!reteachValid) console.log(`    <-- CHECK FAILED: reteach_order contains a solid or unknown node id`);
  } catch (err) {
    console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function runGapMapMode(): Promise<void> {
  const baseGraph = loadTcpGraph();

  for (const [i, scenario] of GAPMAP_SCENARIOS.entries()) {
    if (i > 0) await delay(RATE_LIMIT_DELAY_MS);
    await runGapMapScenario(scenario, baseGraph);
  }

  console.log(
    "\n(Eyeball every one_liner above — it should name the actual weak concept, not read generically. Re-run freely; one_liner_candidates are re-ranked fresh each call.)"
  );
}

// ── entrypoint ───────────────────────────────────────────────────

async function main(): Promise<void> {
  const modeArg = process.argv.find((a) => a.startsWith("--mode="));
  const mode = modeArg ? modeArg.split("=")[1] : "evaluator";

  if (mode === "graph") return runGraphMode();
  if (mode === "evaluator") return runEvaluatorMode();
  if (mode === "persona") return runPersonaMode();
  if (mode === "gapmap") return runGapMapMode();

  throw new Error(`Unknown --mode="${mode}" (expected graph|evaluator|persona|gapmap)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
