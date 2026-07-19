/**
 * Extract teachable topics from uploaded lecture notes. Owner: feature work.
 */

import { Type } from "@google/genai";
import {
  extractTopicsPrompt,
  extractTopicsTextPrompt,
} from "./prompts/extractTopics.prompt";
import { callStrong, callStrongMultimodal } from "./gemini";

export const MAX_NOTES_CHARS = 80 * 1024;

export interface ExtractTopicsResult {
  topics: string[];
  notes_text: string;
}

interface RawExtractResult {
  topics: string[];
  notes_text: string;
}

const extractSchema = {
  type: Type.OBJECT,
  properties: {
    topics: {
      type: Type.ARRAY,
      minItems: "3",
      maxItems: "6",
      items: { type: Type.STRING },
    },
    notes_text: { type: Type.STRING },
  },
  required: ["topics", "notes_text"],
};

export function truncateNotes(text: string): string {
  if (text.length <= MAX_NOTES_CHARS) return text;
  return text.slice(0, MAX_NOTES_CHARS);
}

export async function extractTopicsFromText(
  notesText: string
): Promise<ExtractTopicsResult> {
  const trimmed = notesText.trim();
  if (!trimmed) {
    throw new Error("Notes text is empty");
  }

  const raw = await callStrong<RawExtractResult>(
    extractTopicsTextPrompt(truncateNotes(trimmed)),
    extractSchema
  );

  return normalizeResult(raw, trimmed);
}

export async function extractTopicsFromPdf(
  base64Data: string
): Promise<ExtractTopicsResult> {
  const raw = await callStrongMultimodal<RawExtractResult>(
    [
      { inlineData: { mimeType: "application/pdf", data: base64Data } },
      { text: extractTopicsPrompt() },
    ],
    extractSchema
  );

  return normalizeResult(raw);
}

function normalizeResult(
  raw: RawExtractResult,
  fallbackNotesText?: string
): ExtractTopicsResult {
  const topics = raw.topics
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (topics.length < 3) {
    throw new Error("Could not extract enough topics from the notes");
  }

  const notesText = truncateNotes(
    (raw.notes_text || fallbackNotesText || "").trim()
  );

  return { topics, notes_text: notesText };
}
