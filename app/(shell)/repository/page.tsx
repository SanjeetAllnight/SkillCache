"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";

import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getResources,
  addResource,
  type ApiResource,
} from "@/lib/firebaseServices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTagInput(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}

const PALETTE_BG = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
];
function avatarClass(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return PALETTE_BG[Math.abs(h) % PALETTE_BG.length];
}

// ─── Resource card (inline — no need for image URLs) ─────────────────────────

function ResourceItem({ resource, index }: { resource: ApiResource; index: number }) {
  const isFeatured = index === 0;
  const hasTags    = resource.tags.length > 0;
  const hasLink    = Boolean(resource.fileUrl);

  return (
    <article
      className={`group flex flex-col gap-5 rounded-2xl bg-surface-container-lowest p-6 transition-all duration-300 hover:-translate-y-0.5 editorial-shadow md:p-7 ${
        isFeatured ? "border border-primary/10 bg-primary-container/10 md:col-span-2 xl:col-span-2" : ""
      }`}
    >
      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-2">
        {hasTags ? (
          resource.tags.map((t) => (
            <Tag key={t} className="px-3 py-1 text-xs normal-case tracking-normal">
              {t}
            </Tag>
          ))
        ) : (
          <Tag className="px-3 py-1 text-xs normal-case tracking-normal">Resource</Tag>
        )}
        {isFeatured && (
          <span className="ml-auto rounded-full bg-tertiary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-tertiary">
            Featured
          </span>
        )}
      </div>

      {/* Title + description */}
      <div className="flex-1 space-y-2">
        <h3 className="font-headline text-xl font-bold text-on-background transition-colors group-hover:text-primary md:text-2xl">
          {resource.title}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
          {resource.description}
        </p>
      </div>

      {/* Inline content preview */}
      {resource.content && !resource.fileUrl && (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
          <p className="line-clamp-3 font-mono text-xs leading-relaxed">
            {resource.content}
          </p>
        </div>
      )}

      {/* Footer: author + open link */}
      <div className="flex items-center justify-between gap-4 border-t border-outline-variant/20 pt-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${avatarClass(resource.authorName)}`}>
            {initials(resource.authorName)}
          </div>
          <span className="text-xs font-semibold text-on-surface-variant">
            {resource.authorName}
          </span>
        </div>

        {hasLink && (
          <Link
            href={resource.fileUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold text-primary transition-all hover:gap-2"
          >
            Open <Icon name="open_in_new" className="text-sm" />
          </Link>
        )}
        {resource.content && !hasLink && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            Text Note
          </span>
        )}
      </div>
    </article>
  );
}

// ─── Share Resource Modal ─────────────────────────────────────────────────────

interface ShareModalProps {
  userId: string;
  onClose: () => void;
  onShared: () => void;
}

function ShareModal({ userId, onClose, onShared }: ShareModalProps) {
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [tagsRaw, setTagsRaw]   = useState("");
  const [fileUrl, setFileUrl]   = useState("");
  const [content, setContent]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!title.trim())                      { setError("Title is required."); return; }
    if (!desc.trim())                       { setError("Description is required."); return; }
    if (!fileUrl.trim() && !content.trim()) { setError("Add a link or some content."); return; }

    setSaving(true);
    setError(null);
    try {
      await addResource({
        title:       title.trim(),
        description: desc.trim(),
        tags:        parseTagInput(tagsRaw),
        userId,
        fileUrl:     fileUrl.trim() || undefined,
        content:     content.trim() || undefined,
      });
      onShared();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }, [title, desc, tagsRaw, fileUrl, content, userId, onShared]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 z-50 max-h-[90vh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface">
              Share a Resource
            </h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              Visible to all members of the atelier
            </p>
          </div>
          <button
            id="btn-close-share-modal"
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
            <label htmlFor="resource-title" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Title *
            </label>
            <input
              id="resource-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Intro to TypeScript Generics"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="resource-desc" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Description *
            </label>
            <textarea
              id="resource-desc"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What will members learn or find here?"
              maxLength={300}
              className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-right text-[11px] text-stone-400">{desc.length} / 300</p>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label htmlFor="resource-tags" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Tags
            </label>
            <input
              id="resource-tags"
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="React, TypeScript, Figma…"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-stone-400">Separate with commas</p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-outline-variant/20" />
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Content</span>
            <span className="h-px flex-1 bg-outline-variant/20" />
          </div>

          {/* File / URL */}
          <div className="space-y-1.5">
            <label htmlFor="resource-url" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Link or File URL
            </label>
            <input
              id="resource-url"
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://docs.google.com/…"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-outline-variant/20" />
            <span className="text-xs text-stone-400">or</span>
            <span className="h-px flex-1 bg-outline-variant/20" />
          </div>

          {/* Inline content */}
          <div className="space-y-1.5">
            <label htmlFor="resource-content" className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Inline Text / Notes
            </label>
            <textarea
              id="resource-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste a code snippet, notes, or markdown…"
              className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3 font-mono text-xs text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
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
              id="btn-submit-resource"
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <Icon name="upload" className="text-base" />
              )}
              {saving ? "Sharing…" : "Share Resource"}
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

