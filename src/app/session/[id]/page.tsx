import { Classroom } from "@/components/Classroom";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getStudentProfile } from "@/lib/studentProfiles";

export default async function ClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    student?: string;
    topic?: string;
    curiosity?: string;
    create?: string;
  }>;
}) {
  const { id } = await params;
  const { student, topic, curiosity, create } = await searchParams;
  const profile = getStudentProfile(student);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-background)]">
      <SiteHeader activeItem="classroom" sessionId={id} student={profile.id} />
      <main className="flex-1">
        <Classroom
          sessionId={id}
          student={profile.id}
          initialTopic={topic}
          initialCuriosity={curiosity}
          shouldCreate={create === "true"}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
