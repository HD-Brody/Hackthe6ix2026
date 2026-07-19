/**
 * LLM seam — thin dispatcher for the turn/end routes.
 *
 * Import from here, not from @/llm/* directly. Flip LLM_MOCK=true to run the
 * full loop (evaluate → policy → persona → gap map) without B's Gemini modules.
 */

import * as realEvaluate from "@/llm/evaluate";
import * as realPersona from "@/llm/personaReply";
import * as realGapMap from "@/llm/generateGapMap";
import verdictVague from "@/../fixtures/verdict-vague.json";
import verdictSolid from "@/../fixtures/verdict-solid.json";
import personaReplies from "@/../fixtures/persona-replies.json";
import gapmapTcp from "@/../fixtures/gapmap-tcp.json";
import type {
  ConceptGraph,
  Utterance,
  Verdict,
  Directive,
  GapMap,
  VagueMoment,
  PriorGapContext,
} from "@/lib/types";

const MOCK = process.env.LLM_MOCK === "true";

function envMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Simulated Gemini latency for mock mode — tune for slow-day A/B tests. */
const MOCK_EVAL_MS = envMs("MOCK_EVAL_MS", 800);
const MOCK_PERSONA_FIRST_TOKEN_MS = envMs("MOCK_PERSONA_FIRST_TOKEN_MS", 600);
const MOCK_TOKEN_MS = envMs("MOCK_TOKEN_MS", 40);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** User-turn index (1-based). Call after the current user utterance is in transcript. */
function userTurnNumber(transcript: Utterance[]): number {
  const n = transcript.filter((u) => u.role === "user").length;
  return Math.max(n, 1);
}

async function mockEvaluate(
  _graph: ConceptGraph,
  transcript: Utterance[],
  _userText: string
): Promise<Verdict> {
  await delay(MOCK_EVAL_MS);
  const turn = userTurnNumber(transcript);
  return (turn % 2 === 1 ? verdictVague : verdictSolid) as Verdict;
}

async function* mockPersonaReply(
  transcript: Utterance[],
  _directive: Directive
): AsyncIterable<string> {
  await delay(MOCK_PERSONA_FIRST_TOKEN_MS);
  const index = transcript.length % personaReplies.replies.length;
  const line = personaReplies.replies[index];
  const words = line.split(" ");

  for (let i = 0; i < words.length; i++) {
    yield i < words.length - 1 ? `${words[i]} ` : words[i];
    if (i < words.length - 1) await delay(MOCK_TOKEN_MS);
  }
}

async function* mockBridgingPersonaReply(
  priorGapContext: PriorGapContext
): AsyncIterable<string> {
  await delay(MOCK_PERSONA_FIRST_TOKEN_MS);
  const focus = priorGapContext.reteach_names[0] ?? "that part";
  const line = `Okay so last time I still didn't get ${focus} — can you walk me through that again?`;
  const words = line.split(" ");
  for (let i = 0; i < words.length; i++) {
    yield i < words.length - 1 ? `${words[i]} ` : words[i];
    if (i < words.length - 1) await delay(MOCK_TOKEN_MS);
  }
}

async function mockGenerateGapMap(
  graph: ConceptGraph,
  _quotes: VagueMoment[],
  _dodged: string[]
): Promise<GapMap> {
  return { ...(gapmapTcp as GapMap), topic: graph.topic };
}

export const evaluate = MOCK ? mockEvaluate : realEvaluate.evaluate;
export const personaReply = MOCK ? mockPersonaReply : realPersona.personaReply;
export const bridgingPersonaReply = MOCK
  ? mockBridgingPersonaReply
  : realPersona.bridgingPersonaReply;
export const generateGapMap = MOCK ? mockGenerateGapMap : realGapMap.generateGapMap;
