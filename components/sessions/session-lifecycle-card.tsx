"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import { Icon } from "@/components/ui/icon";
import {
  canJoinSession,
  getSessionTimeLabel,
  type ApiSession,
} from "@/lib/firebaseServices";
import { cn } from "@/lib/utils";

type SessionLifecycleCardProps = {
  session: ApiSession;
  viewerId: string;
  compact?: boolean;
  pending?: boolean;
  onAccept?: (session: ApiSession) => void;
  onReject?: (session: ApiSession) => void;
  onReschedule?: (session: ApiSession) => void;
  onStart?: (session: ApiSession) => void;
  onJoin?: (session: ApiSession) => void;
};

function formatDate(date: string) {
  const value = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SessionLifecycleCard({
  session,
  viewerId,
  compact = false,
  pending = false,
  onAccept,
  onReject,
  onReschedule,
  onStart,
  onJoin,
}: SessionLifecycleCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const isMentor = session.mentorId === viewerId;
  const peer = isMentor ? session.learner : session.mentor;
  const roleLabel = isMentor ? "Mentoring" : "Learning from";
  const timeLabel = getSessionTimeLabel(session, now);
  const joinable = canJoinSession(session, now);
  const canMentorReview = isMentor && session.status === "pending";
  const canReschedule = isMentor && ["pending", "accepted", "upcoming"].includes(session.status);
  const canStart = isMentor && joinable && session.status !== "live";
  const canJoin = joinable && (session.status === "live" || !isMentor);

  const primaryAction = useMemo(() => {
    if (canMentorReview) return null;
    if (canStart) return { label: "Start Session", icon: "videocam", action: () => onStart?.(session) };
    if (session.status === "live") return { label: "Join Live", icon: "login", action: () => onJoin?.(session) };
    if (canJoin) return { label: "Join Session", icon: "login", action: () => onJoin?.(session) };
    return null;
  }, [canJoin, canMentorReview, canStart, onJoin, onStart, session]);

  return (
    <article
      className={cn(
        "rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-editorial transition hover:-translate-y-0.5 hover:border-primary/25",
        compact ? "p-4" : "md:p-6",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SessionStatusBadge status={session.status} callStatus={session.callStatus} />
            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
              {timeLabel}
            </span>
          </div>
          <div>
            <Link href={`/sessions/${session._id}`} className="group">
              <h3 className="line-clamp-2 font-headline text-xl font-black tracking-tight text-on-surface group-hover:text-primary">
                {session.title}
              </h3>
            </Link>
            {session.description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant">
                {session.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-xl bg-surface-container px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-xs font-black text-on-primary-container">
            {initials(peer.name) || "SC"}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              {roleLabel}
            </p>
            <p className="max-w-[160px] truncate text-sm font-bold">{peer.name}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-outline-variant/20 pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex flex-wrap gap-3 text-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar_today" className="text-base text-primary" />
            {formatDate(session.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="schedule" className="text-base text-primary" />
            {formatTime(session.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="auto_awesome" className="text-base text-primary" />
            {session.skill}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {canMentorReview ? (
            <>
              <button
                type="button"
                onClick={() => onAccept?.(session)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
              >
                <Icon name="check" className="text-base" />
                Accept
              </button>
              <button
                type="button"
                onClick={() => onReject?.(session)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-error/10 px-4 py-2.5 text-sm font-bold text-error transition hover:bg-error/15 disabled:opacity-60"
              >
                <Icon name="close" className="text-base" />
                Reject
              </button>
            </>
          ) : null}

          {canReschedule ? (
            <button
              type="button"
              onClick={() => onReschedule?.(session)}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-surface-container px-4 py-2.5 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-high disabled:opacity-60"
            >
              <Icon name="edit_calendar" className="text-base" />
              Reschedule
            </button>
          ) : null}

          {primaryAction ? (
            <button
              type="button"
              onClick={primaryAction.action}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
            >
              <Icon name={primaryAction.icon} className="text-base" />
              {primaryAction.label}
            </button>
          ) : (
            <Link
              href={`/sessions/${session._id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/30 px-4 py-2.5 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container"
            >
              Details
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
