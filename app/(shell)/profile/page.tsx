"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import { SkillCard } from "@/components/skills/skill-card";
import { SkillModal } from "@/components/skills/skill-modal";
import type { SkillFormData } from "@/components/skills/skill-modal";
import { ToastPortal, pushToast } from "@/components/skills/toast";
import type { ToastData } from "@/components/skills/toast";
import { StarBadge } from "@/components/reviews/star-rating";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getUserById,
  updateUserProfile,
  listenSkillsForUser,
  addSkill,
  updateSkill,
  deleteSkill,
  migrateSkillsFromLegacy,
  getMentorRatingMeta,
} from "@/lib/firebaseServices";
import type { ApiSkill, MentorRatingMeta } from "@/lib/firebaseServices";
import type { BackendUser } from "@/lib/mockUser";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PALETTE = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
function paletteFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function parseComma(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// ─── Badge definitions ────────────────────────────────────────────────────────

const EARNED_BADGES = [
  { icon: "trophy",       title: "Top Mentor",  subtitle: "Q1 2025",       tone: "primary"   },
  { icon: "auto_awesome", title: "Skill Sage",  subtitle: "Shared skills", tone: "tertiary"  },
  { icon: "handshake",    title: "Connector",   subtitle: "Active member", tone: "secondary" },
  { icon: "lock",         title: "???",         subtitle: "Locked",        tone: "locked"    },
];

const badgeClasses: Record<string, string> = {
  primary:   "from-primary/10 text-primary",
  tertiary:  "from-tertiary/10 text-tertiary",
  secondary: "from-secondary/10 text-secondary",
  locked:    "border-2 border-dashed border-outline-variant text-outline-variant",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const mentorId     = searchParams.get("mentor");
  const { user }     = useAuth();

  // Profile display
  const [profile, setProfile]     = useState<BackendUser | null>(null);
  const [ratingMeta, setRatingMeta] = useState<MentorRatingMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Bio editing
  const [editing, setEditing]         = useState(false);
  const [editName, setEditName]       = useState("");
  const [editBio, setEditBio]         = useState("");
  const [editOffered, setEditOffered] = useState("");
  const [editWanted, setEditWanted]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Skills
  const [skills, setSkills]               = useState<ApiSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingSkill, setEditingSkill]   = useState<ApiSkill | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const isOwnProfile = !mentorId || mentorId === user?._id;
  const displayUid   = mentorId ?? user?._id ?? null;

  // Guard against running the skill listener before we know the uid
  const listenerUidRef = useRef<string | null>(null);

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!displayUid) return;
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [data, meta] = await Promise.all([
          getUserById(displayUid!),
          getMentorRatingMeta(displayUid!),
        ]);
        if (!mounted) return;
        setProfile(data);
        setRatingMeta(meta);
        
        if (isOwnProfile && data) {
          setEditName(data.name ?? "");
          setEditBio(data.bio ?? "");
          setEditOffered((data.skillsOffered ?? []).join(", "));
          setEditWanted((data.skillsWanted ?? []).join(", "));
        }
      } catch (err) {
        if (!mounted) return;
        setLoadError((err as Error).message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [displayUid, isOwnProfile]);

  // ── Real-time skills listener + migration ────────────────────────────────────
  useEffect(() => {
    if (!displayUid) return;
    if (listenerUidRef.current === displayUid) return;
    listenerUidRef.current = displayUid;

    setSkillsLoading(true);

    // Fire-and-forget migration for own profile (safe no-op if already migrated)
    if (isOwnProfile && user?._id) {
      void migrateSkillsFromLegacy(user._id).catch(() => undefined);
    }

    const unsub = listenSkillsForUser(
      displayUid,
      (incoming) => {
        setSkills(incoming);
        setSkillsLoading(false);
      },
      () => setSkillsLoading(false),
    );
    return () => {
      listenerUidRef.current = null;
      unsub();
    };
  }, [displayUid, isOwnProfile, user?._id]);

  // ── Bio save ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user?._id) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateUserProfile(user._id, {
        skillsOffered: parseComma(editOffered),
        skillsWanted:  parseComma(editWanted),
        bio:           editBio.trim(),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              bio:          editBio.trim(),
              skillsOffered: parseComma(editOffered),
              skillsWanted:  parseComma(editWanted),
            }
          : prev,
      );
      setSaveSuccess(true);
      setEditing(false);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, editBio, editOffered, editWanted]);

  // ── Skill CRUD ──────────────────────────────────────────────────────────────
  const handleSkillSave = useCallback(
    async (data: SkillFormData, skillId?: string) => {
      if (!user?._id) return;
      if (skillId) {
        await updateSkill(user._id, skillId, data);
        setToasts((prev) => pushToast(prev, `"${data.name}" updated successfully.`));
      } else {
        await addSkill(user._id, data);
        setToasts((prev) => pushToast(prev, `"${data.name}" added to your profile.`));
      }
    },
    [user],
  );

  const handleDeleteSkill = useCallback(
    async (skill: ApiSkill) => {
      if (!user?._id) return;
      setDeletingId(skill._id);
      try {
        await deleteSkill(user._id, skill._id);
        setToasts((prev) => pushToast(prev, `"${skill.name}" removed.`));
      } catch (err) {
        setToasts((prev) =>
          pushToast(prev, (err as Error).message || "Delete failed.", "error"),
        );
      } finally {
        setDeletingId(null);
      }
    },
    [user],
  );

  function openAdd() {
    setEditingSkill(null);
    setModalOpen(true);
  }

  function openEdit(skill: ApiSkill) {
    setEditingSkill(skill);
    setModalOpen(true);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="page-shell page-stack">
        <div className="space-y-4">
          <Skeleton className="h-52 w-full md:h-72" />
          <Skeleton className="h-36 w-full max-w-xs" />
        </div>
        <div className="grid gap-10 xl:grid-cols-12">
          <div className="space-y-8 xl:col-span-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-8 xl:col-span-8">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────────
  if (loadError || !profile) {
    return (
      <div className="page-shell">
        <div className="rounded-2xl bg-error/10 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-error">
            {loadError ?? "Profile not found."}
          </p>
        </div>
      </div>
    );
  }

  const avatarInitials = initials(profile.name);
  const avatarPalette  = paletteFor(profile.name);
  const offeredSkills  = profile.skillsOffered ?? [];
  const wantedSkills   = profile.skillsWanted  ?? [];
  const bio            = profile.bio ?? "";

  const teachingSkills = skills.filter((s) => s.type === "teaching");
  const learningSkills = skills.filter((s) => s.type === "learning");

  return (
    <>
      {/* ── Skill modal ────────────────────────────────────────────────────── */}
      <SkillModal
        isOpen={modalOpen}
        editingSkill={editingSkill}
        onClose={() => setModalOpen(false)}
        onSave={handleSkillSave}
      />

      {/* ── Toast portal ───────────────────────────────────────────────────── */}
      <ToastPortal
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      <div className="page-shell page-stack">

        {/* ── Cover + avatar header ────────────────────────────────────────── */}
        <section className="section-stack">
          <div className="relative">
            {/* Cover gradient */}
            <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-secondary/20 to-tertiary/30 md:h-72">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
              {/* Decorative monogram */}
              <div className="pointer-events-none absolute -right-10 -top-10 font-headline text-[160px] font-black leading-none tracking-tighter text-white/5 select-none">
                {avatarInitials}
              </div>
            </div>

            {/* Avatar + name */}
            <div className="relative -mt-10 flex flex-col gap-4 px-5 sm:px-6 md:-mt-14 md:flex-row md:items-end md:px-8 lg:px-10">
              <div
                className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-surface font-headline text-4xl font-black shadow-xl md:h-40 md:w-40 md:text-5xl ${avatarPalette}`}
              >
                {avatarInitials}
              </div>

              <div className="flex flex-1 flex-col justify-end gap-3 pb-2 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-headline text-3xl font-black tracking-tighter text-on-surface md:text-5xl">
                      {profile.name}
                    </h1>
                    <Icon name="verified" filled className="text-primary" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-stone-500">
                      {offeredSkills.length > 0
                        ? offeredSkills[0] + " Mentor · Remote"
                        : "SkillCache Member · Remote"}
                    </p>
                    {ratingMeta && ratingMeta.totalReviews > 0 && (
                      <>
                        <span className="text-stone-300">·</span>
                        <StarBadge rating={ratingMeta.averageRating} totalReviews={ratingMeta.totalReviews} size="sm" />
                      </>
                    )}
                  </div>
                </div>

                {/* Edit profile / Add Skill buttons — own profile only */}
                {isOwnProfile && !editing && (
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    <button
                      id="btn-add-skill"
                      type="button"
                      onClick={openAdd}
                      className="flex items-center gap-2 self-start rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-editorial transition hover:opacity-90 md:self-auto"
                    >
                      <Icon name="add" className="text-sm" />
                      Add Skill
                    </button>
                    <button
                      id="btn-edit-profile"
                      type="button"
                      onClick={() => { setEditing(true); setSaveSuccess(false); }}
                      className="flex items-center gap-2 self-start rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high md:self-auto"
                    >
                      <Icon name="edit" className="text-sm" />
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Success banner ───────────────────────────────────────────────── */}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            <Icon name="check_circle" filled className="text-base" />
            Profile saved successfully.
          </div>
        )}

        {/* ── Main 2-col layout ────────────────────────────────────────────── */}
        <div className="grid gap-10 xl:grid-cols-12">

          {/* ── Left sidebar ─────────────────────────────────────────────── */}
          <aside className="space-y-10 xl:col-span-4">

            {/* Bio */}
            <section className="section-stack">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                About
              </h2>
              {editing ? (
                <textarea
                  id="edit-bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={400}
                  rows={5}
                  placeholder="Tell the community about yourself…"
                  className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <p className="text-base leading-relaxed text-on-surface-variant">
                  {bio || (
                    <span className="italic text-stone-500">
                      {isOwnProfile
                        ? "No bio yet — click Edit Profile to add one."
                        : "No bio provided."}
                    </span>
                  )}
                </p>
              )}
            </section>

            {/* Teaching skills — derived from sub-collection */}
            <section className="app-card-soft space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Teaching
                </h2>
                {isOwnProfile && !editing && (
                  <button
                    type="button"
                    onClick={openAdd}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:opacity-75 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[13px] leading-none">add</span>
                    Add
                  </button>
                )}
              </div>
              {skillsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ) : teachingSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teachingSkills.map((s) => (
                    <Tag key={s._id} className="px-3 py-1 text-xs normal-case">
                      {s.name}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-stone-400">
                  {isOwnProfile ? "Add skills to teach others." : "No skills listed."}
                </p>
              )}
            </section>

            {/* Learning skills — derived from sub-collection */}
            <section className="app-card-soft space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Learning
                </h2>
                {isOwnProfile && !editing && (
                  <button
                    type="button"
                    onClick={openAdd}
                    className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:opacity-75 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[13px] leading-none">add</span>
                    Add
                  </button>
                )}
              </div>
              {skillsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ) : learningSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {learningSkills.map((s) => (
                    <Tag
                      key={s._id}
                      className="px-3 py-1 text-xs normal-case bg-secondary-container/30"
                    >
                      {s.name}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-stone-400">
                  {isOwnProfile
                    ? "Add skills you want to learn."
                    : "No learning goals listed."}
                </p>
              )}
            </section>

            {/* Email — own profile only */}
            {isOwnProfile && (
              <section className="section-stack">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Contact
                </h2>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="alternate_email" className="text-primary" />
                  {profile.email}
                </div>
              </section>
            )}

            {/* Save / cancel bio editing */}
            {isOwnProfile && editing && (
              <div className="flex flex-col gap-3">
                {saveError && (
                  <p className="rounded-xl bg-error/10 px-4 py-2 text-sm text-error">
                    {saveError}
                  </p>
                )}
                <button
                  id="btn-save-profile"
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <Icon name="save" className="text-base" />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  id="btn-cancel-edit"
                  type="button"
                  onClick={() => { setEditing(false); setSaveError(null); }}
                  disabled={saving}
                  className="text-center text-sm text-stone-400 underline underline-offset-2 transition hover:text-stone-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </aside>

          {/* ── Right main column ───────────────────────────────────────── */}
          <div className="min-w-0 space-y-10 xl:col-span-8">

            {/* ── Skill cards — "The Arsenal" ──────────────────────────── */}
            <section className="section-stack">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  The Arsenal
                </h2>
                {isOwnProfile && (
                  <button
                    id="btn-add-skill-arsenal"
                    type="button"
                    onClick={openAdd}
                    className="flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">add</span>
                    Manage Skills
                  </button>
                )}
              </div>

              {skillsLoading ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-52 w-full" />
                  ))}
                </div>
              ) : skills.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {skills.map((skill) => (
                    <SkillCard
                      key={skill._id}
                      skill={skill}
                      isOwn={isOwnProfile}
                      onEdit={openEdit}
                      onDelete={handleDeleteSkill}
                      deleting={deletingId === skill._id}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant/30 p-8 text-center">
                  <span className="material-symbols-outlined mb-2 text-4xl text-stone-300">
                    add_circle
                  </span>
                  {isOwnProfile ? (
                    <>
                      <p className="mb-4 text-sm text-stone-400">
                        You haven&apos;t added any skills yet. Start building your arsenal!
                      </p>
                      <button
                        type="button"
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:opacity-90"
                      >
                        <span className="material-symbols-outlined text-base leading-none">add</span>
                        Add Your First Skill
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-stone-400">No skills listed yet.</p>
                  )}
                </div>
              )}
            </section>

            {/* ── Accolades / badges ───────────────────────────────────── */}
            <section className="section-stack">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Accolades
              </h2>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                {EARNED_BADGES.map((badge) => (
                  <article
                    key={badge.title}
                    className={`flex flex-col items-center gap-3 text-center ${badge.tone === "locked" ? "opacity-40 grayscale" : ""}`}
                  >
                    <div
                      className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-highest ${badge.tone === "locked" ? badgeClasses.locked : `bg-gradient-to-tr ${badgeClasses[badge.tone]}`}`}
                    >
                      <Icon
                        name={badge.icon}
                        filled={badge.icon !== "lock"}
                        className="text-4xl"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <h3
                        className={`text-sm font-bold ${badge.tone === "locked" ? "text-stone-400" : ""}`}
                      >
                        {badge.title}
                      </h3>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-stone-400">
                        {badge.subtitle}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* ── CTA section ─────────────────────────────────────────── */}
            <section className="relative overflow-hidden rounded-2xl bg-surface-container p-6 md:p-12">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-10">
                <Icon
                  name="groups"
                  className="absolute -right-10 -top-10 text-[180px] text-primary"
                />
              </div>
              <div className="relative z-10 max-w-lg space-y-5">
                <Tag className="px-4 py-1.5 text-xs">
                  {isOwnProfile ? "Your Exchange" : "Connect"}
                </Tag>
                <h2 className="font-headline text-3xl font-black tracking-tighter md:text-4xl">
                  {isOwnProfile
                    ? teachingSkills.length > 0
                      ? `Share ${teachingSkills[0].name}`
                      : "Share your skills"
                    : `Work with ${profile.name}`}
                </h2>
                <p className="font-medium text-on-surface-variant">
                  {isOwnProfile
                    ? "Find learners who want what you know, or discover mentors for what you want to learn."
                    : `Explore ${profile.name}'s skills and book a mentorship session.`}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    href={isOwnProfile ? "/mentors" : "/sessions"}
                    variant="solid"
                    rounded="xl"
                  >
                    {isOwnProfile ? "Find Mentors" : "Book Session"}
                    <Icon name="chevron_right" className="text-sm" />
                  </Button>
                </div>
              </div>
            </section>

            {/* ── Reviews Section ── */}
            <ReviewsSection
              mentor={profile}
              viewer={user}
              isOwnProfile={isOwnProfile}
              initialMeta={ratingMeta ?? undefined}
            />
          </div>
        </div>
      </div>
    </>
  );
}
