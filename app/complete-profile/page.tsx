"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/components/providers/auth-provider";
import { updateUserProfile } from "@/lib/firebaseServices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Turns "React, TypeScript, Node.js" into ["React", "TypeScript", "Node.js"] */
function parseSkills(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [skillsOffered, setSkillsOffered] = useState("");
  const [skillsWanted, setSkillsWanted]   = useState("");
  const [bio, setBio]                     = useState("");
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!user?._id) return;
    setError(null);
    setSaving(true);

    try {
      await updateUserProfile(user._id, {
        skillsOffered: parseSkills(skillsOffered),
        skillsWanted:  parseSkills(skillsWanted),
        bio:           bio.trim(),
      });
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user, skillsOffered, skillsWanted, bio, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-16">
      <div className="w-full max-w-lg animate-fade-up">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
            <Icon name="person_edit" filled className="text-3xl text-on-primary-container" />
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-on-surface">
            Complete your profile
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Help others discover you. You can always update this later.
          </p>
          {user?.name && (
            <p className="mt-1 text-xs font-semibold text-primary">
              Welcome, {user.name} 👋
            </p>
          )}
        </div>

        {/* Form */}
        <div className="app-card space-y-7">

          {/* Skills Offered */}
          <div className="space-y-2">
            <label
              htmlFor="input-skills-offered"
              className="text-xs font-bold uppercase tracking-widest text-stone-400"
            >
              Skills you can teach
            </label>
            <input
              id="input-skills-offered"
              type="text"
              placeholder="e.g. React, Figma, Python"
              value={skillsOffered}
              onChange={(e) => setSkillsOffered(e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-stone-400">Separate with commas</p>
          </div>

          {/* Skills Wanted */}
          <div className="space-y-2">
            <label
              htmlFor="input-skills-wanted"
              className="text-xs font-bold uppercase tracking-widest text-stone-400"
            >
              Skills you want to learn
            </label>
            <input
              id="input-skills-wanted"
              type="text"
              placeholder="e.g. Piano, Spanish, Photography"
              value={skillsWanted}
              onChange={(e) => setSkillsWanted(e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-stone-400">Separate with commas</p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label
              htmlFor="input-bio"
              className="text-xs font-bold uppercase tracking-widest text-stone-400"
            >
              Short bio
            </label>
            <textarea
              id="input-bio"
              rows={4}
              placeholder="Tell the community a bit about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={400}
              className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-right text-[11px] text-stone-400">
              {bio.length} / 400
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error"
            >
              {error}
            </div>
          )}

          {/* Save */}
          <button
            id="btn-save-profile"
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <Icon name="check_circle" filled className="text-lg" />
                Save & go to dashboard
              </>
            )}
          </button>

          {/* Skip */}
          <button
            id="btn-skip-profile"
            type="button"
            onClick={() => router.replace("/dashboard")}
            disabled={saving}
            className="w-full text-center text-xs text-stone-400 underline underline-offset-2 transition hover:text-stone-600 disabled:pointer-events-none"
          >
            Skip for now
          </button>
        </div>

      </div>
    </main>
  );
}
