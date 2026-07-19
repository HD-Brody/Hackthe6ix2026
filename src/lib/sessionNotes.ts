const PENDING_NOTES_KEY = "professor-me:pending-notes";

export function storePendingNotes(text: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_NOTES_KEY, text);
}

export function readPendingNotes(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PENDING_NOTES_KEY);
}

export function clearPendingNotes(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_NOTES_KEY);
}
