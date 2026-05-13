"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ApiSkill, ExperienceLevel, SkillType } from "@/lib/firebaseServices";

// ─── Constants ─────────────────────────────────────────────────────────────────

export const SKILL_CATEGORIES = [
  "Tech",
  "Design",
  "Music",
  "Language",
  "Business",
  "Other",
] as const;

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced" },
  { value: "expert",       label: "Expert" },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SkillFormData = {
  name: string;
  category: string;
  tags: string[];
  type: SkillType;
  description: string;
  level: ExperienceLevel;
};

type SkillModalProps = {
  isOpen: boolean;
  editingSkill?: ApiSkill | null;
  onClose: () => void;
  /** Called after a successful save with the resulting skill data. */
  onSave: (data: SkillFormData, skillId?: string) => Promise<void>;
};

// ─── Tag input sub-component ──────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, "").toLowerCase();
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
          #{tag}
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
        id="skill-tag-input"
        type="text"
        value={input}
        placeholder={tags.length === 0 ? "Type a tag, press Enter or comma…" : ""}
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

const EMPTY_FORM: SkillFormData = {
  name:        "",
  category:    "Tech",
  tags:        [],
  type:        "teaching",
  description: "",
  level:       "intermediate",
};

export function SkillModal({ isOpen, editingSkill, onClose, onSave }: SkillModalProps) {
  const [form, setForm]           = useState<SkillFormData>(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nameRef                   = useRef<HTMLInputElement>(null);

  // Populate form when editing skill changes
  useEffect(() => {
    if (!isOpen) return;
    if (editingSkill) {
      setForm({
        name:        editingSkill.name,
        category:    editingSkill.category,
        tags:        editingSkill.tags ?? [],
        type:        editingSkill.type,
        description: editingSkill.description ?? "",
        level:       editingSkill.level,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setNameError(null);
    setSaveError(null);
    setSaving(false);
    // Focus name field after open animation
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [isOpen, editingSkill]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function set<K extends keyof SkillFormData>(key: K, value: SkillFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "name") setNameError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setNameError("Skill name is required."); nameRef.current?.focus(); return; }
    if (name.length > 60) { setNameError("Skill name must be 60 characters or fewer."); nameRef.current?.focus(); return; }

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ ...form, name }, editingSkill?._id);
      onClose();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const title = editingSkill ? "Edit Skill" : "Add New Skill";

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="skill-modal-title"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[1001] max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(560px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:transition-all",
          isOpen
            ? "translate-y-0 sm:-translate-y-1/2 sm:scale-100 sm:opacity-100"
            : "translate-y-full sm:translate-y-0 sm:-translate-y-[calc(50%-24px)] sm:scale-95 sm:opacity-0 sm:pointer-events-none",
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-outline-variant/40 sm:hidden" />

        <form onSubmit={handleSubmit} noValidate>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
            <h2 id="skill-modal-title" className="font-headline text-2xl font-black tracking-tighter text-on-surface">
              {title}
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

          <div className="space-y-5 px-6 pb-8 sm:px-8">

            {/* Skill type toggle */}
            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                Skill Type
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(["teaching", "learning"] as SkillType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    id={`skill-type-${t}`}
                    aria-pressed={form.type === t}
                    onClick={() => set("type", t)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold capitalize transition-all",
                      form.type === t
                        ? t === "teaching"
                          ? "border-primary bg-primary-container/60 text-on-primary-container"
                          : "border-secondary bg-secondary-container/60 text-on-secondary-container"
                        : "border-outline-variant/30 bg-surface-container text-stone-400 hover:bg-surface-container-high",
                    )}
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {t === "teaching" ? "school" : "auto_stories"}
                    </span>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Skill name */}
            <div className="space-y-1.5">
              <label htmlFor="skill-name" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Skill Name <span className="text-error">*</span>
              </label>
              <input
                ref={nameRef}
                id="skill-name"
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={60}
                placeholder="e.g. React, Fingerstyle Guitar, Spanish…"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "skill-name-error" : undefined}
                className={cn(
                  "w-full rounded-xl border bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 transition-all outline-none focus:ring-2 focus:ring-primary/20",
                  nameError
                    ? "border-error focus:border-error"
                    : "border-outline-variant/30 focus:border-primary",
                )}
              />
              {nameError && (
                <p id="skill-name-error" role="alert" className="text-xs font-medium text-error">
                  {nameError}
                </p>
              )}
              <p className="text-right text-[11px] text-stone-400">{form.name.length}/60</p>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="skill-category" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Category
              </label>
              <select
                id="skill-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Experience level */}
            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                Experience Level
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {EXPERIENCE_LEVELS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    id={`skill-level-${value}`}
                    aria-pressed={form.level === value}
                    onClick={() => set("level", value)}
                    className={cn(
                      "rounded-xl border-2 py-2.5 text-xs font-bold transition-all",
                      form.level === value
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/30 bg-surface-container text-stone-400 hover:bg-surface-container-high",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Tags */}
            <div className="space-y-1.5">
              <label htmlFor="skill-tag-input" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Tags
              </label>
              <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
              <p className="text-[11px] text-stone-400">Press Enter or comma to add a tag · up to 10</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="skill-description" className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Description <span className="font-normal normal-case text-stone-400">(optional)</span>
              </label>
              <textarea
                id="skill-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Briefly describe your experience with this skill…"
                className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-right text-[11px] text-stone-400">{form.description.length}/300</p>
            </div>

            {/* Server-side error */}
            {saveError && (
              <p role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error">
                {saveError}
              </p>
            )}

            {/* Actions */}
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
                id="btn-save-skill"
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
                    {editingSkill ? "Save Changes" : "Add Skill"}
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
