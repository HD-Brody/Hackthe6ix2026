import { SessionFeedback } from "@/components/SessionFeedback";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getStudentProfile } from "@/lib/studentProfiles";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student } = await searchParams;
  const profile = getStudentProfile(student);

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-[var(--text-primary)]">
      <SiteHeader activeItem="classroom" />
      <SessionFeedback profile={profile} />
      <SiteFooter />
    </div>
  );
}
