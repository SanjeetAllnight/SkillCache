"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { BackendUser } from "@/lib/mockUser";

// ─── Tag input sub-component ──────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      onChange([...tags, tag]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-primary-container/70 px-2.5 py-0.5 text-xs font-semibold text-on-primary-container"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => removeTag(tag)}
            className="ml-0.5 rounded-full hover:bg-black/10 transition-colors leading-none"
          >
            <span className="material-symbols-outlined text-[13px] leading-none">close</span>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        placeholder={tags.length === 0 ? (placeholder || "Type and press Enter…") : ""}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
          } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={() => { if (input.trim()) addTag(input); }}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-on-surface placeholder-stone-400 outline-none"
      />
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

type EditProfileFormData = {
  name: string;
  bio: string;
  location: string;
  emailVisibility: "public" | "private";
  avatar: string;
  skillsOffered: string[];
  skillsWanted: string[];
};

type EditProfileModalProps = {
  isOpen: boolean;
  profile: BackendUser | null;
  onClose: () => void;
  onSave: (data: EditProfileFormData) => Promise<void>;
};

export function EditProfileModal({ isOpen, profile, onClose, onSave }: EditProfileModalProps) {
  const [form, setForm] = useState<EditProfileFormData>({
    name: "",
    bio: "",
    location: "",
    emailVisibility: "private",
    avatar: "",
    skillsOffered: [],
    skillsWanted: [],
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (profile) {
      setForm({
        name: profile.name || "",
        bio: profile.bio || "",
        location: profile.location || "",
        emailVisibility: profile.emailVisibility || "private",
        avatar: profile.avatar || "",
        skillsOffered: profile.skillsOffered || [],
        skillsWanted: profile.skillsWanted || [],
      });
    }
    setNameError(null);
    setSaveError(null);
    setSaving(false);
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function set<K extends keyof EditProfileFormData>(key: K, value: EditProfileFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "name") setNameError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setNameError("Name is required."); nameRef.current?.focus(); return; }
    if (name.length > 50) { setNameError("Name must be 50 characters or fewer."); nameRef.current?.focus(); return; }

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ ...form, name });
      onClose();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        role="presentation"
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        role="dialog"
        aria-modal
        aria-labelledby="edit-profile-modal-title"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[1001] max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(640px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:transition-all",
          isOpen
            ? "translate-y-0 sm:-translate-y-1/2 sm:scale-100 sm:opacity-100"
            : "translate-y-full sm:translate-y-0 sm:-translate-y-[calc(50%-24px)] sm:scale-95 sm:opacity-0 sm:pointer-events-none",
        )}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-outline-variant/40 sm:hidden" />

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex items-center justify-between px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
            <h2 id="edit-profile-modal-title" className="font-headline text-2xl font-black tracking-tighter text-on-surface">
              Edit Profile
            </h2>
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-xl leading-none">close</span>
            </button>
          </div>

          <div className="space-y-6 px-6 pb-8 sm:px-8">

            {/* Profile Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Basic Info</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="profile-name" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                    Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    id="profile-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={50}
                    placeholder="Your name"
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? "profile-name-error" : undefined}
                    className={cn(
                      "w-full rounded-xl border bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 transition-all outline-none focus:ring-2 focus:ring-primary/20",
                      nameError ? "border-error focus:border-error" : "border-outline-variant/30 focus:border-primary",
                    )}
                  />
                  {nameError && <p id="profile-name-error" role="alert" className="text-xs font-medium text-error">{nameError}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="profile-location" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                    Location
                  </label>
                  <input
                    id="profile-location"
                    type="text"
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    maxLength={60}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-avatar" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Profile Picture URL
                </label>
                <input
                  id="profile-avatar"
                  type="url"
                  value={form.avatar}
                  onChange={(e) => set("avatar", e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-bio" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  About You
                </label>
                <textarea
                  id="profile-bio"
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  maxLength={400}
                  rows={4}
                  placeholder="Tell the community about yourself…"
                  className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-right text-[11px] text-stone-400">{form.bio.length}/400</p>
              </div>
            </div>

            <hr className="border-outline-variant/20" />

            {/* High-level Skills Overview */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">High-Level Skills</h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Skills You Teach
                </label>
                <TagInput
                  tags={form.skillsOffered}
                  onChange={(tags) => set("skillsOffered", tags)}
                  placeholder="e.g. React, UX Design…"
                />
                <p className="text-[11px] text-stone-400">Broad categories of skills you can mentor others in.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Skills You Are Learning
                </label>
                <TagInput
                  tags={form.skillsWanted}
                  onChange={(tags) => set("skillsWanted", tags)}
                  placeholder="e.g. Marketing, Spanish…"
                />
                <p className="text-[11px] text-stone-400">Broad categories of skills you want to learn.</p>
              </div>
            </div>

            <hr className="border-outline-variant/20" />

            {/* Privacy */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Privacy</h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Email Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={form.emailVisibility === "private"}
                    onClick={() => set("emailVisibility", "private")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-xs font-bold transition-all",
                      form.emailVisibility === "private"
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/30 bg-surface-container text-stone-400 hover:bg-surface-container-high",
                    )}
                  >
                    <span className="material-symbols-outlined text-[15px]">lock</span>
                    Private
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.emailVisibility === "public"}
                    onClick={() => set("emailVisibility", "public")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-xs font-bold transition-all",
                      form.emailVisibility === "public"
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/30 bg-surface-container text-stone-400 hover:bg-surface-container-high",
                    )}
                  >
                    <span className="material-symbols-outlined text-[15px]">public</span>
                    Public
                  </button>
                </div>
                <p className="text-[11px] text-stone-400">
                  Public allows anyone viewing your profile to see your email address.
                </p>
              </div>
            </div>

            {saveError && (
              <p role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error">
                {saveError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-outline-variant/30 bg-surface-container px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base leading-none">save</span>
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
