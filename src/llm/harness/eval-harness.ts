/**
 * B's eval harness. Run: npm run eval
 *
 * Three modes, selected via --mode=graph|evaluator|persona (default:
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
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { generateGraph } from "../generateGraph";
import { evaluate } from "../evaluate";
import { personaReply } from "../personaReply";
import type { ConceptGraph, Utterance, Verdict } from "@/lib/types";

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

// ── entrypoint ───────────────────────────────────────────────────

async function main(): Promise<void> {
  const modeArg = process.argv.find((a) => a.startsWith("--mode="));
  const mode = modeArg ? modeArg.split("=")[1] : "evaluator";

  if (mode === "graph") return runGraphMode();
  if (mode === "evaluator") return runEvaluatorMode();
  if (mode === "persona") return runPersonaMode();

  throw new Error(`Unknown --mode="${mode}" (expected graph|evaluator|persona)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