// ─── Repository Page ──────────────────────────────────────────────────────────

export default function RepositoryPage() {
  const { user } = useAuth();

  const [resources, setResources]   = useState<ApiResource[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [activeTag, setActiveTag]   = useState<string | null>(null);
  const [search, setSearch]         = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getResources();
      setResources(data);
    } catch (err) {
      setError((err as Error).message ?? "Unable to load resources.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Derived tag list ──────────────────────────────────────────────────────
  const allTags = useMemo(
    () => Array.from(new Set(resources.flatMap((r) => r.tags))).slice(0, 8),
    [resources],
  );

  // ── Filtered resources ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = resources;
    if (activeTag) list = list.filter((r) => r.tags.includes(activeTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.authorName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [resources, activeTag, search]);

  return (
    <div className="page-shell page-stack">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="section-stack max-w-4xl">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1 space-y-3">
            <h1 className="font-headline text-5xl font-extrabold leading-tight tracking-tighter text-on-background md:text-[3.5rem]">
              Curated Knowledge <br />
              for the{" "}
              <span className="italic text-primary">Digital Craft</span>.
            </h1>
            <p className="max-w-2xl text-lg text-on-surface-variant">
              Resources shared by real members of the atelier — links, notes,
              snippets, and guides for every craft.
            </p>
          </div>

          {user && (
            <button
              id="btn-share-resource"
              type="button"
              onClick={() => setShowModal(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg transition hover:opacity-90"
            >
              <Icon name="upload" className="text-base" />
              Share Resource
            </button>
          )}
        </div>
      </section>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="repo-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources…"
              className="rounded-full border border-outline-variant/30 bg-surface-container py-2 pl-9 pr-4 text-sm text-on-surface placeholder-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* All pill */}
          <button
            id="filter-all"
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              activeTag === null
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            All
          </button>

          {/* Tag pills — derived from live Firestore data */}
          {allTags.map((tag) => (
            <button
              key={tag}
              id={`filter-${tag.toLowerCase().replace(/\s+/g, "-")}`}
              type="button"
              onClick={() => setActiveTag((cur) => (cur === tag ? null : tag))}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                activeTag === tag
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <p className="text-sm font-medium text-stone-400">
          {isLoading ? "Loading…" : `${filtered.length} resource${filtered.length !== 1 ? "s" : ""}`}
        </p>
      </section>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={`h-[260px] w-full ${i === 0 ? "md:col-span-2 xl:col-span-2" : ""}`} />
            ))
          : filtered.length === 0
            ? (
              <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center">
                <Icon name="folder_open" className="text-5xl text-stone-300" />
                <p className="text-lg font-semibold text-on-surface">
                  {activeTag || search
                    ? "No resources match your filter."
                    : "No resources yet — be the first to share!"}
                </p>
                {(activeTag || search) && (
                  <button
                    type="button"
                    onClick={() => { setActiveTag(null); setSearch(""); }}
                    className="text-sm font-semibold text-primary underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
                {user && !activeTag && !search && (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition hover:opacity-90"
                  >
                    Share the first resource
                  </button>
                )}
              </div>
            )
            : filtered.map((resource, i) => (
                <ResourceItem key={resource._id} resource={resource} index={i} />
              ))}
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-4 text-xs font-medium text-stone-400">
          <span className="h-px flex-1 bg-outline-variant/20" />
          {resources.length} resource{resources.length !== 1 ? "s" : ""} · synced from Firestore
          <span className="h-px flex-1 bg-outline-variant/20" />
        </div>
      )}

      {/* ── Share modal ────────────────────────────────────────────────── */}
      {showModal && user && (
        <ShareModal
          userId={user._id}
          onClose={() => setShowModal(false)}
          onShared={() => { setShowModal(false); void load(); }}
        />
      )}
    </div>
  );
}
