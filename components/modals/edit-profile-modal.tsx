"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { BackendUser } from "@/lib/mockUser";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BackendUser;
  onSave: (data: Partial<BackendUser>) => Promise<void>;
}

function SkillsInput({
  label,
  skills,
  onChange,
}: {
  label: string;
  skills: string[];
  onChange: (s: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    const val = input.trim();
    if (!val) return;
    if (skills.some((s) => s.toLowerCase() === val.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...skills, val]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-on-surface">{label}</label>
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1 text-sm font-medium text-on-surface"
          >
            {s}
            <button
              type="button"
              onClick={() => onChange(skills.filter((x) => x !== s))}
              className="ml-1 text-stone-400 hover:text-error"
            >
              <Icon name="close" className="text-xs" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Type and press Enter to add..."
          className="flex-1 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(profile.name || "");
  const [avatar, setAvatar] = useState(profile.avatar || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [contactEmail, setContactEmail] = useState(profile.contactEmail || profile.email || "");
  const [skillsOffered, setSkillsOffered] = useState<string[]>(profile.skillsOffered || []);
  const [skillsWanted, setSkillsWanted] = useState<string[]>(profile.skillsWanted || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name || "");
      setAvatar(profile.avatar || "");
      setBio(profile.bio || "");
      setContactEmail(profile.contactEmail || profile.email || "");
      setSkillsOffered(profile.skillsOffered || []);
      setSkillsWanted(profile.skillsWanted || []);
      setError(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        avatar: avatar.trim(),
        bio: bio.trim(),
        contactEmail: contactEmail.trim(),
        skillsOffered,
        skillsWanted,
      });
      // Modal closes automatically on success in the parent component
    } catch (err) {
      setError((err as Error).message || "Failed to save profile.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <h2 className="font-headline text-xl font-bold text-on-surface">Edit Profile</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-stone-400 hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-error/10 p-4 text-sm text-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-bold text-on-surface">
                Display Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-avatar" className="text-sm font-bold text-on-surface">
                Profile Picture URL
              </label>
              <input
                id="edit-avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-bio" className="text-sm font-bold text-on-surface">
                Bio / About
              </label>
              <textarea
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={400}
                rows={4}
                className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-contact-email" className="text-sm font-bold text-on-surface">
                Contact Email
              </label>
              <input
                id="edit-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-stone-400">
                This will be displayed on your public profile. It does not change your login email.
              </p>
            </div>

            <SkillsInput label="Skills I Can Teach" skills={skillsOffered} onChange={setSkillsOffered} />
            
            <SkillsInput label="Skills I Want to Learn" skills={skillsWanted} onChange={setSkillsWanted} />

          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant/30 px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
