"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import { SessionCard } from "@/components/cards/session-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getSessionsForUser,
  createSession,
  getMentors,
  type ApiSession,
} from "@/lib/firebaseServices";
import {
  toFeaturedSessionCard,
  toPastSessionCards,
  toUpcomingSessionCards,
} from "@/lib/view-models";
import type { BackendUser } from "@/lib/mockUser";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(localDatetime: string): string {
  // <input type="datetime-local"> gives "YYYY-MM-DDTHH:mm" — make it a proper ISO string
  return new Date(localDatetime).toISOString();
}

// ─── New Session Modal ────────────────────────────────────────────────────────

interface NewSessionModalProps {
  currentUser: BackendUser;
  onClose: () => void;
  onCreated: () => void;
}

function NewSessionModal({ currentUser, onClose, onCreated }: NewSessionModalProps) {
  const [mentors, setMentors]     = useState<BackendUser[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  const [title, setTitle]         = useState("");
  const [skill, setSkill]         = useState("");
  const [mentorId, setMentorId]   = useState("");
  const [date, setDate]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // The current user is always the learner in a session they create
  const learnerId = currentUser._id;

  useEffect(() => {
    async function load() {
      try {
        // Exclude self — user can't be their own mentor
        const list = await getMentors(undefined, currentUser._id);
        setMentors(list);
        if (list[0]) setMentorId(list[0]._id);
      } finally {
        setLoadingMentors(false);
      }
    }
    void load();
  }, [currentUser._id]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setError("Session title is required."); return; }
    if (!mentorId)     { setError("Please select a mentor."); return; }
    if (!date)         { setError("Please choose a date and time."); return; }

    const selectedMentor = mentors.find((m) => m._id === mentorId);
    const firstSkill = skill.trim() ||
      selectedMentor?.skillsOffered?.[0] ||
      "General mentorship";

    setSaving(true);
    setError(null);
    try {
      await createSession({
        title:     title.trim(),
        mentorId,
        learnerId,
        skill:     firstSkill,
        date:      toISODate(date),
        status:    "upcoming",
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }, [title, mentorId, learnerId, skill, date, mentors, onCreated]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 z-50 max-w-lg -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface">
              New Session
            </h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              Book a mentorship exchange
            </p>
          </div>
          <button
            id="btn-close-modal"
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-high"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="session-title" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Session Title
            </label>
            <input
              id="session-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Intro to React Hooks"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Skill */}
          <div className="space-y-1.5">
            <label htmlFor="session-skill" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Skill Focus <span className="normal-case font-normal">(optional — defaults to mentor's first skill)</span>
            </label>
            <input
              id="session-skill"
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. TypeScript, Figma, Piano…"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Mentor picker */}
          <div className="space-y-1.5">
            <label htmlFor="session-mentor" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Mentor
            </label>
            {loadingMentors ? (
              <Skeleton className="h-12 w-full" />
            ) : mentors.length === 0 ? (
              <p className="rounded-xl bg-surface-container px-4 py-3 text-sm text-stone-400">
                No other mentors found. Ask someone to add skills to their profile.
              </p>
            ) : (
              <select
                id="session-mentor"
                value={mentorId}
                onChange={(e) => setMentorId(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {mentors.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                    {m.skillsOffered?.length ? ` — ${m.skillsOffered.slice(0, 2).join(", ")}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date & time */}
          <div className="space-y-1.5">
            <label htmlFor="session-date" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Date & Time
            </label>
            <input
              id="session-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl bg-error/10 px-4 py-2.5 text-sm font-medium text-error">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              id="btn-create-session"
              type="button"
              onClick={handleSubmit}
              disabled={saving || mentors.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <Icon name="add_circle" filled className="text-base" />
              )}
              {saving ? "Booking…" : "Book Session"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-outline-variant/30 px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sessions Page ────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const { user, isAuthReady } = useAuth();

  const [sessions, setSessions]   = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ── Load sessions for current user ──────────────────────────────────────
  const load = useCallback(async (uid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessionsForUser(uid);
      setSessions(data);
    } catch (err) {
      setError((err as Error).message ?? "Unable to load sessions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user?._id) return;
    void load(user._id);
  }, [isAuthReady, user?._id, load]);

  // ── Derived buckets ──────────────────────────────────────────────────────
  const liveSession = useMemo(
    () => sessions.find((s) => s.status === "live"),
    [sessions],
  );
  const upcoming = useMemo(
    () => sessions.filter((s) => s.status === "upcoming"),
    [sessions],
  );
  const past = useMemo(
    () => sessions.filter((s) => s.status === "completed"),
    [sessions],
  );

  // ── After session created — close modal + reload ─────────────────────────
  const handleCreated = useCallback(() => {
    setShowModal(false);
    if (user?._id) void load(user._id);
  }, [user, load]);

  return (
    <div className="page-shell page-stack">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="section-stack max-w-3xl">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1 space-y-3">
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-primary md:text-6xl">
              Your Sessions
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-on-surface-variant">
              All your mentorship exchanges — upcoming, live, and completed — in
              one place.
            </p>
          </div>

          {/* New session CTA */}
          {user && (
            <button
              id="btn-new-session"
              type="button"
              onClick={() => setShowModal(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg transition hover:opacity-90"
            >
              <Icon name="add_circle" filled className="text-base" />
              New Session
            </button>
          )}
        </div>
      </section>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {/* ── Live / Active Now ───────────────────────────────────────────── */}
      <section className="section-stack">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-tertiary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Active Now
          </h2>
        </div>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : liveSession ? (
          <SessionCard session={toFeaturedSessionCard(liveSession)} />
        ) : (
          <div className="rounded-2xl bg-surface-container-low px-6 py-10 text-center">
            <Icon name="videocam_off" className="mb-3 text-5xl text-stone-300" />
            <p className="text-lg font-semibold text-on-surface">
              No live session right now.
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Your next exchange will appear here when it goes live.
            </p>
          </div>
        )}
      </section>

      {/* ── Upcoming + Past two-column grid ─────────────────────────────── */}
      <div className="grid gap-10 xl:grid-cols-2">

        {/* Upcoming */}
        <section className="min-w-0">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-headline text-2xl font-bold text-on-surface">
              Upcoming
            </h2>
            <span className="text-sm font-medium text-stone-400">
              {isLoading ? "Loading…" : `${upcoming.length} session${upcoming.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="space-y-6">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-[170px] w-full" />
                ))
              : upcoming.length === 0
                ? (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 px-6 py-10 text-center">
                    <Icon name="calendar_add_on" className="mb-2 text-4xl text-stone-300" />
                    <p className="text-sm text-stone-400">No upcoming sessions.</p>
                    {user && (
                      <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="mt-4 text-sm font-semibold text-primary underline underline-offset-2"
                      >
                        Book your first session →
                      </button>
                    )}
                  </div>
                )
                : toUpcomingSessionCards(upcoming).map((s, i) => (
                    <SessionCard key={`${s.title}-${i}`} session={s} />
                  ))}
          </div>
        </section>

        {/* Past */}
        <section className="min-w-0">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-headline text-2xl font-bold text-on-surface">
              Past Sessions
            </h2>
            <span className="text-sm font-medium text-stone-400">
              {isLoading ? "Loading…" : `${past.length} completed`}
            </span>
          </div>
          <div className="space-y-6">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-[170px] w-full" />
                ))
              : past.length === 0
                ? (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 px-6 py-10 text-center">
                    <Icon name="history" className="mb-2 text-4xl text-stone-300" />
                    <p className="text-sm text-stone-400">No completed sessions yet.</p>
                  </div>
                )
                : toPastSessionCards(past).map((s, i) => (
                    <SessionCard key={`${s.title}-${i}`} session={s} />
                  ))}
          </div>
        </section>
      </div>

      {/* ── Session count footer ────────────────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center justify-center gap-3 py-4 text-xs font-medium text-stone-400">
          <span className="h-px flex-1 bg-outline-variant/20" />
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} · synced from Firestore
          <span className="h-px flex-1 bg-outline-variant/20" />
        </div>
      )}

      {/* ── New Session Modal ───────────────────────────────────────────── */}
      {showModal && user && (
        <NewSessionModal
          currentUser={user}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
