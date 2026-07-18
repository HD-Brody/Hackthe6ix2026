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

import { ApiError, GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function requireModel(envVar: "GEMINI_MODEL_FAST" | "GEMINI_MODEL_STRONG"): string {
  const model = process.env[envVar];
  if (!model) throw new Error(`${envVar} is not set (check .env.local)`);
  return model;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Free-tier keys hand out very tight per-minute limits (seen as low as 5
 * RPM on gemini-2.5-flash) — a single burst of calls (e.g. the eval harness,
 * or a fast back-to-back turn) can 429 even under normal use. Retry a couple
 * times, honoring the API's own suggested retryDelay when present. */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err instanceof ApiError && err.status === 429;
      if (!isRateLimit || attempt >= retries) throw err;
      await sleep(retryDelayMs(err) ?? 5000 * (attempt + 1));
    }
  }
}

function retryDelayMs(err: ApiError): number | null {
  const match = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(err.message);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
}

async function callJSON<T>(
  model: string,
  prompt: string,
  responseSchema: object
): Promise<T> {
  const response = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    })
  );

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
  const stream = await withRetry(() =>
    ai.models.generateContentStream({
      model,
      contents: prompt,
    })
  );

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
