import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 text-xs text-[var(--text-secondary)] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-heading font-bold text-[var(--text-primary)]">Professor Me</span>
          <span className="font-display italic text-[var(--text-muted)]">Docendo discimus — we learn by teaching.</span>
          <span>© 2026</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>Built at Hack the 6ix 2026</span>
          <Link
            href="/support"
            className="transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            Support
          </Link>
          <a
            href="https://github.com/HD-Brody/Hackthe6ix2026"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
