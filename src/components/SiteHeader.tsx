import Image from "next/image";
import Link from "next/link";

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

type SiteHeaderProps = {
  activeItem?: "classroom" | "analytics";
  sessionId?: string;
  student?: "sam" | "elena";
};

const navigationItems = [
  { id: "classroom", label: "Classroom", fallbackHref: "/student" },
  { id: "analytics", label: "Analytics", fallbackHref: "/session/demo/report" },
] as const;

export function SiteHeader({ activeItem, sessionId, student = "sam" }: SiteHeaderProps) {
  return (
    <header className="relative z-10 h-16 border-b border-indigo-50 bg-white shadow-[0_4px_10px_rgba(99,102,241,0.05)]">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-8 lg:gap-10">
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
            {navigationItems.map((item) => {
              const active = activeItem === item.id;
              const studentQuery = `?student=${student}`;
              const href = sessionId && item.id === "classroom"
                ? `/session/${encodeURIComponent(sessionId)}${studentQuery}`
                : sessionId && item.id === "analytics"
                  ? `/session/${encodeURIComponent(sessionId)}/report${studentQuery}`
                  : item.fallbackHref;
              return (
                <Link
                  key={item.id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-sm border-b-2 px-1 py-2 transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${active ? "border-[#4648d4] font-bold text-[#4648d4]" : "border-transparent"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button type="button" aria-label="User profile" className="rounded-full border-2 border-[#c7c4d7] p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><ProfileAvatar /></button>
      </div>
    </header>
  );
}
