import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

function EmailIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6"/></svg>;
}

/**
 * Login — real Auth0 Universal Login. Credentials are handled on Auth0's
 * hosted page (/auth/login is mounted by the SDK middleware), so this page
 * only offers entry points — no fake form fields.
 */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--page-background)] text-[var(--text-primary)]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-[var(--blur-accent-1)] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 size-96 rounded-full bg-[var(--blur-accent-2)] blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Professor Me home" className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
          <Image src="/logo.svg" alt="Professor Me" width={191} height={32} priority className="h-8 w-auto" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section className="w-full max-w-[440px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[0_4px_20px_var(--shadow-color)] sm:p-10" aria-labelledby="login-title">
          <div className="text-center">
            <h1 id="login-title" className="font-display text-3xl font-semibold tracking-tight">Welcome back, Professor</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Your students kept asking where you went.</p>
          </div>

          <form action="/auth/login" method="GET" className="mt-8 space-y-4">
            <div>
              <label htmlFor="login_hint" className="mb-1.5 block text-sm text-[var(--text-secondary)] sm:text-base">Email Address</label>
              <div className="relative">
                <input
                  id="login_hint"
                  name="login_hint"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-lg border border-transparent bg-[var(--surface-input)] px-4 pr-11 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><EmailIcon /></span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-ink flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--chat-user)] text-base font-medium text-white hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            >
              Continue
            </button>
          </form>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3"><span className="h-px flex-1 bg-[var(--border)]" /><span className="text-xs font-medium text-[var(--text-secondary)]">Or continue with</span><span className="h-px flex-1 bg-[var(--border)]" /></div>

            <a
              href="/auth/login?connection=google-oauth2"
              aria-label="Continue with Google"
              className="flex h-12 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-transparent transition hover:bg-transparent dark:hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            >
              <Image src="/google-signin.svg" alt="Continue with Google" width={180} height={40} className="h-10 w-auto dark:hidden" />
              <Image src="/googel-signin-dark.svg" alt="Continue with Google" width={180} height={40} className="hidden h-10 w-auto dark:block" />
            </a>
          </div>

          <p className="mt-7 text-center text-sm text-[var(--text-secondary)] sm:text-base">Don&apos;t have an account? <Link href="/signup" className="text-[var(--nav-active)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">Sign up for free</Link></p>
        </section>
      </main>

      <footer className="relative z-10 px-4 py-7 text-center text-xs text-[var(--text-muted)] sm:text-sm">© 2026 Professor Me. Empowering lifelong learners through AI.</footer>
    </div>
  );
}
