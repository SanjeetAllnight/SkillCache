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
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
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

function calculateProfileCompleteness(profile: BackendUser | null) {
  if (!profile) return 0;
  let score = 0;
  if (profile.name) score += 20;
  if (profile.bio) score += 20;
  if (profile.location) score += 20;
  if (profile.avatar) score += 20;
  if ((profile.skillsOffered?.length ?? 0) > 0 || (profile.skillsWanted?.length ?? 0) > 0) score += 20;
  return score;
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

  // Edit profile modal
  const [editProfileOpen, setEditProfileOpen] = useState(false);
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

  // ── Profile save ────────────────────────────────────────────────────────────
  const handleProfileSave = useCallback(async (data: any) => {
    if (!user?._id) return;
    setSaveSuccess(false);
    await updateUserProfile(user._id, {
      name: data.name,
      bio: data.bio,
      location: data.location,
      emailVisibility: data.emailVisibility,
      avatar: data.avatar,
      skillsOffered: data.skillsOffered,
      skillsWanted: data.skillsWanted,
    });
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...data,
          }
        : prev,
    );
    setSaveSuccess(true);
  }, [user]);

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
  const location       = profile.location ?? "";

  const teachingSkills = skills.filter((s) => s.type === "teaching");
  const learningSkills = skills.filter((s) => s.type === "learning");
  
  const memberSinceStr = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : "Recently joined";
    
  const profileCompleteness = calculateProfileCompleteness(profile);

  return (
    <>
      <SkillModal
        isOpen={modalOpen}
        editingSkill={editingSkill}
        onClose={() => setModalOpen(false)}
        onSave={handleSkillSave}
      />
      
      <EditProfileModal
        isOpen={editProfileOpen}
        profile={profile}
        onClose={() => setEditProfileOpen(false)}
        onSave={handleProfileSave}
      />

      <ToastPortal
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      <div className="page-shell page-stack">
        <section className="section-stack">
          <div className="relative">
            <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-secondary/20 to-tertiary/30 md:h-72">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
              <div className="pointer-events-none absolute -right-10 -top-10 font-headline text-[160px] font-black leading-none tracking-tighter text-white/5 select-none">
                {avatarInitials}
              </div>
            </div>

            <div className="relative -mt-10 flex flex-col gap-4 px-5 sm:px-6 md:-mt-14 md:flex-row md:items-end md:px-8 lg:px-10">
              {profile.avatar ? (
                <div
                  className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-surface shadow-xl md:h-40 md:w-40 bg-surface bg-cover bg-center"
                  style={{ backgroundImage: `url(${profile.avatar})` }}
                />
              ) : (
                <div
                  className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-surface font-headline text-4xl font-black shadow-xl md:h-40 md:w-40 md:text-5xl ${avatarPalette}`}
                >
                  {avatarInitials}
                </div>
              )}

              <div className="flex flex-1 flex-col justify-end gap-4 pb-2">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-headline text-3xl font-black tracking-tighter text-on-surface md:text-5xl">
                        {profile.name}
                      </h1>
                      <Icon name="verified" filled className="text-primary" />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="font-medium text-primary">
                        {offeredSkills.length > 0
                          ? offeredSkills[0] + " Mentor"
                          : "SkillCache Member"}
                      </span>
                      
                      {location && (
                        <span className="flex items-center gap-1 text-stone-500">
                          <Icon name="location_on" className="text-[15px]" />
                          {location}
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1 text-stone-500">
                        <Icon name="calendar_today" className="text-[15px]" />
                        Member since {memberSinceStr}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      {ratingMeta && ratingMeta.totalReviews > 0 ? (
                        <StarBadge rating={ratingMeta.averageRating} totalReviews={ratingMeta.totalReviews} size="md" />
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-400">No reviews yet</span>
                      )}
                      <span className="h-4 w-[1px] bg-outline-variant/50 hidden md:block" />
                      <div className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
                        <Icon name="forum" className="text-stone-400" />
                        {profile.sessionsCompleted || 0} Sessions
                      </div>
                      <span className="h-4 w-[1px] bg-outline-variant/50 hidden md:block" />
                      <div className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
                        <Icon name="school" className="text-stone-400" />
                        {teachingSkills.length} Taught
                      </div>
                      <span className="h-4 w-[1px] bg-outline-variant/50 hidden md:block" />
                      <div className="flex items-center gap-1.5 text-sm font-medium text-stone-600">
                        <Icon name="auto_stories" className="text-stone-400" />
                        {learningSkills.length} Learned
                      </div>
                    </div>
                  </div>

                  {isOwnProfile && (
                    <div className="flex shrink-0 gap-2 self-start">
                      <button
                        id="btn-edit-profile"
                        type="button"
                        onClick={() => { setEditProfileOpen(true); setSaveSuccess(false); }}
                        className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container px-5 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container-high shadow-editorial"
                      >
                        <Icon name="edit" className="text-sm" />
                        Edit Profile
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            <Icon name="check_circle" filled className="text-base" />
            Profile saved successfully.
          </div>
        )}

        <div className="grid gap-10 xl:grid-cols-12">
          <aside className="space-y-10 xl:col-span-4">
            
            {/* Completeness indicator */}
            {isOwnProfile && profileCompleteness < 100 && (
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary">Profile Completeness</h3>
                  <span className="text-sm font-bold text-primary">{profileCompleteness}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out" 
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-primary/80">
                  A complete profile helps you stand out to mentors and learners. 
                  <button 
                    onClick={() => setEditProfileOpen(true)} 
                    className="ml-1 underline font-bold"
                  >
                    Complete it now
                  </button>
                </p>
              </section>
            )}

            <section className="section-stack">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                About
              </h2>
              <p className="text-base leading-relaxed text-on-surface-variant whitespace-pre-wrap">
                {bio || (
                  <span className="italic text-stone-500">
                    {isOwnProfile
                      ? "No bio yet — click Edit Profile to add one."
                      : "No bio provided."}
                  </span>
                )}
              </p>
            </section>

            <section className="app-card-soft space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Teaching
                </h2>
              </div>
              {skillsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ) : teachingSkills.length > 0 || offeredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {offeredSkills.map((s) => (
                    <Tag key={s} className="px-3 py-1 text-xs normal-case font-bold bg-primary-container/60">
                      {s}
                    </Tag>
                  ))}
                  {teachingSkills.filter(ts => !offeredSkills.includes(ts.name)).map((s) => (
                    <Tag key={s._id} className="px-3 py-1 text-xs normal-case">
                      {s.name}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-stone-400">
                  {isOwnProfile ? "Add skills to teach in Edit Profile." : "No skills listed."}
                </p>
              )}
            </section>

            <section className="app-card-soft space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Learning
                </h2>
              </div>
              {skillsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ) : learningSkills.length > 0 || wantedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {wantedSkills.map((s) => (
                    <Tag key={s} className="px-3 py-1 text-xs normal-case font-bold bg-secondary-container/60">
                      {s}
                    </Tag>
                  ))}
                  {learningSkills.filter(ls => !wantedSkills.includes(ls.name)).map((s) => (
                    <Tag key={s._id} className="px-3 py-1 text-xs normal-case bg-surface-container-high border-outline-variant/50">
                      {s.name}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-stone-400">
                  {isOwnProfile
                    ? "Add learning goals in Edit Profile."
                    : "No learning goals listed."}
                </p>
              )}
            </section>

            {(profile.emailVisibility === "public" || isOwnProfile) && (
              <section className="section-stack">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                    Contact
                  </h2>
                  {isOwnProfile && profile.emailVisibility === "private" && (
                    <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                      <Icon name="lock" className="text-[12px]" /> Private
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Icon name="alternate_email" className="text-primary" />
                  {profile.email}
                </div>
              </section>
            )}
          </aside>

          <div className="min-w-0 space-y-10 xl:col-span-8">
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
                    className="flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-xs font-bold text-on-surface transition hover:bg-surface-container-high shadow-editorial"
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
                <div className="rounded-2xl border border-dashed border-outline-variant/30 p-10 text-center">
                  <span className="material-symbols-outlined mb-2 text-5xl text-stone-300">
                    add_circle
                  </span>
                  {isOwnProfile ? (
                    <>
                      <p className="mb-6 text-sm text-stone-400 max-w-sm mx-auto">
                        Your arsenal is empty. Add detailed skill cards to show off your expertise and experience levels.
                      </p>
                      <button
                        type="button"
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 shadow-editorial"
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
                    href={isOwnProfile ? "/mentors" : `/sessions?request=true&mentorId=${profile._id}`}
                    variant="solid"
                    rounded="xl"
                  >
                    {isOwnProfile ? "Find Mentors" : "Book Session"}
                    <Icon name="chevron_right" className="text-sm" />
                  </Button>
                </div>
              </div>
            </section>

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
