/**
 * Gap-map generation. Owner: B (Block B3). CP3 deliverable.
 *
 * The one_liner is the star — iterate until it stings correctly
 * ("You understand TCP until a packet actually gets lost").
 *
 * NEVER CUT (per the plan's cut list): the gap map with verbatim quotes
 * is the product.
 *
 * Design: only `reteach_order` and `one_liner_candidates` are genuinely
 * LLM-authored. Everything else is either a deterministic passthrough
 * (`topic`, `nodes`, `dodged_questions`) or an LLM selection that gets
 * validated against known-good input before being trusted
 * (`vaguest_moments` must be an exact match against `quotes`). This keeps
 * hallucination risk confined to the two fields that actually require
 * judgment instead of exact recall.
 */

import { Type } from "@google/genai";
import type { ConceptGraph, ConceptNode, GapMap, VagueMoment } from "@/lib/types";
import { callStrong } from "./gemini";
import { gapMapPrompt } from "./prompts/gapmap.prompt";

interface RawGapMap {
  vaguest_moments: VagueMoment[];
  reteach_order: string[];
  one_liner_candidates: string[];
}

const rawGapMapSchema = {
  type: Type.OBJECT,
  properties: {
    vaguest_moments: {
      type: Type.ARRAY,
      maxItems: "3",
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          node_id: { type: Type.STRING },
        },
        required: ["quote", "node_id"],
      },
    },
    reteach_order: { type: Type.ARRAY, items: { type: Type.STRING } },
    one_liner_candidates: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "5",
      items: { type: Type.STRING },
      description: "Ranked best-first.",
    },
  },
  required: ["vaguest_moments", "reteach_order", "one_liner_candidates"],
};

/**
 * Never trust the model's quote text over our own records: keep an LLM pick
 * only if it exactly matches a {quote, node_id} pair we actually gave it.
 * If nothing survives validation (or there's nothing to select from), fall
 * back to the first 3 known-good quotes rather than featuring nothing.
 */
export function pickVaguestMoments(
  quotes: VagueMoment[],
  llmPicks: VagueMoment[]
): VagueMoment[] {
  if (quotes.length <= 3) return quotes;

  const validated = llmPicks.filter((pick) =>
    quotes.some((q) => q.quote === pick.quote && q.node_id === pick.node_id)
  );

  return validated.length > 0 ? validated.slice(0, 3) : quotes.slice(0, 3);
}

/**
 * Filter the model's reteach order down to real, non-solid node ids (drop
 * hallucinated ids, drop anything it mistakenly marked solid), then append
 * any non-solid node it forgot, so nothing that needs re-teaching silently
 * disappears just because the model missed it.
 */
export function sanitizeReteachOrder(
  graph: ConceptGraph,
  llmOrder: string[]
): string[] {
  const needsReteach = new Set(
    graph.nodes.filter((n) => n.state !== "solid").map((n) => n.id)
  );

  const ordered = llmOrder.filter((id) => needsReteach.has(id));
  const seen = new Set(ordered);
  for (const id of needsReteach) {
    if (!seen.has(id)) ordered.push(id);
  }

  return ordered;
}

function toGapMapNodes(nodes: ConceptNode[]): GapMap["nodes"] {
  return nodes.map((n) => ({ id: n.id, name: n.name, state: n.state }));
}

export async function generateGapMap(
  graph: ConceptGraph,
  quotes: VagueMoment[],
  dodged: string[]
): Promise<GapMap> {
  const raw = await callStrong<RawGapMap>(
    gapMapPrompt(graph, quotes, dodged),
    rawGapMapSchema
  );

  return {
    topic: graph.topic,
    nodes: toGapMapNodes(graph.nodes),
    dodged_questions: dodged,
    vaguest_moments: pickVaguestMoments(quotes, raw.vaguest_moments),
    reteach_order: sanitizeReteachOrder(graph, raw.reteach_order),
    one_liner: raw.one_liner_candidates[0] ?? "",
  };
}
