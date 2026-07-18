import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TopicPicker } from "@/components/TopicPicker";

export default function TopicPickerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <SiteHeader />
      <main className="home-background flex-1">
        <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:px-10">
          <div className="rounded-full bg-[var(--brand-soft)] px-4 py-1.5 text-center text-sm font-semibold tracking-[0.01em] text-[var(--brand-strong)]">
            Revolutionary Learning Model
          </div>

          <h1 className="font-heading mt-7 max-w-4xl text-center text-[2.45rem] font-extrabold leading-[1.12] tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            You don&apos;t study with it.{" "}
            <span className="text-[var(--brand)]">You teach it.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-center text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            The best way to master a concept is to explain it to someone else.
            Meet Sam—
            <br className="hidden sm:block" /> an AI student who learns from
            you.
          </p>

          <TopicPicker />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
