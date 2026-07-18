import { StudentSelector } from "@/components/StudentSelector";
import { StudentSelectionHeader } from "@/components/StudentSelectionHeader";

export default async function StudentPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic = "" } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--page-background)]">
      <StudentSelectionHeader />
      <main className="flex flex-1 justify-center px-5 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-16">
        <StudentSelector topic={topic} />
      </main>
      <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-[#4648d4] via-[#8127cf] to-[#b90538]" />
    </div>
  );
}
