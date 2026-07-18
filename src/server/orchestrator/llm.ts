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
} from "@/lib/types";

const MOCK = process.env.LLM_MOCK === "true";
const TOKEN_DELAY_MS = 40;

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
  const turn = userTurnNumber(transcript);
  return (turn % 2 === 1 ? verdictVague : verdictSolid) as Verdict;
}

async function* mockPersonaReply(
  transcript: Utterance[],
  _directive: Directive
): AsyncIterable<string> {
  const index = transcript.length % personaReplies.replies.length;
  const line = personaReplies.replies[index];
  const words = line.split(" ");

  for (let i = 0; i < words.length; i++) {
    yield i < words.length - 1 ? `${words[i]} ` : words[i];
    if (i < words.length - 1) await delay(TOKEN_DELAY_MS);
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
export const generateGapMap = MOCK ? mockGenerateGapMap : realGapMap.generateGapMap;
