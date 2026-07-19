/**
 * Concept-graph generation prompt. Owner: B.
 *
 * Design-doc sketch: "You are designing an oral-exam blueprint for TOPIC at
 * the level of a strong undergraduate. Produce 8–15 concepts as JSON per this
 * schema… For each concept include the ground truth in one sentence and probe
 * angles a skeptical examiner would use."
 */

export const PROMPTS_VERSION = "1"; // bump on any prompt change after freeze (hour 19)

export function graphPrompt(topic: string, sourceNotes?: string): string {
  const base = `You are designing an oral-exam blueprint for the topic "${topic}", at the level of a strong undergraduate who has taken one course on it.

Produce 8 to 15 concepts that together cover the topic well enough to run a full oral exam. For each concept:
- Give a short, specific name (a few words).
- Give the ground-truth explanation in exactly ONE sentence. It must be concrete and specific enough that you could grade a student's answer against it.
- Rate difficulty from 1 (basic) to 3 (subtle, easy to get subtly wrong).
- List which OTHER concept ids (from this same list) must be understood first, as "prereqs". Use an empty array if there are none. Only reference ids you are also defining.
- Give EXACTLY 2 or 3 probe angles a skeptical examiner would use, chosen only from this exact set: "ask-example", "ask-why", "ask-edge-case". Never fewer than 2.

Id rule: assign ids sequentially as "n1", "n2", "n3", ... in the exact order you list the concepts. Do not skip numbers, reuse numbers with letter suffixes, or reorder them later.

Rules for what makes a GOOD concept (follow strictly):
- It must be narrow enough to state its ground truth in one sentence. If you need two or more sentences to state the truth, split it into two concepts.
- It must be something a real professor could ask a pointed, falsifiable question about — a student can clearly get it right, get it wrong, or hand-wave it.
- Together the concepts should form a real dependency structure (via prereqs), not just a flat list of trivia.

Examples of BAD concepts to avoid, and why:
- "History of TCP" — too broad, not falsifiable, not really "explainable" in one sentence.
- "Networking basics" — too vague; break it into the specific mechanisms actually being tested.
- "Random fun facts about X" — not probeable, doesn't build toward understanding.

Return ONLY the concepts. Do not include any node state, quotes, or metadata beyond what's requested — that is handled elsewhere.`;

  if (!sourceNotes?.trim()) return base;

  return `${base}

Ground your concept graph in the professor's lecture notes below. Prefer concepts explicitly covered in the notes. The topic "${topic}" is what the professor chose to teach — focus the graph on that topic as it appears in the notes.

--- LECTURE NOTES ---
${sourceNotes.trim()}`;
}
