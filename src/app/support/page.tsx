import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SupportCheckout } from "@/components/billing/SupportCheckout";

export const metadata = {
  title: "Support — Professor Me",
  description:
    "Buy the Professor Me team a coffee with crypto via Unifold.",
};

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)] text-[var(--text-primary)]">
      <SiteHeader />
      <main className="home-background relative flex-1 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-10 size-[28rem] rounded-full bg-[var(--blur-accent-1)] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-32 size-[22rem] rounded-full bg-[var(--blur-accent-2)] blur-3xl"
        />

        <section className="relative mx-auto flex w-full max-w-2xl flex-col px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <p className="eyebrow font-mono">Buy us a coffee · Unifold</p>
          <h1 className="font-display mt-4 text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
            <span className="chalk-underline">Support the developers</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-[var(--text-secondary)]">
            Professor Me is free to teach with. If the Feynman loop helped you,
            a tip keeps the model calls and student voices running.
          </p>
          <div className="mt-10">
            <SupportCheckout />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
