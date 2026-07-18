import Image from "next/image";
import Link from "next/link";

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f7f9fb] text-[var(--text-primary)]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 size-96 rounded-full bg-[rgba(67,72,214,0.07)] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 size-96 rounded-full bg-[rgba(125,39,206,0.06)] blur-3xl" />

      <header className="relative z-10 px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Professor Me home" className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
          <Image src="/logo.svg" alt="Professor Me" width={191} height={32} priority className="h-8 w-auto" />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <section className="w-full max-w-[440px] rounded-xl border border-[#f1f5f9] bg-white p-6 shadow-[0_4px_20px_rgba(99,102,241,0.08)] sm:p-10" aria-labelledby="login-title">
          <div className="text-center">
            <h1 id="login-title" className="font-heading text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Continue your teaching journey with Professor Me.</p>
          </div>

          <div className="mt-8 space-y-4">
            <a
              href="/auth/login"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#4648d4] text-base font-medium text-white shadow-[0_4px_10px_rgba(99,102,241,0.12)] transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            >
              <EmailIcon /> Log in with Email
            </a>

            <div className="flex items-center gap-3"><span className="h-px flex-1 bg-[#c7c4d7]" /><span className="text-xs font-medium text-[var(--text-secondary)]">Or continue with</span><span className="h-px flex-1 bg-[#c7c4d7]" /></div>

            <a
              href="/auth/login?connection=google-oauth2"
              aria-label="Continue with Google"
              className="flex h-12 w-full items-center justify-center rounded-lg border border-[#c7c4d7] bg-white transition hover:bg-[#f7f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            >
              <Image src="/google-signin.svg" alt="Continue with Google" width={180} height={40} className="h-10 w-auto" />
            </a>
          </div>

          <p className="mt-7 text-center text-sm text-[var(--text-secondary)] sm:text-base">Don&apos;t have an account? <Link href="/signup" className="text-[#4648d4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">Sign up for free</Link></p>
        </section>
      </main>

      <footer className="relative z-10 px-4 py-7 text-center text-xs text-[#aaa8bc] sm:text-sm">© 2026 Professor Me. Empowering lifelong learners through AI.</footer>
    </div>
  );
}
