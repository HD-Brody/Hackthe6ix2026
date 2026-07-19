import Image from "next/image";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth0";
import { ThemeToggle } from "@/components/ThemeToggle";

type SiteHeaderProps = {
  activeItem?: "classroom" | "analytics";
  sessionId?: string;
  student?: "sam" | "elena";
};

const navigationItems = [
  { id: "classroom", label: "Classroom", fallbackHref: "/" },
  { id: "analytics", label: "Analytics", fallbackHref: "/analytics" },
] as const;

export async function SiteHeader({ activeItem, sessionId, student = "sam" }: SiteHeaderProps) {
  const user = await getAuthUser();

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] shadow-[0_4px_10px_var(--shadow-color)]">
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
                  : item.id === "analytics" ? item.fallbackHref : null;

              if (!href) {
                return (
                  <span
                    key={item.id}
                    title="Start a session first"
                    aria-disabled="true"
                    className="cursor-not-allowed rounded-sm border-b-2 border-transparent px-1 py-2 opacity-40 select-none"
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-sm px-1 py-2 transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${active ? "marker-active font-bold text-[var(--nav-active)]" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden text-sm font-medium text-[var(--text-secondary)] sm:inline">{user.name}</span>
              <Link href="/profile" aria-label="Open my profile" className="rounded-full border-2 border-[var(--border)] p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.picture} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--nav-active)]">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[var(--chat-user)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
