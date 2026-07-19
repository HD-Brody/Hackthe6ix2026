/** Demo graphs are skipped when the professor uploaded notes — graph must be notes-grounded. */
export function shouldUseDemoGraphCache(sourceNotes?: string): boolean {
  return !sourceNotes?.trim();
}
