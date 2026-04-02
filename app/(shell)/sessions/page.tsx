"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SessionCard } from "@/components/cards/session-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { getSessions, type ApiSession } from "@/lib/api";
import {
  toFeaturedSessionCard,
  toPastSessionCards,
  toUpcomingSessionCards,
} from "@/lib/view-models";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getSessions();

        if (!isMounted) {
          return;
        }

        setSessions(response);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load sessions right now.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  const liveSession = useMemo(
    () => sessions.find((session) => session.status === "live"),
    [sessions],
  );

  const upcomingSessions = useMemo(
    () => sessions.filter((session) => session.status === "upcoming"),
    [sessions],
  );

  const pastSessions = useMemo(
    () => sessions.filter((session) => session.status === "completed"),
    [sessions],
  );

  return (
    <div className="page-shell page-stack">
      <section className="section-stack max-w-3xl">
        <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-primary md:text-6xl">
          Your Creative <br />
          Exchange
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-on-surface-variant">
          Manage your upcoming ateliers and revisit past insights. Every session is a
          step closer to mastering your craft.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          {error}
        </div>
      ) : null}

      <section className="section-stack">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-tertiary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Active Now
          </h2>
        </div>
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : liveSession ? (
          <SessionCard session={toFeaturedSessionCard(liveSession)} />
        ) : (
          <div className="rounded-2xl bg-surface-container-low px-6 py-10 text-center">
            <p className="text-lg font-semibold text-on-surface">No live session right now.</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Your next exchange will appear here as soon as it goes live.
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-10 xl:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Upcoming</h2>
            <span className="text-sm font-medium text-stone-400">
              {isLoading ? "Loading..." : `${upcomingSessions.length} Sessions`}
            </span>
          </div>
          <div className="space-y-6">
            {isLoading
              ? Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-[180px] w-full" />
                ))
              : toUpcomingSessionCards(upcomingSessions).map((session) => (
                  <SessionCard key={session.id ?? session.title} session={session} />
                ))}
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-headline text-2xl font-bold text-on-surface">
              Past Sessions
            </h2>
            <span className="text-sm font-medium text-stone-400">
              {isLoading ? "Loading..." : `${pastSessions.length} Completed`}
            </span>
          </div>
          <div className="space-y-6">
            {isLoading
              ? Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-[180px] w-full" />
                ))
              : toPastSessionCards(pastSessions).map((session) => (
                  <SessionCard key={session.id ?? session.title} session={session} />
                ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-24 right-5 hidden md:block xl:right-10">
        <Link
          href="/sessions"
          className="group flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-2xl transition-all hover:scale-110"
        >
          <Icon
            name="refresh"
            className="text-3xl transition-transform duration-300 group-hover:rotate-180"
          />
        </Link>
      </div>
    </div>
  );
}
