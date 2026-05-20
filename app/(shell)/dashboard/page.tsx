"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { SessionCard } from "@/components/cards/session-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSessionsForUser,
  type ApiSession,
} from "@/lib/firebaseServices";
import { toDashboardSessionCards } from "@/lib/view-models";

// ─── Stat card colour tokens ────────────────────────────────────────────────
const statIconTone: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, isAuthReady } = useAuth();

  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // ── Reset + reload whenever the signed-in user changes ──────────────────
  // This prevents stale data from a previous account flashing on screen
  // when switching between test accounts.
  useEffect(() => {
    // If auth hasn't resolved yet, keep the loading skeleton showing.
    if (!isAuthReady || !user?._id) {
      setSessions([]);
      setIsLoadingSessions(true);
      return;
    }

    let isMounted = true;
    // Reset immediately so switching accounts never shows old numbers.
    setSessions([]);
    setIsLoadingSessions(true);

    async function loadSessions() {
      if (!user?._id) return;
      try {
        // getSessionsForUser only returns sessions where this uid is
        // mentor OR learner — no cross-user data contamination.
        const data = await getSessionsForUser(user._id);
        if (isMounted) setSessions(data);
      } catch {
        if (isMounted) setSessions([]);
      } finally {
        if (isMounted) setIsLoadingSessions(false);
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  // Re-run whenever the signed-in user identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, isAuthReady]);

  // ── Derived values ────────────────────────────────────────────────────────
  const activeSessions = sessions.filter(
    (s) =>
      s.status === "live" ||
      s.status === "accepted" ||
      s.status === "upcoming",
  );
  const dashboardSessions = toDashboardSessionCards(activeSessions);

  const totalSessions    = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const upcomingCount    = sessions.filter(
    (s) => s.status === "accepted" || s.status === "upcoming",
  ).length;

  const stats = [
    {
      label: "Total Sessions",
      value: totalSessions.toString().padStart(2, "0"),
      change: "lifetime",
      icon: "calendar_today",
      tone: "primary",
    },
    {
      label: "Skills Exchanged",
      value: (user?.skillsOffered?.length ?? 0).toString().padStart(2, "0"),
      change: "active arsenal",
      icon: "auto_awesome",
      tone: "secondary",
    },
    {
      label: "Completed",
      value: completedSessions.toString().padStart(2, "0"),
      change: "sessions done",
      icon: "schedule",
      tone: "tertiary",
    },
  ];

  const quickActions = [
    { icon: "person_search", label: "Find Mentor", href: "/mentors" },
    { icon: "add_box",       label: "Add Skill",   href: "/profile"  },
  ];

  // ── Greeting ──────────────────────────────────────────────────────────────
  // firstLoginCompleted is set to true only after the user finishes
  // onboarding (/complete-profile). Until then they are a "new" user.
  const isReturningUser = user?.firstLoginCompleted === true;
  const greetingPrefix  = isReturningUser ? "Welcome back, " : "Welcome, ";

  // ── Full loading state (auth not ready yet) ───────────────────────────────
  if (!isAuthReady) {
    return (
      <div className="page-shell page-stack">
        <section className="section-stack max-w-3xl">
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-5 w-64" />
        </section>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell page-stack">
      {/* ── Hero greeting ─────────────────────────────────────────────── */}
      <section className="section-stack max-w-3xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface md:text-5xl">
          {greetingPrefix}
          <span className="text-primary">{user?.name}</span>.
        </h1>
        <p className="max-w-xl text-lg text-on-surface-variant">
          Your creative laboratory is ready.{" "}
          {isLoadingSessions ? (
            <Skeleton className="inline-block h-5 w-24 align-middle" />
          ) : (
            <>You have {upcomingCount} upcoming session{upcomingCount !== 1 ? "s" : ""}.</>
          )}
        </p>
      </section>

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="app-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                {stat.label}
              </span>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${statIconTone[stat.tone]}`}
              >
                <Icon name={stat.icon} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              {isLoadingSessions ? (
                <Skeleton className="h-10 w-14" />
              ) : (
                <span className="font-headline text-4xl font-black">
                  {stat.value}
                </span>
              )}
              <span
                className={
                  stat.tone === "tertiary"
                    ? "text-sm font-bold text-tertiary"
                    : stat.tone === "primary"
                      ? "text-sm font-bold text-primary"
                      : "text-sm font-bold text-stone-500"
                }
              >
                {stat.change}
              </span>
            </div>
          </article>
        ))}
      </section>

      {/* ── Main content grid ─────────────────────────────────────────── */}
      <div className="grid gap-10 xl:grid-cols-12">
        {/* Skills atelier */}
        <div className="min-w-0 space-y-12 xl:col-span-8">
          <section className="section-stack">
            <div className="flex items-end justify-between">
              <h2 className="font-headline text-3xl font-bold">Skills Atelier</h2>
              <button
                type="button"
                className="text-sm font-bold text-primary hover:underline"
              >
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
                  {user?.skillsOffered?.length ? (
                    user.skillsOffered.map((skill) => (
                      <span
                        key={skill}
                        className="editorial-shadow rounded-full bg-surface-container-lowest px-5 py-2 text-sm font-semibold text-on-surface"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-stone-500">
                      No skills offered yet.
                    </span>
                  )}
                  <Link
                    href="/profile"
                    className="flex items-center justify-center rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                  >
                    <Icon name="add" />
                  </Link>
                </div>
              </div>

              <div className="app-card-tint">
                <h3 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-tertiary-container">
                  <span className="h-2 w-2 rounded-full bg-tertiary" />
                  I Am Learning
                </h3>
                <div className="flex flex-wrap gap-3">
                  {user?.skillsWanted?.length ? (
                    user.skillsWanted.map((skill) => (
                      <span
                        key={skill}
                        className="editorial-shadow rounded-full bg-surface-container-lowest px-5 py-2 text-sm font-semibold text-on-surface"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-stone-500">
                      No skills wanted yet.
                    </span>
                  )}
                  <Link
                    href="/profile"
                    className="flex items-center justify-center rounded-full bg-tertiary/10 p-2 text-tertiary transition-colors hover:bg-tertiary/20"
                  >
                    <Icon name="add" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-12 xl:col-span-4">
          <section className="section-stack">
            <h2 className="font-headline text-xl font-bold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="app-card flex flex-col items-center gap-3 p-6 text-center transition-all hover:bg-primary-container/20"
                >
                  <Icon name={action.icon} className="text-3xl text-primary" />
                  <span className="text-xs font-bold text-on-surface">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="section-stack">
            <h2 className="font-headline text-xl font-bold">
              Upcoming Sessions
            </h2>
            <div className="space-y-4">
              {isLoadingSessions
                ? Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 w-full" />
                  ))
                : dashboardSessions.length > 0
                  ? dashboardSessions.map((session, index) => (
                      <SessionCard
                        key={`${session.title}-${index}`}
                        session={session}
                      />
                    ))
                  : (
                      <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-stone-500">
                        No upcoming sessions scheduled.
                      </div>
                    )}
            </div>
            <Button
              href="/sessions"
              variant="ghost"
              className="w-full justify-center text-stone-500"
            >
              View Full Schedule
            </Button>
          </section>

          <section className="rounded-2xl bg-inverse-surface p-6 text-inverse-on-surface md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Icon name="auto_stories" className="text-primary-container" />
              <h2 className="font-headline font-bold">Recent in Repository</h2>
            </div>
            <ul className="space-y-4">
              <li className="text-sm text-stone-500">
                You haven&apos;t uploaded any resources to your repository yet.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
