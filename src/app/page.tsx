import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TopicPicker } from "@/components/TopicPicker";

export default function TopicPickerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <SiteHeader />
      <main className="home-background flex-1">
        <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-28 pt-14 sm:px-8 sm:pb-36 sm:pt-20 lg:px-10">
          <h1 className="font-heading max-w-3xl text-center text-[2.2rem] font-extrabold leading-[1.14] tracking-[-0.035em] text-[var(--text-primary)] sm:text-5xl lg:text-[3.4rem]">
            Teach it to learn it.
          </h1>

          <p className="mt-4 max-w-xl text-center text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            Explain any topic to an AI student and instantly see where your understanding has gaps.
          </p>

          <TopicPicker />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
