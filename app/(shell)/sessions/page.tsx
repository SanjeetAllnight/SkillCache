"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SessionLifecycleCard } from "@/components/sessions/session-lifecycle-card";
import { SessionRequestModal } from "@/components/sessions/session-request-modal";
import { useAuth } from "@/components/providers/auth-provider";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  acceptSession,
  cancelSession,
  listenSessionsForUser,
  syncSessionLifecycles,
  type ApiSession,
} from "@/lib/firebaseServices";

type SessionSectionProps = {
  title: string;
  description: string;
  icon: string;
  count: number;
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
};

function SessionSection({
  title,
  description,
  icon,
  count,
  isLoading,
  emptyTitle,
  emptyDescription,
  children,
}: SessionSectionProps) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name={icon} />
          </div>
          <div>
            <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">
              {title}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
          </div>
        </div>
        <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-black uppercase tracking-widest text-stone-500">
          {isLoading ? "Loading" : `${count} session${count === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-[230px] w-full" />
          ))
        ) : count === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest px-6 py-10 text-center">
            <Icon name={icon} className="text-4xl text-stone-300" />
            <p className="mt-3 text-base font-bold text-on-surface">{emptyTitle}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-on-surface-variant">
              {emptyDescription}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default function SessionsPage() {
  const router = useRouter();
  const { user, isAuthReady } = useAuth();
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reschedulingSession, setReschedulingSession] = useState<ApiSession | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!user?._id) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = listenSessionsForUser(
      user._id,
      (nextSessions) => {
        setSessions(nextSessions);
        setIsLoading(false);
        setError(null);
      },
      (listenError) => {
        setError(listenError.message || "Unable to sync sessions.");
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isAuthReady, user?._id]);

  useEffect(() => {
    if (sessions.length === 0) return;
    void syncSessionLifecycles(sessions);

    const interval = window.setInterval(() => {
      void syncSessionLifecycles(sessions);
    }, 60000);

    return () => window.clearInterval(interval);
  }, [sessions]);

  const pendingRequests = useMemo(
    () => sessions.filter((session) => session.status === "pending"),
    [sessions],
  );
  const liveSessions = useMemo(
    () => sessions.filter((session) => session.status === "live"),
    [sessions],
  );
  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "accepted" || session.status === "upcoming")
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sessions],
  );
  const completedSessions = useMemo(
    () =>
      sessions
        .filter((session) => ["completed", "cancelled", "missed"].includes(session.status))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions],
  );

  const handleAccept = useCallback(async (session: ApiSession) => {
    setPendingActionId(session._id);
    setError(null);
    try {
      await acceptSession(session._id);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to accept this session.");
    } finally {
      setPendingActionId(null);
    }
  }, []);

  const handleReject = useCallback(async (session: ApiSession) => {
    if (!user?._id) return;
    const confirmed = window.confirm(`Reject "${session.title}"? The learner will see it as cancelled.`);
    if (!confirmed) return;

    setPendingActionId(session._id);
    setError(null);
    try {
      await cancelSession(session._id, user._id, "Request rejected by mentor");
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Unable to reject this request.");
    } finally {
      setPendingActionId(null);
    }
  }, [user?._id]);

  const handleSaved = useCallback(() => {
    setShowRequestModal(false);
    setReschedulingSession(null);
  }, []);

  const stats = [
    { label: "Pending Requests", value: pendingRequests.length, icon: "hourglass_top" },
    { label: "Live Sessions", value: liveSessions.length, icon: "radio_button_checked" },
    { label: "Upcoming", value: upcomingSessions.length, icon: "event_available" },
    { label: "History", value: completedSessions.length, icon: "history" },
  ];

  return (
    <div className="page-shell page-stack">
      <section className="grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
            <Icon name="event_note" className="text-base" />
            Session Lifecycle
          </div>
          <h1 className="font-headline text-4xl font-black leading-tight tracking-tight text-on-surface md:text-6xl">
            Your mentorship appointments, from request to learning history.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-on-surface-variant">
            Request focused sessions, review incoming mentorship requests, join live calls at the right time, and keep completed learning exchanges organized.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-2xl bg-surface-container-lowest p-4 shadow-editorial">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={stat.icon} />
              </div>
              <p className="font-headline text-2xl font-black">{stat.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-stone-500">
                {stat.label}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-editorial md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-on-surface">
              Request a mentorship session
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              New requests start as pending until the mentor accepts or reschedules.
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90"
            >
              <Icon name="send" className="text-base" />
              Request Session
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          <Icon name="error" filled className="text-base" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-10 2xl:grid-cols-2">
        <SessionSection
          title="Pending Requests"
          description="Requests waiting for mentor review or learner confirmation."
          icon="hourglass_top"
          count={pendingRequests.length}
          isLoading={isLoading}
          emptyTitle="No pending requests"
          emptyDescription="New session requests will appear here before they become appointments."
        >
          {pendingRequests.map((session) => (
            <SessionLifecycleCard
              key={session._id}
              session={session}
              viewerId={user?._id ?? ""}
              pending={pendingActionId === session._id}
              onAccept={handleAccept}
              onReject={handleReject}
              onReschedule={setReschedulingSession}
              onJoin={(nextSession) => router.push(`/call/${nextSession._id}`)}
              onStart={(nextSession) => router.push(`/call/${nextSession._id}`)}
            />
          ))}
        </SessionSection>

        <SessionSection
          title="Live Sessions"
          description="Active mentorship rooms with participant presence updates."
          icon="radio_button_checked"
          count={liveSessions.length}
          isLoading={isLoading}
          emptyTitle="No live sessions"
          emptyDescription="Accepted sessions will move here once the mentor starts the call."
        >
          {liveSessions.map((session) => (
            <SessionLifecycleCard
              key={session._id}
              session={session}
              viewerId={user?._id ?? ""}
              pending={pendingActionId === session._id}
              onJoin={(nextSession) => router.push(`/call/${nextSession._id}`)}
              onStart={(nextSession) => router.push(`/call/${nextSession._id}`)}
            />
          ))}
        </SessionSection>

        <SessionSection
          title="Upcoming Sessions"
          description="Accepted appointments with join controls that unlock near the start time."
          icon="event_available"
          count={upcomingSessions.length}
          isLoading={isLoading}
          emptyTitle="No upcoming sessions"
          emptyDescription="Accepted mentorship appointments will appear here with countdowns and join states."
        >
          {upcomingSessions.map((session) => (
            <SessionLifecycleCard
              key={session._id}
              session={session}
              viewerId={user?._id ?? ""}
              pending={pendingActionId === session._id}
              onReschedule={setReschedulingSession}
              onJoin={(nextSession) => router.push(`/call/${nextSession._id}`)}
              onStart={(nextSession) => router.push(`/call/${nextSession._id}`)}
            />
          ))}
        </SessionSection>

        <SessionSection
          title="Completed Sessions"
          description="Session history, including completed, cancelled, and missed exchanges."
          icon="history"
          count={completedSessions.length}
          isLoading={isLoading}
          emptyTitle="No session history yet"
          emptyDescription="Completed sessions retain participants, notes, resources, and repository links."
        >
          {completedSessions.map((session) => (
            <SessionLifecycleCard
              key={session._id}
              session={session}
              viewerId={user?._id ?? ""}
            />
          ))}
        </SessionSection>
      </div>

      {showRequestModal && user ? (
        <SessionRequestModal
          currentUser={user}
          onClose={() => setShowRequestModal(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {reschedulingSession && user ? (
        <SessionRequestModal
          currentUser={user}
          mode="reschedule"
          session={reschedulingSession}
          onClose={() => setReschedulingSession(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
