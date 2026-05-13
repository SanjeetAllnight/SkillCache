"use client";

import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMentors,
  requestSession,
  rescheduleSession,
  type ApiSession,
} from "@/lib/firebaseServices";
import type { BackendUser } from "@/lib/mockUser";

type SessionRequestModalProps = {
  currentUser: BackendUser;
  mode?: "request" | "reschedule";
  session?: ApiSession | null;
  onClose: () => void;
  onSaved: () => void;
};

function toISODate(localDatetime: string): string {
  return new Date(localDatetime).toISOString();
}

function toDatetimeLocal(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function SessionRequestModal({
  currentUser,
  mode = "request",
  session,
  onClose,
  onSaved,
}: SessionRequestModalProps) {
  const isReschedule = mode === "reschedule" && Boolean(session);
  const [mentors, setMentors] = useState<BackendUser[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(!isReschedule);
  const [title, setTitle] = useState(session?.title ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [skill, setSkill] = useState(session?.skill ?? "");
  const [mentorId, setMentorId] = useState(session?.mentorId ?? "");
  const [date, setDate] = useState(toDatetimeLocal(session?.date));
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
        if (!mentorId && list[0]) setMentorId(list[0]._id);
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
  }, [currentUser._id, isReschedule, mentorId]);

  const handleSubmit = useCallback(async () => {
    if (!date) {
      setError("Choose a date and time for the session.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isReschedule && session) {
        await rescheduleSession(session._id, toISODate(date), rescheduleNote.trim());
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

      const selectedMentor = mentors.find((mentor) => mentor._id === mentorId);
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
        date: toISODate(date),
      });
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this session.");
      setSaving(false);
    }
  }, [
    currentUser._id,
    date,
    description,
    isReschedule,
    mentorId,
    mentors,
    onSaved,
    rescheduleNote,
    session,
    skill,
    title,
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
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                    Mentor
                  </span>
                  {loadingMentors ? (
                    <Skeleton className="h-12 w-full" />
                  ) : mentors.length === 0 ? (
                    <p className="rounded-lg bg-surface-container px-4 py-3 text-sm text-stone-500">
                      No mentors are available yet.
                    </p>
                  ) : (
                    <select
                      value={mentorId}
                      onChange={(event) => setMentorId(event.target.value)}
                      className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      {mentors.map((mentor) => (
                        <option key={mentor._id} value={mentor._id}>
                          {mentor.name}
                          {mentor.skillsOffered?.length ? ` - ${mentor.skillsOffered.slice(0, 2).join(", ")}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

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

          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
              Date and Time
            </span>
            <input
              type="datetime-local"
              value={date}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>

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
