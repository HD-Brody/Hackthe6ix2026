/**
 * Pre-turn content screen. Owner: B.
 *
 * Cheap fast-tier call before evaluate/persona. Fail-open on API errors so a
 * Gemini blip does not kill the teaching session.
 */

import { Type } from "@google/genai";
import { callFast } from "./gemini";
import { screenPrompt } from "./prompts/screen.prompt";

export type ScreenCategory = "ok" | "off_topic" | "unsafe";

export interface ScreenResult {
  category: ScreenCategory;
}

const SCREEN_CATEGORIES = new Set<ScreenCategory>(["ok", "off_topic", "unsafe"]);

const screenSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ["ok", "off_topic", "unsafe"],
    },
  },
  required: ["category"],
};

/**
 * Normalize raw model JSON. Unknown / missing categories fail open to "ok"
 * so a malformed response never falsely blocks a teaching turn.
 */
export function normalizeScreenResult(raw: unknown): ScreenResult {
  if (raw && typeof raw === "object" && "category" in raw) {
    const category = (raw as { category: unknown }).category;
    if (typeof category === "string" && SCREEN_CATEGORIES.has(category as ScreenCategory)) {
      return { category: category as ScreenCategory };
    }
  }
  return { category: "ok" };
}

export async function screenUserTurn(
  userText: string,
  topic: string
): Promise<ScreenResult> {
  try {
    const raw = await callFast<unknown>(screenPrompt(userText, topic), screenSchema);
    return normalizeScreenResult(raw);
  } catch (err) {
    console.warn(
      "[screenUserTurn] failed open:",
      err instanceof Error ? err.message : err
    );
    return { category: "ok" };
  }
}

export function isRedirectCategory(
  category: ScreenCategory
): category is "off_topic" | "unsafe" {
  return category === "off_topic" || category === "unsafe";
}
