"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import { getSessionById, type ApiSession } from "@/lib/firebaseServices";
import { formatSessionDateParts } from "@/lib/view-models";
import { mockUser } from "@/lib/mockUser";

function getStatusLabel(status: ApiSession["status"]) {
  if (status === "live") {
    return "Live Now";
  }

  if (status === "completed") {
    return "Completed Session";
  }

  return "Upcoming Session";
}

export default function SessionDetailsPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<ApiSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getSessionById(params.id);

        if (!isMounted) {
          return;
        }

        setSession(response);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load this session.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (params.id) {
      void loadSession();
    }

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="page-shell page-stack">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-full max-w-3xl" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="grid gap-8 xl:grid-cols-12">
          <div className="space-y-8 xl:col-span-8">
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[220px] w-full" />
          </div>
          <div className="space-y-8 xl:col-span-4">
            <Skeleton className="h-[240px] w-full" />
            <Skeleton className="h-[180px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="page-shell">
        <div className="rounded-2xl bg-error/10 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-error">
            {error ?? "Session not found."}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Try returning to the sessions list and reopening the exchange.
          </p>
        </div>
      </div>
    );
  }

  const dateParts = formatSessionDateParts(session.date);
  const mentorSkills = session.mentor?.skillsOffered?.length
    ? session.mentor.skillsOffered
    : ["Creative mentorship"];
  const learnerGoals = session.learner?.skillsWanted?.length
    ? session.learner.skillsWanted
    : ["Skill growth"];

  return (
    <div className="page-shell page-stack">
      <section className="section-stack">
        <nav className="flex gap-2 text-xs uppercase tracking-widest text-stone-500">
          <span>Sessions</span>
          <span>/</span>
          <span className="font-bold text-primary">Details</span>
        </nav>

        <div className="flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div className="section-stack">
            <h1 className="font-headline text-4xl font-extrabold leading-[1.1] tracking-tighter text-on-background md:text-5xl">
              {session.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Tag className="px-4 py-1 text-xs">{mentorSkills[0]}</Tag>
              <span className="text-sm text-stone-500">
                {dateParts.fullDate} at {dateParts.time}
              </span>
            </div>
          </div>

          <div className="space-y-3 xl:text-right">
            <div className="flex items-center gap-2 text-tertiary xl:justify-end">
              <Icon name="fiber_manual_record" filled className="text-sm" />
              <span className="text-xs font-bold uppercase tracking-widest">
                {getStatusLabel(session.status)}
              </span>
            </div>
            <Button
              href={
                session.status === "completed"
                  ? "/sessions"
                  : `/call/${session._id}`
              }
              rounded="xl"
              size="lg"
              className="gap-3"
            >
              <Icon name={session.status === "completed" ? "history" : "video_call"} />
              {session.status === "completed" ? "Back to Sessions" : "Start Call"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-12">
        <div className="min-w-0 space-y-8 xl:col-span-8">
          <section className="app-card">
            <div className="grid gap-8 md:grid-cols-2 md:gap-12">
              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Mentor
                </h2>
                <div className="flex items-center gap-4">
                  <Image
                    src={mockUser.avatar}
                    alt={session.mentor?.name ?? "Mentor"}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                  <div>
                    <p className="text-xl font-bold text-on-background">
                      {session.mentor?.name ?? "Unknown Mentor"}
                    </p>
                    <p className="text-sm text-stone-500">
                      {mentorSkills.join(" • ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Schedule
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-surface-container text-primary">
                    <span className="text-xs font-bold uppercase">{dateParts.month}</span>
                    <span className="text-2xl font-black">{dateParts.day}</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-on-background">
                      {dateParts.fullDate}
                    </p>
                    <p className="text-sm text-stone-500">{dateParts.time}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-outline-variant/20 pt-10 md:mt-12 md:pt-12">
              <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-stone-400">
                Session Focus
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">
                    01
                  </span>
                  <p className="leading-relaxed text-on-background">
                    Mentor sharing expertise in {mentorSkills.join(", ")}.
                  </p>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">
                    02
                  </span>
                  <p className="leading-relaxed text-on-background">
                    Learner goals centered on {learnerGoals.join(", ")}.
                  </p>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">
                    03
                  </span>
                  <p className="leading-relaxed text-on-background">
                    Status update: this exchange is currently marked as {session.status}.
                  </p>
                </li>
              </ul>
            </div>
          </section>

          <section className="app-card-soft">
            <div className="mb-8 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold tracking-tight">Exchange Notes</h2>
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-bold text-primary"
              >
                <Icon name="add_circle" className="text-lg" />
                Add Note
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-surface-container-lowest p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Learner
                </p>
                <p className="mt-3 text-lg font-semibold text-on-surface">
                  {session.learner?.name ?? "Unknown Learner"}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Interested in {learnerGoals.join(", ")}.
                </p>
              </div>
              <div className="rounded-2xl bg-surface-container-lowest p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Mentor Offerings
                </p>
                <p className="mt-3 text-lg font-semibold text-on-surface">
                  {mentorSkills[0]}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Additional areas: {mentorSkills.slice(1).join(", ") || "Focused one-on-one guidance"}.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-8 xl:col-span-4">
          <section className="relative overflow-hidden rounded-2xl bg-on-background p-6 text-white md:p-8">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">
              Connection Details
            </h2>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <Icon name="person" className="text-primary-container" />
                <span className="text-sm">{session.mentor?.email ?? "Mentor contact available after join"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="schedule" className="text-primary-container" />
                <span className="text-sm">{dateParts.fullDate} • {dateParts.time}</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="info" className="text-primary-container" />
                <span className="text-sm">Session status: {session.status}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-surface-container p-6 md:p-8">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-stone-400">
              Participants
            </h2>
            <div className="space-y-4">
              {[session.mentor, session.learner].filter(Boolean).map((participant) => (
                <div key={participant._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src={mockUser.avatar}
                      alt={participant.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-bold">{participant.name}</span>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
