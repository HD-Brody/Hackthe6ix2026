import { SessionFeedback } from "@/components/SessionFeedback";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getStudentProfile } from "@/lib/studentProfiles";
import { getSession } from "@/server/db/sessions";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { id } = await params;
  const { student } = await searchParams;
  const profile = getStudentProfile(student);
  const session = id.startsWith("demo-") ? null : await getSession(id).catch(() => null);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-[var(--text-primary)]">
      <SiteHeader activeItem="classroom" sessionId={id} student={profile.id} />
      <SessionFeedback
        profile={profile}
        sessionId={id}
        initialFeedback={session?.feedback ?? null}
      />
      <SiteFooter />
    </div>
  );
}
