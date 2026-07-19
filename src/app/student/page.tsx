import { StudentSelector } from "@/components/StudentSelector";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default async function StudentPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; student?: string }>;
}) {
  const { topic = "", student } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <SiteHeader />
      <main className="flex flex-1 justify-center px-5 py-8 sm:px-8 sm:py-10">
        <StudentSelector topic={topic} initialStudent={student} />
      </main>
      <SiteFooter />
    </div>
  );
}
