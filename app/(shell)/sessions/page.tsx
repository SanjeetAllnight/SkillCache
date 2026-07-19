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
  initialMentorId?: string | null;
  onClose: () => void;
  onCreated: () => void;
}

function NewSessionModal({ currentUser, initialMentorId, onClose, onCreated }: NewSessionModalProps) {
  const [mentors, setMentors]     = useState<BackendUser[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  const [title, setTitle]         = useState("");
  const [skill, setSkill]         = useState("");
  const [mentorId, setMentorId]   = useState("");
  const [dateStr, setDateStr]     = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [hour, setHour]           = useState("10");
  const [minute, setMinute]       = useState("00");
  const [ampm, setAmpm]           = useState("AM");

  const [searchMentor, setSearchMentor] = useState("");
  const [showMentorDropdown, setShowMentorDropdown] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // The current user is always the learner in a session they create
  const learnerId = currentUser._id;

  useEffect(() => {
    async function load() {
      try {
        const list = await getMentors(undefined, currentUser._id);
        setMentors(list);
        
        if (initialMentorId && list.some(m => m._id === initialMentorId)) {
          setMentorId(initialMentorId);
        } else if (list[0]) {
          setMentorId(list[0]._id);
        }
      } finally {
        setLoadingMentors(false);
      }
    }
    void load();
  }, [currentUser._id]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setError("Session title is required."); return; }
    if (!mentorId)     { setError("Please select a mentor."); return; }
    if (!dateStr)      { setError("Please choose a date."); return; }

    const [yyyy, mm, dd] = dateStr.split("-").map(Number);
    let h = parseInt(hour, 10);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const finalDate = new Date(yyyy, mm - 1, dd, h, parseInt(minute, 10));

    if (finalDate.getTime() < Date.now()) {
      setError("Please choose a future time.");
      return;
    }

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
        date:      finalDate.toISOString(),
        status:    "upcoming",
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }, [title, mentorId, learnerId, skill, dateStr, hour, minute, ampm, mentors, onCreated]);

  const filteredMentors = mentors.filter(m => 
    m.name.toLowerCase().includes(searchMentor.toLowerCase()) || 
    m.skillsOffered?.some(s => s.toLowerCase().includes(searchMentor.toLowerCase()))
  );
  const selectedMentorObj = mentors.find(m => m._id === mentorId);

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
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Mentor
            </label>
            {loadingMentors ? (
              <Skeleton className="h-12 w-full" />
            ) : mentors.length === 0 ? (
              <p className="rounded-xl bg-surface-container px-4 py-3 text-sm text-stone-400">
                No other mentors found. Ask someone to add skills to their profile.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowMentorDropdown(!showMentorDropdown)}
                  className="flex w-full items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-left text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <span>
                    {selectedMentorObj ? (
                      <span className="font-semibold">{selectedMentorObj.name}</span>
                    ) : (
                      <span className="text-stone-400">Select a mentor...</span>
                    )}
                  </span>
                  <Icon name="expand_more" className="text-stone-400" />
                </button>

                {showMentorDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMentorDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full z-40 mt-2 flex max-h-60 flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-high shadow-xl">
                      <div className="border-b border-outline-variant/20 p-2">
                        <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-sm">
                          <Icon name="search" className="text-stone-400" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search by name or skill..."
                            value={searchMentor}
                            onChange={(e) => setSearchMentor(e.target.value)}
                            className="w-full bg-transparent outline-none placeholder:text-stone-500"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2">
                        {filteredMentors.length === 0 ? (
                          <p className="px-3 py-4 text-center text-sm text-stone-400">No mentors found.</p>
                        ) : (
                          filteredMentors.map((m) => (
                            <button
                              key={m._id}
                              type="button"
                              onClick={() => {
                                setMentorId(m._id);
                                setShowMentorDropdown(false);
                                setSearchMentor("");
                              }}
                              className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition ${
                                mentorId === m._id ? "bg-primary/10 text-primary" : "hover:bg-surface-container-highest"
                              }`}
                            >
                              <span className="text-sm font-semibold">{m.name}</span>
                              <span className="text-xs text-stone-400">
                                {m.skillsOffered?.length ? m.skillsOffered.slice(0, 2).join(", ") : "No specific skills listed"}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Date & time */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Date & Time
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="session-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full sm:w-1/2 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex flex-1 items-center gap-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="flex-1 appearance-none rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-3 text-center text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const h = String(i + 1).padStart(2, "0");
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <span className="text-stone-400 font-bold">:</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="flex-1 appearance-none rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-3 text-center text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {["00", "15", "30", "45"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value)}
                  className="flex-1 appearance-none rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-3 text-center text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
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
  const [initialMentorId, setInitialMentorId] = useState<string | null>(null);

  // Auto-open booking modal if query params are present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("book") === "true") {
        setShowModal(true);
        setInitialMentorId(params.get("mentor"));
        // Remove query params to avoid re-triggering on refresh
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // ── Load sessions for current user ──────────────────────────────────────
  const load = useCallback(async (uid: string, signal: { cancelled: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessionsForUser(uid);
      if (signal.cancelled) return;
      setSessions(data ?? []);
    } catch (err) {
      if (signal.cancelled) return;
      setError((err as Error).message ?? "Unable to load sessions.");
    } finally {
      if (!signal.cancelled) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    // Not logged in — resolve loading immediately with empty state
    if (!user?._id) {
      setIsLoading(false);
      setSessions([]);
      return;
    }

    const signal = { cancelled: false };
    void load(user._id, signal);

    return () => {
      signal.cancelled = true;
    };
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
    if (user?._id) {
      const signal = { cancelled: false };
      void load(user._id, signal);
    }
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
          initialMentorId={initialMentorId}
          onClose={() => {
            setShowModal(false);
            setInitialMentorId(null);
          }}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
