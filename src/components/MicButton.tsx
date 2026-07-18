/**
 * Mic button — hold-to-talk AND auto-VAD toggle. Owner: C, transport by D.
 * (Block C3 step 11; decide with D at CP3 which ships — hold-to-talk is the
 * reliable demo default. If CP3 slips past hour 16: hold-to-talk only.)
 * Shows live partial transcript so the user sees the STT hearing them.
 */

"use client";

export function MicButton() {
  return (
    <button
      type="button"
      aria-label="Use microphone. Voice input is not connected yet."
      className="flex size-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition hover:bg-white hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
        <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4m-3 0h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
