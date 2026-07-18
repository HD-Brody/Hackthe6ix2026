/**
 * Concept-graph generation. Owner: B (Block B1). CP1 deliverable.
 *
 * Quality bar: 8–15 nodes, real prereq edges, every node PROBEABLE.
 * "History of TCP" is a bad node — delete-worthy.
 * Prompt lives in ./prompts/graph.prompt.ts.
 */

import { Type } from "@google/genai";
import type { ConceptGraph, ProbeAngle } from "@/lib/types";
import { callStrong } from "./gemini";
import { graphPrompt } from "./prompts/graph.prompt";

/** What we actually ask Gemini for — state/vague_quotes are injected after, never model-generated. */
interface RawNode {
  id: string;
  name: string;
  truth: string;
  difficulty: number;
  prereqs: string[];
  probes: ProbeAngle[];
}

interface RawGraph {
  topic: string;
  nodes: RawNode[];
}

const rawGraphSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    nodes: {
      type: Type.ARRAY,
      minItems: "8",
      maxItems: "15",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Short stable id, e.g. n1" },
          name: { type: Type.STRING },
          truth: { type: Type.STRING, description: "Ground truth in exactly one sentence" },
          difficulty: { type: Type.INTEGER, minimum: 1, maximum: 3 },
          prereqs: { type: Type.ARRAY, items: { type: Type.STRING } },
          probes: {
            type: Type.ARRAY,
            minItems: "2",
            maxItems: "3",
            items: { type: Type.STRING, enum: ["ask-example", "ask-why", "ask-edge-case"] },
          },
        },
        required: ["id", "name", "truth", "difficulty", "prereqs", "probes"],
      },
    },
  },
  required: ["topic", "nodes"],
};

export async function generateGraph(topic: string): Promise<ConceptGraph> {
  const raw = await callStrong<RawGraph>(graphPrompt(topic), rawGraphSchema);

  return {
    topic: raw.topic,
    nodes: raw.nodes.map((node) => ({
      ...node,
      difficulty: clampDifficulty(node.difficulty),
      state: "unvisited",
      vague_quotes: [],
    })),
  };
}

function clampDifficulty(value: number): 1 | 2 | 3 {
  if (value <= 1) return 1;
  if (value >= 3) return 3;
  return 2;
}
