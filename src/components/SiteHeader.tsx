import Image from "next/image";
import Link from "next/link";

function BellIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 20h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function GearIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M9.6 3.2 9 5.4a7.4 7.4 0 0 0-1.7 1L5 5.8 3.3 8.7 5 10.3a7 7 0 0 0 0 2L3.3 14 5 17l2.3-.7a7.4 7.4 0 0 0 1.7 1l.6 2.3h3.4l.6-2.3a7.4 7.4 0 0 0 1.7-1l2.3.7 1.7-3-1.7-1.6a7 7 0 0 0 0-2l1.7-1.6L17.6 6l-2.3.7a7.4 7.4 0 0 0-1.7-1L13 3.2H9.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="11.3" cy="11.4" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

function ProfileAvatar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 rounded-full">
      <defs><linearGradient id="avatar-bg" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#f8d9b6"/><stop offset="1" stopColor="#8b78d6"/></linearGradient></defs>
      <circle cx="16" cy="16" r="16" fill="url(#avatar-bg)"/>
      <circle cx="16" cy="12" r="5" fill="#6b4b3e"/>
      <path d="M7.5 29c.8-6 4-9 8.5-9s7.7 3 8.5 9" fill="#4648d4"/>
      <path d="M11 11c.5-4.2 2.3-6 5.4-6 2.8 0 4.6 2.1 4.7 5.3-2.5-.2-4.4-1.1-5.8-2.5-.8 1.7-2.2 2.7-4.3 3.2Z" fill="#342821"/>
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-10 h-16 border-b border-indigo-50 bg-white shadow-[0_4px_10px_rgba(99,102,241,0.05)]">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          aria-label="Professor Me home"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
        >
          <Image
            src="/logo.svg"
            alt="Professor Me"
            width={191}
            height={32}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] md:flex lg:text-base">
          {['Dashboard', 'Classroom', 'Analytics'].map((item) => <button key={item} type="button" className="rounded-md px-1 py-2 transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">{item}</button>)}
        </nav>

        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <button type="button" aria-label="Notifications" className="rounded-full p-2 transition hover:bg-indigo-50 hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><BellIcon /></button>
          <button type="button" aria-label="Settings" className="hidden rounded-full p-2 transition hover:bg-indigo-50 hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:block"><GearIcon /></button>
          <button type="button" aria-label="User profile" className="ml-1 rounded-full border-2 border-[#c7c4d7] p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><ProfileAvatar /></button>
        </div>
      </div>
    </header>
  );
}
