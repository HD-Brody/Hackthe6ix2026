import Image from "next/image";
import Link from "next/link";
import type { AttentionItem } from "@/lib/profileStats";
import { studentProfiles } from "@/lib/studentProfiles";

const kindStyles: Record<
  AttentionItem["kind"],
  { badge: string; accent: string; description: string }
> = {
  in_progress: {
    badge: "bg-amber-100 text-amber-800",
    accent: "border-amber-200 bg-amber-50/60",
    description: "Pick up where you left off.",
  },
  needs_feedback: {
    badge: "bg-[#ecebff] text-[#5755d8]",
    accent: "border-[#d9d7ff] bg-[#f7f6ff]",
    description: "How clear did this lesson feel?",
  },
  low_score: {
    badge: "bg-rose-100 text-rose-800",
    accent: "border-rose-200 bg-rose-50/60",
    description: "Understanding dipped below 60%.",
  },
};

const kindLabels: Record<AttentionItem["kind"], string> = {
  in_progress: "In progress",
  needs_feedback: "Needs rating",
  low_score: "Review gaps",
};

export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7776df]">
        Needs attention
      </p>
      <h2 className="mt-1 font-heading text-2xl font-extrabold">
        Keep your teaching loop moving
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const style = kindStyles[item.kind];
          const profile = studentProfiles[item.student];
          return (
            <Link
              key={`${item.kind}-${item.session_id}`}
              href={item.href}
              className={`flex items-start gap-3 rounded-2xl border p-4 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${style.accent}`}
            >
              <Image
                src={profile.image}
                alt={profile.name}
                width={40}
                height={40}
                className="size-10 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${style.badge}`}
                  >
                    {kindLabels[item.kind]}
                  </span>
                </div>
                <p className="mt-2 truncate font-heading text-base font-bold">
                  {item.topic}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {style.description}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#5755d8]">
                  {item.label} →
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
