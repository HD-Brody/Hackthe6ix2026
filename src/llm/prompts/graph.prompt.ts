/**
 * Concept-graph generation prompt. Owner: B.
 *
 * Design-doc sketch: "You are designing an oral-exam blueprint for TOPIC at
 * the level of a strong undergraduate. Produce 8–15 concepts as JSON per this
 * schema… For each concept include the ground truth in one sentence and probe
 * angles a skeptical examiner would use."
 */

export const PROMPTS_VERSION = "0"; // bump on any prompt change after freeze (hour 19)

export function graphPrompt(_topic: string): string {
  // TODO(B, Block B1 step 1)
  throw new Error("not implemented");
}
