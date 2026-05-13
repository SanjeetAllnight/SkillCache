"use client";

import { cn } from "@/lib/utils";
import type { ApiSkill, ExperienceLevel, SkillType } from "@/lib/firebaseServices";

// ─── Colour mapping ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Tech:      "code",
  Design:    "palette",
  Music:     "music_note",
  Language:  "translate",
  Business:  "business_center",
  Other:     "auto_awesome",
};

const CATEGORY_COLORS: Record<string, string> = {
  Tech:     "bg-primary-container text-on-primary-container",
  Design:   "bg-tertiary-container text-on-tertiary-container",
  Music:    "bg-secondary-container text-on-secondary-container",
  Language: "bg-tertiary-fixed text-on-tertiary-fixed",
  Business: "bg-primary-fixed text-on-primary-fixed",
  Other:    "bg-surface-container-high text-on-surface",
};

const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner:     "Beginner",
  intermediate: "Intermediate",
  advanced:     "Advanced",
  expert:       "Expert",
};

const LEVEL_COLORS: Record<ExperienceLevel, string> = {
  beginner:     "bg-surface-container text-stone-500",
  intermediate: "bg-secondary-container/60 text-on-secondary-container",
  advanced:     "bg-primary-container/70 text-on-primary-container",
  expert:       "bg-primary text-on-primary",
};

const TYPE_LABELS: Record<SkillType, { label: string; icon: string; cls: string }> = {
  teaching: { label: "Teaching", icon: "school",       cls: "bg-primary-container/60 text-on-primary-container" },
  learning: { label: "Learning", icon: "auto_stories", cls: "bg-secondary-container/60 text-on-secondary-container" },
};

// ─── Component ─────────────────────────────────────────────────────────────────

type SkillCardProps = {
  skill: ApiSkill;
  isOwn?: boolean;
  onEdit?: (skill: ApiSkill) => void;
  onDelete?: (skill: ApiSkill) => void;
  deleting?: boolean;
};

export function SkillCard({ skill, isOwn, onEdit, onDelete, deleting }: SkillCardProps) {
  const icon  = CATEGORY_ICONS[skill.category]  ?? "auto_awesome";
  const color = CATEGORY_COLORS[skill.category] ?? CATEGORY_COLORS.Other;
  const type  = TYPE_LABELS[skill.type];
  const level = LEVEL_LABELS[skill.level];
  const levelColor = LEVEL_COLORS[skill.level];

  return (
    <article
      className={cn(
        "app-card group relative flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5",
        deleting && "pointer-events-none opacity-50",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", color)}>
          <span className="material-symbols-outlined text-[22px] leading-none">{icon}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Skill type badge */}
          <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest", type.cls)}>
            <span className="material-symbols-outlined text-[11px] leading-none">{type.icon}</span>
            {type.label}
          </span>
          {/* Experience level */}
          <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest", levelColor)}>
            {level}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-headline text-xl font-bold leading-tight text-on-surface">
        {skill.name}
      </h3>

      {/* Description */}
      {skill.description && (
        <p className="text-sm leading-relaxed text-on-surface-variant line-clamp-2">
          {skill.description}
        </p>
      )}

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-outline-variant/30 bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Category chip */}
      <div className="mt-auto pt-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
          {skill.category}
        </span>
      </div>

      {/* Edit / Delete — own profile only */}
      {isOwn && (
        <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            id={`btn-edit-skill-${skill._id}`}
            type="button"
            aria-label={`Edit ${skill.name}`}
            onClick={() => onEdit?.(skill)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-base leading-none">edit</span>
          </button>
          <button
            id={`btn-delete-skill-${skill._id}`}
            type="button"
            aria-label={`Delete ${skill.name}`}
            onClick={() => onDelete?.(skill)}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base leading-none">delete</span>
          </button>
        </div>
      )}
    </article>
  );
}
