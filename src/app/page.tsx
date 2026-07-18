import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TopicPicker } from "@/components/TopicPicker";

export default function TopicPickerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <SiteHeader />
      <main className="home-background flex-1">
        <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-28 pt-14 sm:px-8 sm:pb-36 sm:pt-20 lg:px-10">
          <h1 className="font-heading max-w-4xl text-center text-[2.45rem] font-extrabold leading-[1.12] tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
            You don&apos;t study with it.
            <br />
            <span className="text-[var(--brand)]">You teach it.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-center text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            The best way to master a concept is to explain it to someone else.
            <br />
            Meet Sam and Elena,
            <br className="hidden sm:block" /> AI students who learn from you.
          </p>

          <TopicPicker />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
