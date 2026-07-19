import { HeroDemo } from "@/components/HeroDemo";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TopicPicker } from "@/components/TopicPicker";

export default function TopicPickerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <SiteHeader />
      <main className="home-background flex-1">
        <section className="mx-auto grid w-full max-w-7xl items-center gap-x-14 gap-y-12 px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:px-10">
          <div>
            <p className="eyebrow font-mono">№ 001 — The Feynman technique, finally in software</p>

            <h1 className="font-display mt-4 max-w-2xl text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)] sm:text-5xl lg:text-[3.5rem]">
              <span className="chalk-underline">Teach it</span> to learn it.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
              Explain any topic to an AI student who probes exactly where you
              hand-wave — then shows you a map of what you actually know.
            </p>

            <TopicPicker />
          </div>

          <div className="hidden lg:block">
            <HeroDemo />
          </div>
        </section>

        <div className="lg:hidden">
          <section className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8">
            <HeroDemo />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
