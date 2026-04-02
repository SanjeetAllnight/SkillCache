import Image from "next/image";
import Link from "next/link";

import { SessionCard } from "@/components/cards/session-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { dashboardData, mentors } from "@/lib/mock-data";
import { mockUser } from "@/lib/mockUser";

const statIconTone: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

export default function DashboardPage() {
  return (
    <div className="page-shell page-stack">
      <section className="section-stack max-w-3xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
          Welcome back, <span className="text-primary">{mockUser.firstName}</span>.
        </h1>
        <p className="max-w-xl text-lg text-on-surface-variant">
          Your creative laboratory is ready. You have 3 pending exchange requests and a session starting in 45 minutes.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {dashboardData.stats.map((stat) => (
          <article key={stat.label} className="app-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                {stat.label}
              </span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${statIconTone[stat.tone]}`}>
                <Icon name={stat.icon} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-black">{stat.value}</span>
              <span className={stat.tone === "tertiary" ? "text-sm font-bold text-tertiary" : stat.tone === "primary" ? "text-sm font-bold text-primary" : "text-sm font-bold text-stone-500"}>
                {stat.change}
              </span>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-10 xl:grid-cols-12">
        <div className="min-w-0 space-y-12 xl:col-span-8">
          <section className="section-stack">
            <div className="flex items-end justify-between">
              <h2 className="font-headline text-3xl font-bold">Skills Atelier</h2>
              <button type="button" className="text-sm font-bold text-primary hover:underline">
                Manage All
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="app-card-soft">
                <h3 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-primary-fixed-variant">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  I Am Teaching
                </h3>
                <div className="flex flex-wrap gap-3">
                  {dashboardData.teaching.map((skill) => (
                    <span
                      key={skill}
                      className="editorial-shadow rounded-full bg-surface-container-lowest px-5 py-2 text-sm font-semibold text-on-surface"
                    >
                      {skill}
                    </span>
                  ))}
                  <button
                    type="button"
                    className="rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                  >
                    <Icon name="add" />
                  </button>
                </div>
              </div>

              <div className="app-card-tint">
                <h3 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-tertiary-container">
                  <span className="h-2 w-2 rounded-full bg-tertiary" />
                  I Am Learning
                </h3>
                <div className="flex flex-wrap gap-3">
                  {dashboardData.learning.map((skill) => (
                    <span
                      key={skill}
                      className="editorial-shadow rounded-full bg-surface-container-lowest px-5 py-2 text-sm font-semibold text-on-surface"
                    >
                      {skill}
                    </span>
                  ))}
                  <button
                    type="button"
                    className="rounded-full bg-tertiary/10 p-2 text-tertiary transition-colors hover:bg-tertiary/20"
                  >
                    <Icon name="add" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-surface-container p-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(50,105,67,0.12),_transparent_55%)]" />
            <div className="relative flex flex-col items-center gap-8 rounded-2xl bg-surface-container-lowest p-6 md:flex-row md:gap-10 md:p-8">
              <div className="flex-1 space-y-4">
                <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-[10px] font-black uppercase tracking-tight text-on-secondary-container">
                  Perfect Match
                </span>
                <h2 className="font-headline text-4xl font-extrabold leading-tight">
                  {dashboardData.exchange.title.split(" with ")[0]} with {mentors[0]?.name.split(" ")[0]}.
                </h2>
                <p className="text-lg text-on-surface-variant">
                  {dashboardData.exchange.description}
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button href="/mentors">Initiate Exchange</Button>
                  <Button href={mentors[0]?.profileHref ?? "/profile"} variant="outline">
                    View Elena&apos;s Portfolio
                  </Button>
                </div>
              </div>

              <div className="relative h-64 w-64 shrink-0">
                <div className="absolute left-0 top-6 z-10 h-40 w-40 rotate-[-6deg] overflow-hidden rounded-2xl border-4 border-surface shadow-2xl">
                  <Image
                    src={dashboardData.exchange.mentorImage}
                    alt="Elena profile"
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                </div>
                <div className="absolute bottom-0 right-2 z-20 h-40 w-40 rotate-[6deg] overflow-hidden rounded-2xl border-4 border-surface bg-white/30 shadow-2xl backdrop-blur-md">
                  <Image
                    src={dashboardData.exchange.userImage}
                    alt="Julian profile"
                    fill
                    className="object-cover opacity-80"
                    sizes="160px"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                    <Icon name="sync" className="text-4xl text-surface" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-12 xl:col-span-4">
          <section className="section-stack">
            <h2 className="font-headline text-xl font-bold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              {dashboardData.quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="app-card flex flex-col items-center gap-3 p-6 text-center transition-all hover:bg-primary-container/20"
                >
                  <Icon name={action.icon} className="text-3xl text-primary" />
                  <span className="text-xs font-bold text-on-surface">{action.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="section-stack">
            <h2 className="font-headline text-xl font-bold">Upcoming Sessions</h2>
            <div className="space-y-4">
              {dashboardData.upcomingSessions.map((session) => (
                <SessionCard key={session.title} session={session} />
              ))}
            </div>
            <Button href="/sessions" variant="ghost" className="w-full justify-center text-stone-500">
              View Full Schedule
            </Button>
          </section>

          <section className="rounded-2xl bg-inverse-surface p-6 text-inverse-on-surface md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Icon name="auto_stories" className="text-primary-container" />
              <h2 className="font-headline font-bold">Recent in Repository</h2>
            </div>
            <ul className="space-y-4">
              {dashboardData.repositorySnippet.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between text-sm opacity-80 transition-opacity hover:opacity-100"
                  >
                    <span>{item.title}</span>
                    <Icon name="arrow_forward" className="text-xs opacity-40" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
