import Image from "next/image";
import Link from "next/link";

function EmailIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M15.5 9.2v4.2c0 1.2 1.8 1.2 2.4.1M15.5 9.2c-3-2-6.5-.5-6.5 2.8 0 3.6 4.4 4.4 6.5 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

function EyeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M3 12s3.4-5 9-5 9 5 9 5-3.4 5-9 5-9-5-9-5Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6"/></svg>;
}

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
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Continue your learning journey with Professor Me.</p>
          </div>

          <form className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-[var(--text-secondary)] sm:text-base">Email Address</label>
              <div className="relative">
                <input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" className="h-12 w-full rounded-lg border border-transparent bg-[#f2f4f6] px-4 pr-11 text-base outline-none placeholder:text-[#c7c4d7] focus:border-[#7979df] focus:ring-2 focus:ring-[#e1e0ff]" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b9b7cb]"><EmailIcon /></span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm text-[var(--text-secondary)] sm:text-base">Password</label>
                <button type="button" className="text-sm text-[#4648d4] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">Forgot Password?</button>
              </div>
              <div className="relative">
                <input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" className="h-12 w-full rounded-lg border border-transparent bg-[#f2f4f6] px-4 pr-11 text-base outline-none placeholder:text-[#c7c4d7] focus:border-[#7979df] focus:ring-2 focus:ring-[#e1e0ff]" />
                <button type="button" aria-label="Show password. This control is not connected yet." className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-[#b9b7cb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"><EyeIcon /></button>
              </div>
            </div>

            <button type="button" className="h-12 w-full rounded-lg bg-[#4648d4] text-base font-medium text-white shadow-[0_4px_10px_rgba(99,102,241,0.12)] transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">Log In</button>
          </form>

          <div className="my-7 flex items-center gap-3"><span className="h-px flex-1 bg-[#c7c4d7]" /><span className="text-xs font-medium text-[var(--text-secondary)]">Or continue with</span><span className="h-px flex-1 bg-[#c7c4d7]" /></div>

          <div className="flex justify-center">
            <button type="button" aria-label="Continue with Google. Authentication is not connected yet." className="flex h-12 w-full items-center justify-center rounded-lg border border-[#c7c4d7] bg-white transition hover:bg-[#f7f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
              <Image src="/google-signin.svg" alt="Continue with Google" width={180} height={40} className="h-10 w-auto" />
            </button>
          </div>

          <p className="mt-7 text-center text-sm text-[var(--text-secondary)] sm:text-base">Don&apos;t have an account? <Link href="/signup" className="text-[#4648d4] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">Sign up for free</Link></p>
        </section>
      </main>

      <footer className="relative z-10 px-4 py-7 text-center text-xs text-[#aaa8bc] sm:text-sm">© 2026 Professor Me. Empowering lifelong learners through AI.</footer>
    </div>
  );
}
