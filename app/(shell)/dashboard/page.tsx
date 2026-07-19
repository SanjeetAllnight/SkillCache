"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { SessionCard } from "@/components/cards/session-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionsForUser, getMentors, getResources, type ApiSession, type ApiResource } from "@/lib/firebaseServices";
import { dashboardData } from "@/lib/mock-data";
import { toDashboardSessionCards, formatSessionDateParts } from "@/lib/view-models";
import type { BackendUser } from "@/lib/mockUser";

const statIconTone: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [mentors, setMentors] = useState<BackendUser[]>([]);
  const [resources, setResources] = useState<ApiResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      if (!user?._id) {
        if (isMounted) setIsLoading(false);
        return;
      }
      try {
        const [sessionsRes, mentorsRes, resourcesRes] = await Promise.all([
          getSessionsForUser(user._id),
          getMentors(),
          getResources(),
        ]);

        if (!isMounted) return;

        setSessions(sessionsRes ?? []);
        setMentors(mentorsRes ?? []);
        setResources(resourcesRes ?? []);
      } catch {
        if (isMounted) {
          setSessions([]);
          setMentors([]);
          setResources([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  // --- Derive Stats ---
  const completedSessions = sessions.filter(s => s.status === "completed" || s.endedAt != null);
  const totalCompleted = completedSessions.length;
  
  // Calculate skills exchanged
  const skillsExchangedSet = new Set<string>();
  if (totalCompleted > 0) {
    completedSessions.forEach(s => {
      if (s.skill) skillsExchangedSet.add(s.skill);
    });
  }
  const skillsExchanged = skillsExchangedSet.size;

  // Calculate focus hours
  const totalMinutes = completedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const focusHours = totalMinutes > 0 ? (totalMinutes / 60).toFixed(1).replace(/\.0$/, "") + "h" : "0h";

  const stats = [
    {
      label: "Total Sessions",
      value: totalCompleted.toString(),
      change: "completed exchanges",
      icon: "calendar_today",
      tone: "primary",
    },
    {
      label: "Skills Exchanged",
      value: skillsExchanged.toString(),
      change: "active arsenal",
      icon: "auto_awesome",
      tone: "secondary",
    },
    {
      label: "Focus Hours",
      value: focusHours,
      change: "dedicated time",
      icon: "schedule",
      tone: "tertiary",
    },
  ];

  // --- Derived Dashboard Information ---
  const upcomingSessionsList = sessions
    .filter(s => s.status === "upcoming" && !s.endedAt)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  const nearestUpcoming = upcomingSessionsList.length > 0 ? upcomingSessionsList[0] : null;
  const dashboardSessions = nearestUpcoming ? toDashboardSessionCards([nearestUpcoming]) : [];

  const pendingIncoming = sessions.filter(s => s.status === "pending" && s.mentorId === user?._id).length;
  const pendingOutgoing = sessions.filter(s => s.status === "pending" && s.learnerId === user?._id).length;
  
  let pendingMsg = "";
  if (pendingIncoming > 0) {
    pendingMsg = `You have ${pendingIncoming} pending exchange request${pendingIncoming > 1 ? "s" : ""}`;
  } else if (pendingOutgoing > 0) {
    pendingMsg = `You have ${pendingOutgoing} request${pendingOutgoing > 1 ? "s" : ""} awaiting approval`;
  } else {
    pendingMsg = "Your schedule is clear.";
  }
  
  let upcomingMsg = "";
  if (nearestUpcoming) {
    upcomingMsg = ` and a session scheduled for ${formatSessionDateParts(nearestUpcoming.date).fullDate}.`;
  }

  // --- Skills Atelier ---
  const teachingSkills = user?.skillsOffered ?? [];
  const learningSkills = user?.skillsWanted ?? [];

  // --- Recommended Mentor ---
  let bestMentorMatch: BackendUser | null = null;
  if (learningSkills.length > 0) {
    let maxOverlap = -1;
    for (const mentor of mentors) {
      if (mentor._id === user?._id) continue;
      const mentorTeaching = mentor.skillsOffered || [];
      const overlap = learningSkills.filter(sk => mentorTeaching.includes(sk)).length;
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMentorMatch = mentor;
      }
    }
  }
  if (!bestMentorMatch && mentors.length > 0) {
    bestMentorMatch = mentors.find(m => m._id !== user?._id) ?? null;
  }
  return (
    <div className="page-shell page-stack">
      <section className="section-stack max-w-3xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
          Welcome back, <span className="text-primary">{user?.name || user?.email || "Explorer"}</span>.
        </h1>
        <p className="max-w-xl text-lg text-on-surface-variant">
          {pendingMsg}{upcomingMsg}
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
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
                  {teachingSkills.length === 0 ? (
                    <span className="text-sm italic text-stone-500">No teaching skills added yet.</span>
                  ) : (
                    teachingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="editorial-shadow rounded-full bg-surface-container-lowest px-5 py-2 text-sm font-semibold text-on-surface"
                      >
                        {skill}
                      </span>
                    ))
                  )}
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
                  {learningSkills.length === 0 ? (
                    <span className="text-sm italic text-stone-500">No learning interests added yet.</span>
                  ) : (
                    learningSkills.map((skill) => (
                      <span
                        key={skill}
                        className="editorial-shadow rounded-full bg-surface-container-lowest px-5 py-2 text-sm font-semibold text-on-surface"
                      >
                        {skill}
                      </span>
                    ))
                  )}
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

          {bestMentorMatch ? (
            <section className="relative overflow-hidden rounded-2xl bg-surface-container p-1">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(50,105,67,0.12),_transparent_55%)]" />
              <div className="relative flex flex-col items-center gap-8 rounded-2xl bg-surface-container-lowest p-6 md:flex-row md:gap-10 md:p-8">
                <div className="flex-1 space-y-4">
                  <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-[10px] font-black uppercase tracking-tight text-on-secondary-container">
                    Perfect Match
                  </span>
                  <h2 className="font-headline text-4xl font-extrabold leading-tight">
                    Exchange skills with {bestMentorMatch.name.split(" ")[0]}.
                  </h2>
                  <p className="text-lg text-on-surface-variant">
                    {bestMentorMatch.name.split(" ")[0]} wants to learn {bestMentorMatch.skillsWanted?.[0] || "skills"} - and can teach {bestMentorMatch.skillsOffered?.[0] || "you"}.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button href={`/profile?mentor=${bestMentorMatch._id}`}>View {bestMentorMatch.name.split(" ")[0]}&apos;s Profile</Button>
                  </div>
                </div>

                <div className="relative h-64 w-64 shrink-0">
                  <div className="absolute left-0 top-6 z-10 flex h-40 w-40 rotate-[-6deg] items-center justify-center overflow-hidden rounded-2xl border-4 border-surface bg-surface-container-high shadow-2xl">
                    {bestMentorMatch.avatar ? (
                      <Image
                        src={bestMentorMatch.avatar}
                        alt={`${bestMentorMatch.name} profile`}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-on-surface-variant">{bestMentorMatch.name[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-2 z-20 flex h-40 w-40 rotate-[6deg] items-center justify-center overflow-hidden rounded-2xl border-4 border-surface bg-white/30 shadow-2xl backdrop-blur-md">
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={`${user.name} profile`}
                        fill
                        className="object-cover opacity-80"
                        sizes="160px"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-on-surface-variant">{user?.name?.[0]?.toUpperCase()}</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <Icon name="sync" className="text-4xl text-surface" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-outline-variant/30 px-6 py-10 text-center">
              <Icon name="person_search" className="mb-2 text-4xl text-stone-300" />
              <p className="text-sm text-stone-400">No mentor recommendations right now.</p>
            </section>
          )}
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
              {isLoading
                ? Array.from({ length: 1 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 w-full" />
                  ))
                : dashboardSessions.length > 0 ? dashboardSessions.map((session, index) => (
                    <SessionCard
                      key={`${session.title}-${index}`}
                      session={session}
                    />
                  )) : (
                    <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-stone-500">
                      No upcoming sessions yet.
                    </div>
                  )}
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
              {resources.length === 0 ? (
                <li className="text-sm italic text-stone-500 opacity-80">
                  No resources uploaded yet.
                </li>
              ) : (
                resources.slice(0, 3).map((item) => (
                  <li key={item._id}>
                    <Link
                      href={`/repository/${item._id}`}
                      className="group flex items-center justify-between text-sm opacity-80 transition-opacity hover:opacity-100"
                    >
                      <span className="truncate pr-4">{item.title}</span>
                      <Icon name="arrow_forward" className="text-xs opacity-40 shrink-0" />
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
