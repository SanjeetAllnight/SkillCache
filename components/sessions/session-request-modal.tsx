"use client";

import { useCallback, useEffect, useState, useRef } from "react";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMentors,
  requestSession,
  rescheduleSession,
  type ApiSession,
} from "@/lib/firebaseServices";
import type { BackendUser } from "@/lib/mockUser";
import { cn } from "@/lib/utils";

type SessionRequestModalProps = {
  currentUser: BackendUser;
  mode?: "request" | "reschedule";
  session?: ApiSession | null;
  initialMentorId?: string;
  onClose: () => void;
  onSaved: () => void;
};

// Returns YYYY-MM-DD
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

// Returns HH:00 for the next hour
function getNextHourTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0);
  return d.toTimeString().slice(0, 5); // "HH:MM"
}

// For ISO <-> local conversion
function toISODate(dateStr: string, timeStr: string): string {
  // combine into local datetime then get ISO
  const d = new Date(`${dateStr}T${timeStr}`);
  return d.toISOString();
}

function parseISODate(iso?: string) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  
  // Format as local YYYY-MM-DD and HH:MM
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export function SessionRequestModal({
  currentUser,
  mode = "request",
  session,
  initialMentorId,
  onClose,
  onSaved,
}: SessionRequestModalProps) {
  const isReschedule = mode === "reschedule" && Boolean(session);
  const [mentors, setMentors] = useState<BackendUser[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(!isReschedule);
  const [title, setTitle] = useState(session?.title ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [skill, setSkill] = useState(session?.skill ?? "");
  
  // Mentor autocomplete state
  const [mentorId, setMentorId] = useState(session?.mentorId ?? initialMentorId ?? "");
  const [mentorSearch, setMentorSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initialDateTime = session?.date 
    ? parseISODate(session.date) 
    : { date: getTomorrowDate(), time: getNextHourTime() };

  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  
  const [sessionType, setSessionType] = useState<"private" | "public">(
    session?.sessionType ?? "private"
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    session?.durationMinutes ?? 30
  );
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReschedule) return;

    let mounted = true;
    async function loadMentors() {
      try {
        const list = await getMentors(undefined, currentUser._id);
        if (!mounted) return;
        setMentors(list);
        
        // Auto-select initialMentorId, or first available if none provided
        if (!mentorId) {
          if (initialMentorId && list.some(m => m._id === initialMentorId)) {
            setMentorId(initialMentorId);
          } else if (list[0]) {
            setMentorId(list[0]._id);
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load mentors.");
        }
      } finally {
        if (mounted) setLoadingMentors(false);
      }
    }

    void loadMentors();
    return () => {
      mounted = false;
    };
  }, [currentUser._id, isReschedule, mentorId, initialMentorId]);

  // Handle click outside combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMentor = mentors.find(m => m._id === mentorId);

  // Sync mentor search input with selected mentor name initially or when selection changes
  useEffect(() => {
    if (selectedMentor && !isDropdownOpen) {
      setMentorSearch(selectedMentor.name);
    }
  }, [selectedMentor, isDropdownOpen]);

  const filteredMentors = mentors.filter(mentor => 
    mentor.name.toLowerCase().includes(mentorSearch.toLowerCase()) || 
    mentor.skillsOffered?.some(s => s.toLowerCase().includes(mentorSearch.toLowerCase()))
  );

  const handleSubmit = useCallback(async () => {
    if (!date || !time) {
      setError("Choose both a date and time for the session.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isReschedule && session) {
        await rescheduleSession(session._id, toISODate(date, time), rescheduleNote.trim());
        onSaved();
        return;
      }

      if (!title.trim()) {
        setError("Add a focused session topic.");
        setSaving(false);
        return;
      }
      if (!mentorId) {
        setError("Choose a mentor for this request.");
        setSaving(false);
        return;
      }

      const firstSkill =
        skill.trim() ||
        selectedMentor?.skillsOffered?.[0] ||
        "General mentorship";

      await requestSession({
        title: title.trim(),
        description: description.trim(),
        mentorId,
        learnerId: currentUser._id,
        skill: firstSkill,
        date: toISODate(date, time),
        sessionType,
        durationMinutes,
        visibility: sessionType,
        maxParticipants: sessionType === "public" ? 10 : 2,
      });
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this session.");
      setSaving(false);
    }
  }, [
    currentUser._id,
    date,
    time,
    description,
    isReschedule,
    mentorId,
    onSaved,
    rescheduleNote,
    session,
    skill,
    title,
    sessionType,
    durationMinutes,
    selectedMentor,
  ]);

  return (
    <>
      <button
        type="button"
        aria-label="Close session modal"
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />
      <section className="fixed inset-x-3 top-1/2 z-50 max-h-[92vh] max-w-2xl -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface-container-lowest p-5 shadow-2xl sm:inset-x-6 sm:mx-auto md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Mentorship Workflow
            </p>
            <h2 className="mt-2 font-headline text-2xl font-black tracking-tight">
              {isReschedule ? "Reschedule Session" : "Request Session"}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {isReschedule
                ? "Propose a cleaner time for this accepted request."
                : "Send a structured session request for a mentor to review."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-high"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>

        <div className="space-y-5">
          {!isReschedule ? (
            <>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Topic
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Debugging React performance"
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Request Notes
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={400}
                  placeholder="What are you hoping to learn or unblock?"
                  className="w-full resize-none rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5" ref={dropdownRef}>
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Mentor
                  </span>
                  {loadingMentors ? (
                    <Skeleton className="h-[46px] w-full" />
                  ) : mentors.length === 0 ? (
                    <p className="rounded-lg bg-surface-container px-4 py-3 text-sm text-stone-500">
                      No mentors are available yet.
                    </p>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={mentorSearch}
                          onChange={(e) => {
                            setMentorSearch(e.target.value);
                            setIsDropdownOpen(true);
                            if (e.target.value === "") setMentorId(""); // Clear selection
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          placeholder="Search for a mentor..."
                          className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                        <Icon 
                          name={isDropdownOpen ? "expand_less" : "expand_more"} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                        />
                      </div>
                      
                      {isDropdownOpen && (
                        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface shadow-xl">
                          {filteredMentors.length > 0 ? (
                            filteredMentors.map((mentor) => (
                              <li key={mentor._id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMentorId(mentor._id);
                                    setMentorSearch(mentor.name);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-container",
                                    mentorId === mentor._id ? "bg-primary/5 text-primary" : "text-on-surface"
                                  )}
                                >
                                  <div>
                                    <p className="text-sm font-semibold">{mentor.name}</p>
                                    <p className="text-xs text-on-surface-variant line-clamp-1">
                                      {mentor.skillsOffered?.length ? mentor.skillsOffered.slice(0, 2).join(", ") : "General Mentor"}
                                    </p>
                                  </div>
                                  {mentorId === mentor._id && (
                                    <Icon name="check" className="text-base" />
                                  )}
                                </button>
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-3 text-sm text-stone-500 text-center">
                              No mentors found
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Skill Focus
                  </span>
                  <input
                    value={skill}
                    onChange={(event) => setSkill(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-surface-container px-4 py-3">
              <p className="text-sm font-bold">{session?.title}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Current mentor: {session?.mentor.name}
              </p>
            </div>
          )}

          {!isReschedule && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Session Type
                </span>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as "private" | "public")}
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="private">Private Session</option>
                  <option value="public">Public Workshop</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                  Duration
                </span>
                <select
                  value={durationMinutes.toString()}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                Date
              </span>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                Time
              </span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>

          {isReschedule ? (
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                Reschedule Note
              </span>
              <textarea
                value={rescheduleNote}
                onChange={(event) => setRescheduleNote(event.target.value)}
                rows={3}
                placeholder="Optional context for the learner"
                className="w-full resize-none rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-error/10 px-4 py-3 text-sm font-medium text-error">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-outline-variant/20 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-outline-variant/40 px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || (!isReschedule && mentors.length === 0)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
              ) : (
                <Icon name={isReschedule ? "edit_calendar" : "send"} className="text-base" />
              )}
              {saving ? "Saving..." : isReschedule ? "Save New Time" : "Send Request"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
