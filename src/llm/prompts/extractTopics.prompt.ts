/**
 * Topic extraction from lecture notes. Used when a professor uploads notes
 * on the home page — Gemini suggests teachable topics to pick from.
 */

export const EXTRACT_TOPICS_PROMPTS_VERSION = "1";

export function extractTopicsPrompt(): string {
  return `You are helping a professor prepare to teach an AI student. Read the lecture notes provided and:

1. Extract 3 to 6 distinct teachable topics that a professor could explain in a 10–20 minute oral session. Each topic should be a short title (2–6 words), specific enough to be a session subject — not a whole course name.
2. Return the full text of the notes (or a faithful extraction if the input is a PDF) in "notes_text". Preserve key technical content; you may omit boilerplate like page numbers or headers.

Rules for good topics:
- Narrow enough to teach in one session (e.g. "TCP Slow Start" not "Computer Networking")
- Drawn from what the notes actually cover
- Distinct from each other — no duplicates or near-duplicates

Return ONLY the JSON object with "topics" and "notes_text".`;
}

export function extractTopicsTextPrompt(notesText: string): string {
  return `${extractTopicsPrompt()}

--- LECTURE NOTES ---
${notesText}`;
}
