import Image from "next/image";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { studentProfiles } from "@/lib/studentProfiles";

const menuItems = ["Profile", "Student Settings", "Account"];
const recentTopics = [
  { title: "Neural Networks 101", detail: "4 Sessions • 2 Students", progress: "85%", color: "#4648d4", icon: "⌁" },
  { title: "Ancient Philosophy", detail: "2 Sessions • 1 Student", progress: "40%", color: "#8127cf", icon: "▤" },
  { title: "Brutalist Design", detail: "1 Session • 1 Student", progress: "15%", color: "#b90538", icon: "△" },
];

function PersonaCard({ id }: { id: "sam" | "elena" }) {
  const profile = studentProfiles[id];
  return (
    <article className="rounded-xl border border-[#e1e0e9] bg-[#f9fafb] p-3">
      <div className="flex items-center gap-3">
        <Image src={profile.image} alt={profile.name} width={40} height={40} className="size-10 rounded-full object-cover" />
        <div><h3 className="font-semibold">{profile.name}</h3><span className="rounded bg-[#e5e3ff] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#4648d4]">{id === "sam" ? "Visual Learner" : "Audio Learner"}</span></div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-4 text-[var(--text-secondary)]">“{profile.learningNote}”</p>
    </article>
  );
}

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fb] text-[var(--text-primary)]">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-5 pb-7 pt-14 sm:px-8 sm:pt-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-10">
        <aside className="space-y-5">
          <nav aria-label="Profile navigation" className="grid grid-cols-3 gap-1 rounded-xl border border-[#e8e6ef] bg-white p-3 shadow-sm lg:grid-cols-1">
            {menuItems.map((item, index) => <button key={item} type="button" className={`rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition sm:text-sm ${index === 0 ? "bg-[#e1e0ff] text-[#2f2ebe]" : "text-[#464554] hover:bg-[#f2f4f6]"}`}>{item}</button>)}
          </nav>
          <section className="hidden min-h-64 rounded-xl bg-[rgba(70,72,212,0.06)] p-5 lg:block">
            <p className="text-sm uppercase tracking-wider text-[#4648d4]">Teaching Tip</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Try breaking down complex “Quantum Mechanics” concepts using Sam&apos;s visual learning persona.</p>
          </section>
        </aside>

        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-xl border border-[#ebeaf0] bg-white p-5 shadow-sm sm:p-7">
            <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(70,72,212,0.06)] blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
              <div className="relative mx-auto size-24 shrink-0 rounded-full border-4 border-white shadow-xl sm:mx-0 sm:size-28"><Image src="/profile.png" alt="Sean" width={112} height={112} priority className="size-full rounded-full object-cover" /></div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, Sean</h1>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Master Educator &amp; AI Curriculum Designer. You&apos;ve empowered 12 students this week.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm sm:gap-3">
                  {[{ value: "142", label: "Sessions Taught", color: "text-[#4648d4]" }, { value: "48", label: "Concepts Mastered", color: "text-[#8127cf]" }].map((stat) => <div key={stat.label} className="rounded-lg bg-[#eceef0] px-2 py-2.5 sm:px-4"><strong className={`block text-lg sm:text-xl ${stat.color}`}>{stat.value}</strong><span className="text-[10px] text-[var(--text-secondary)] sm:text-xs">{stat.label}</span></div>)}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-xl border border-[#ebeaf0] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><h2 className="font-heading text-xl font-bold">Recently Taught</h2><button type="button" className="text-sm text-[#4648d4]">View All</button></div>
              <div className="mt-4 space-y-3">
                {recentTopics.map((topic) => <article key={topic.title} className="flex items-center gap-3 rounded-xl border border-[#e8e6ef] p-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#e5e3ff] font-bold" style={{ color: topic.color }}>{topic.icon}</span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium">{topic.title}</h3><p className="text-[10px] text-[var(--text-secondary)]">{topic.detail}</p></div><div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[#eceef0] sm:block"><div className="h-full rounded-full" style={{ width: topic.progress, backgroundColor: topic.color }} /></div></article>)}
              </div>
            </section>

            <section className="rounded-xl border border-[#ebeaf0] bg-white p-5 shadow-sm">
              <h2 className="font-heading text-xl font-bold">Saved Personas</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <PersonaCard id="sam" />
                <PersonaCard id="elena" />
              </div>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
