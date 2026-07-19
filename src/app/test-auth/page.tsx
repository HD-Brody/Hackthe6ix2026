import { auth0 } from "@/lib/auth0";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function TestAuthPage() {
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)] text-[var(--text-primary)]">
      <header className="flex items-center justify-end px-5 py-4 sm:px-8">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_24px_48px_var(--shadow-color)] sm:p-9">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[var(--brand)]">
            Auth0 Authentication Test
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Verify Next.js Middleware routing, session cookies, and user retrieval
          </p>

          <div
            className={`mt-6 flex items-center justify-between rounded-xl border p-5 ${
              user
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Authentication State
              </p>
              <p className={`mt-1 text-lg font-bold ${user ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {user ? "Authenticated / Logged In" : "Unauthenticated / Logged Out"}
              </p>
            </div>
            <span
              className={`size-3 rounded-full ${user ? "bg-emerald-500" : "bg-red-500"}`}
              aria-hidden="true"
            />
          </div>

          {user ? (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={user.name || "User Avatar"}
                    className="size-16 rounded-full border-2 border-[var(--brand)] object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-full border-2 border-[var(--brand)] bg-[var(--surface-input)] text-2xl">
                    👤
                  </div>
                )}
                <div>
                  <h3 className="font-heading text-lg font-bold text-[var(--brand)]">{user.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Email: <span className="text-[var(--text-primary)]">{user.email}</span>
                  </p>
                  {user.nickname ? (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Nickname: <span className="text-[var(--text-primary)]">{user.nickname}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Raw Session Metadata
                </p>
                <pre className="mt-2 max-h-40 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>

              <a
                href="/auth/logout"
                className="block rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-center text-sm font-semibold text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
              >
                Log Out of Application
              </a>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-center text-sm leading-6 text-[var(--text-secondary)]">
                No active session found. Visit the route below to initiate Auth0 login redirection.
                Upon successful login, you will be redirected back here.
              </p>
              <a
                href="/auth/login"
                className="mt-6 block rounded-lg bg-[var(--chat-user)] px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-strong)]"
              >
                Log In with Auth0
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
