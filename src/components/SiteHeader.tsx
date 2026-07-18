import Image from "next/image";
import Link from "next/link";

function ProfileAvatar() {
  return (
    <Image src="/profile.png" alt="Sean" width={32} height={32} className="size-8 rounded-full object-cover" />
  );
}

type SiteHeaderProps = {
  activeItem?: "classroom" | "analytics";
  sessionId?: string;
  student?: "sam" | "elena";
};

const navigationItems = [
  { id: "classroom", label: "Classroom", fallbackHref: "/student" },
  { id: "analytics", label: "Analytics", fallbackHref: "/session/demo-sample/report" },
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

        <Link href="/profile" aria-label="Open my profile" className="rounded-full border-2 border-[#c7c4d7] p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><ProfileAvatar /></Link>
      </div>
    </header>
  );
}
