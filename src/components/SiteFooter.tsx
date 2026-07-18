const footerLinks = ["Syllabus Guide", "Student Privacy", "Research Labs", "Help Center"];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#c7c4d7] bg-[var(--surface-muted)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 text-xs text-[var(--text-secondary)] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-heading font-bold text-[var(--text-primary)]">Professor Me</span>
          <span>© 2024 Professor Me. Empowering education through AI.</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map((link) => <button key={link} type="button" className="transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">{link}</button>)}
        </div>
      </div>
    </footer>
  );
}
