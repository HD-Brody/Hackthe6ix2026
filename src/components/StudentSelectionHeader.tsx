function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 19c.7-3.5 3-5.25 6.5-5.25s5.8 1.75 6.5 5.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path d="M9.6 3.2 9 5.4a7.4 7.4 0 0 0-1.7 1L5 5.8 3.3 8.7 5 10.3a7 7 0 0 0 0 2L3.3 14 5 17l2.3-.7a7.4 7.4 0 0 0 1.7 1l.6 2.3h3.4l.6-2.3a7.4 7.4 0 0 0 1.7-1l2.3.7 1.7-3-1.7-1.6a7 7 0 0 0 0-2l1.7-1.6L17.6 6l-2.3.7a7.4 7.4 0 0 0-1.7-1L13 3.2H9.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="11.3" cy="11.4" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function StudentSelectionHeader() {
  return (
    <header className="h-16 border-b border-slate-200/80 bg-[var(--page-background)] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <span className="font-heading text-xl font-bold text-[#4648d4] sm:text-2xl">Professor Me</span>
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <button type="button" aria-label="User profile" className="rounded-full p-2 transition hover:bg-indigo-50 hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><UserIcon /></button>
          <button type="button" aria-label="Settings" className="rounded-full p-2 transition hover:bg-indigo-50 hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><GearIcon /></button>
        </div>
      </div>
    </header>
  );
}
