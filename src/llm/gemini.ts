/**
 * Gemini client wrapper. Owner: B.
 *
 * Tier split (decided at CP1 from D's latency spike):
 *   GEMINI_MODEL_FAST   → Evaluator per-turn scoring
 *   GEMINI_MODEL_STRONG → graph generation, gap map
 *
 * Force JSON via structured output (responseSchema) — never regex-parse.
 */

// TODO(B): export callFast(prompt, responseSchema) / callStrong(...) /
// streamPersona(prompt) → AsyncIterable<string>

export {};
