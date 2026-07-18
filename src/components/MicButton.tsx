/**
 * Mic button — click-to-talk toggle (the reliable demo default per the plan).
 * Owner: C, transport by D. Wired to src/voice/sttClient.ts via Classroom.
 */

"use client";

export function MicButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? "Stop listening" : "Explain out loud with your microphone"}
      className={`flex size-10 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "animate-pulse bg-[#4648d4] text-white shadow-md"
          : "text-[var(--text-secondary)] hover:bg-white hover:text-[var(--brand)]"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
        <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4m-3 0h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
