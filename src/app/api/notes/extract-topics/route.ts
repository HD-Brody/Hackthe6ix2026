/**
 * POST /api/notes/extract-topics
 *
 * Accepts lecture notes (.txt/.md as text, .pdf as base64) and returns
 * suggested teachable topics plus normalized notes text for session creation.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractTopicsFromPdf,
  extractTopicsFromText,
  MAX_NOTES_CHARS,
} from "@/llm/extractTopics";

export const maxDuration = 30;

const ALLOWED_PDF_MIME = "application/pdf";

type ExtractBody = {
  text?: string;
  file?: { mimeType: string; data: string };
};

export async function POST(req: NextRequest) {
  let body: ExtractBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const hasText = typeof body.text === "string" && body.text.trim().length > 0;
  const hasFile =
    body.file &&
    typeof body.file.mimeType === "string" &&
    typeof body.file.data === "string" &&
    body.file.data.length > 0;

  if (hasText === hasFile) {
    return NextResponse.json(
      { error: "provide exactly one of text or file" },
      { status: 400 }
    );
  }

  try {
    if (hasText) {
      const text = body.text!.trim();
      if (text.length > MAX_NOTES_CHARS) {
        return NextResponse.json(
          { error: `notes exceed ${MAX_NOTES_CHARS} character limit` },
          { status: 413 }
        );
      }
      const result = await extractTopicsFromText(text);
      return NextResponse.json(result);
    }

    const { mimeType, data } = body.file!;
    if (mimeType !== ALLOWED_PDF_MIME) {
      return NextResponse.json(
        { error: "only application/pdf is supported for file uploads" },
        { status: 400 }
      );
    }

    // ~80 KB of base64 ≈ ~60 KB raw PDF — rough cap before hitting Gemini limits.
    if (data.length > MAX_NOTES_CHARS * 1.4) {
      return NextResponse.json(
        { error: "PDF file is too large" },
        { status: 413 }
      );
    }

    const result = await extractTopicsFromPdf(data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[extract-topics] failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to extract topics from notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
