import { Classroom } from "@/components/Classroom";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getStudentProfile } from "@/lib/studentProfiles";

export default async function ClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  await params;
  const { student } = await searchParams;
  const profile = getStudentProfile(student);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <SiteHeader activeItem="classroom" />
      <main className="flex-1">
        <Classroom student={profile.id} />
      </main>
      <SiteFooter />
    </div>
  );
}
