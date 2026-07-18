/**
 * Gemini client wrapper. Owner: B.
 *
 * Tier split (decided at CP1 from D's latency spike):
 *   GEMINI_MODEL_FAST   → Evaluator per-turn scoring
 *   GEMINI_MODEL_STRONG → graph generation, gap map
 *
 * Force JSON via structured output (responseSchema) — never regex-parse.
 * Every other B module imports from here; nobody else calls `GoogleGenAI` directly.
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function requireModel(envVar: "GEMINI_MODEL_FAST" | "GEMINI_MODEL_STRONG"): string {
  const model = process.env[envVar];
  if (!model) throw new Error(`${envVar} is not set (check .env.local)`);
  return model;
}

async function callJSON<T>(
  model: string,
  prompt: string,
  responseSchema: object
): Promise<T> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error(`Gemini (${model}) returned no text`);
  return JSON.parse(text) as T;
}

/** Strong tier — graph generation, gap map. Quality over speed. */
export function callStrong<T>(prompt: string, responseSchema: object): Promise<T> {
  return callJSON<T>(requireModel("GEMINI_MODEL_STRONG"), prompt, responseSchema);
}

/** Fast tier — Evaluator per-turn scoring. Speed over quality (Block B2). */
export function callFast<T>(prompt: string, responseSchema: object): Promise<T> {
  return callJSON<T>(requireModel("GEMINI_MODEL_FAST"), prompt, responseSchema);
}

/**
 * Streaming, plain-text call for the Persona (Block B2). No response schema —
 * the Persona's output is speech, not data.
 */
export async function* streamPersona(prompt: string): AsyncIterable<string> {
  const model = requireModel("GEMINI_MODEL_FAST");
  const stream = await ai.models.generateContentStream({
    model,
    contents: prompt,
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
