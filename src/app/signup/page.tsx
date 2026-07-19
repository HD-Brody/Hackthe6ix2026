import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";

function FieldIcon({ type }: { type: "user" | "email" | "eye" }) {
  if (type === "email") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6"/></svg>;
  if (type === "eye") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><path d="M3 12s3.4-5 9-5 9 5 9 5-3.4 5-9 5-9-5-9-5Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M5 20c.5-4 3-6 7-6s6.5 2 7 6" stroke="currentColor" strokeWidth="1.6"/></svg>;
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)] text-[var(--text-primary)]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Professor Me home" className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
          <Image src="/logo.svg" alt="Professor Me" width={191} height={32} priority className="h-8 w-auto" />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid w-full overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[0_4px_20px_var(--shadow-color)] lg:grid-cols-2">
          <section className="relative overflow-hidden bg-[#4648d4] p-6 text-white sm:p-8 lg:flex lg:min-h-[600px] lg:flex-col lg:justify-between" aria-label="Professor Me introduction">
            <div aria-hidden="true" className="absolute -right-20 -top-20 size-80 rounded-full bg-white/15 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-20 -left-16 size-64 rounded-full bg-[#8127cf]/50 blur-3xl" />
            <div className="relative lg:mt-2">
              <div className="hidden overflow-hidden rounded-xl border-4 border-white/10 bg-[#e1e0ff] shadow-2xl sm:block lg:h-72">
                <Image src="/students/sam.png" alt="Sam, an AI learning companion" width={600} height={320} className="h-full w-full object-cover object-[center_30%]" />
              </div>
              <h1 className="font-heading mt-5 text-2xl font-bold tracking-tight">Teach It. Understand It Better.</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#e1e0ff] sm:text-base">Join thousands of educators and mentors using AI to personalize learning for students worldwide.</p>
            </div>

            <div className="relative mt-5 hidden items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-3 sm:flex">
              <Image src="/profile.png" alt="Sean" width={40} height={40} className="size-10 rounded-full border-2 border-white object-cover" />
              <div><p className="text-xs font-semibold italic">&ldquo;The most intuitive AI platform I&apos;ve used.&rdquo;</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#e1e0ff]">Sean, AI Mentor</p></div>
            </div>
          </section>

          <section className="flex items-center justify-center p-6 sm:p-8 lg:px-10 lg:py-8" aria-labelledby="signup-title">
            <div className="w-full max-w-md">
              <h2 id="signup-title" className="font-heading text-2xl font-bold">Create your account</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">Empower your students with AI-driven insights today.</p>

              <div className="mt-5 flex justify-center">
                <a href="/auth/login?screen_hint=signup&connection=google-oauth2" aria-label="Sign up with Google" className="flex h-12 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
                  <Image src="/google-signin.svg" alt="Continue with Google" width={180} height={40} className="h-10 w-auto dark:hidden" />
                  <Image src="/googel-signin-dark.svg" alt="Continue with Google" width={180} height={40} className="hidden h-10 w-auto dark:block" />
                </a>
              </div>
              <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[var(--border)]"/><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)] sm:text-xs">Or continue with email</span><span className="h-px flex-1 bg-[var(--border)]"/></div>

              <form action="/auth/login" method="GET" className="space-y-3.5">
                <input type="hidden" name="screen_hint" value="signup" />
                <div>
                  <label htmlFor="signup-email" className="mb-1.5 block text-sm text-[var(--text-secondary)]">Email Address</label>
                  <div className="relative">
                    <input
                      id="signup-email"
                      name="login_hint"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@example.com"
                      className="h-12 w-full rounded-lg border-2 border-transparent bg-[var(--surface-input)] px-4 pr-11 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><FieldIcon type="email" /></span>
                  </div>
                </div>
                <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--chat-user)] text-base font-medium text-white shadow-[0_10px_15px_-3px_var(--shadow-color)] transition hover:bg-[var(--brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
                  Continue
                </button>
              </form>
              <p className="mt-3 text-center text-xs leading-5 text-[var(--text-secondary)]">Accounts are secured by Auth0. By signing up you agree to be quizzed relentlessly by an AI student.</p>

              <p className="mt-5 text-center text-sm text-[var(--text-secondary)]">Already have an account? <Link href="/login" className="font-bold text-[var(--nav-active)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">Log In</Link></p>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
