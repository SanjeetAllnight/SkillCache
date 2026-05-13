"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { KnowledgeResourceCard } from "@/components/repository/knowledge-resource-card";
import { ResourceComposer } from "@/components/repository/resource-composer";
import { useAuth } from "@/components/providers/auth-provider";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import {
  deleteKnowledgeResource,
  formatResourceFileSize,
  getKnowledgeResource,
  getViewerResourceState,
  toggleResourceBookmark,
  toggleResourceLike,
  trackResourceDownload,
  type KnowledgeResource,
  type ResourceViewerState,
} from "@/lib/repository";

function formatDate(millis: number) {
  if (!millis) return "Recently shared";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(millis));
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ResourcePreview({ resource }: { resource: KnowledgeResource }) {
  if (resource.uploadStatus === "uploading") {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest px-6 py-16 text-center">
        <Icon name="cloud_sync" className="text-5xl text-primary" />
        <p className="mt-4 text-lg font-bold">Resource is still syncing</p>
        <p className="mt-2 text-sm text-on-surface-variant">
          The preview will appear after the file finishes processing.
        </p>
      </div>
    );
  }

  if (resource.type === "image" && resource.fileUrl) {
    return (
      <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-editorial">
        <img
          src={resource.fileUrl}
          alt={resource.title}
          className="max-h-[720px] w-full object-contain"
        />
      </div>
    );
  }

  if (resource.type === "pdf" && resource.fileUrl) {
    return (
      <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-editorial">
        <iframe
          title={resource.title}
          src={resource.fileUrl}
          className="h-[720px] w-full border-0"
        />
      </div>
    );
  }

  if (resource.type === "code" && resource.content) {
    return (
      <pre className="overflow-x-auto rounded-2xl bg-on-background p-6 text-sm leading-relaxed text-inverse-on-surface shadow-editorial">
        <code>{resource.content}</code>
      </pre>
    );
  }

  if (resource.content) {
    return (
      <article className="rounded-2xl bg-surface-container-lowest p-6 leading-relaxed shadow-editorial md:p-8">
        <div className="whitespace-pre-wrap text-on-surface">{resource.content}</div>
      </article>
    );
  }

  if (resource.externalUrl) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-editorial md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="link" />
          </div>
          <div>
            <h2 className="text-lg font-bold">External learning resource</h2>
            <p className="mt-2 break-all text-sm text-on-surface-variant">
              {resource.externalUrl}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest px-6 py-16 text-center">
      <Icon name="draft" className="text-5xl text-stone-300" />
      <p className="mt-4 text-lg font-bold">No preview available</p>
      <p className="mt-2 text-sm text-on-surface-variant">
        Open the attached resource to inspect the original material.
      </p>
    </div>
  );
}

export default function ResourceDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthReady } = useAuth();
  const [resource, setResource] = useState<KnowledgeResource | null>(null);
  const [interactionState, setInteractionState] = useState<ResourceViewerState>({
    likedResourceIds: new Set(),
    bookmarkedResourceIds: new Set(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadResource = useCallback(async () => {
    if (!params.id || !isAuthReady) return;

    setIsLoading(true);
    setError(null);
    try {
      const nextResource = await getKnowledgeResource(params.id);
      setResource(nextResource);
      if (nextResource) {
        const viewerState = await getViewerResourceState([nextResource.id], user?._id);
        setInteractionState(viewerState);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to open this resource.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthReady, params.id, user?._id]);

  useEffect(() => {
    void loadResource();
  }, [loadResource]);

  const updateCount = useCallback((field: "likesCount" | "bookmarksCount" | "downloadsCount", delta: number) => {
    setResource((current) =>
      current ? { ...current, [field]: Math.max(0, current[field] + delta) } : current,
    );
  }, []);

  const handleLike = useCallback(async () => {
    if (!resource || !user?._id) return;

    setPending(true);
    try {
      const isLiked = await toggleResourceLike(resource.id, user._id);
      setInteractionState((current) => {
        const likedResourceIds = new Set(current.likedResourceIds);
        if (isLiked) likedResourceIds.add(resource.id);
        else likedResourceIds.delete(resource.id);
        return { ...current, likedResourceIds };
      });
      updateCount("likesCount", isLiked ? 1 : -1);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : "Could not update the like.");
    } finally {
      setPending(false);
    }
  }, [resource, updateCount, user?._id]);

  const handleBookmark = useCallback(async () => {
    if (!resource || !user?._id) return;

    setPending(true);
    try {
      const isBookmarked = await toggleResourceBookmark(resource.id, user._id);
      setInteractionState((current) => {
        const bookmarkedResourceIds = new Set(current.bookmarkedResourceIds);
        if (isBookmarked) bookmarkedResourceIds.add(resource.id);
        else bookmarkedResourceIds.delete(resource.id);
        return { ...current, bookmarkedResourceIds };
      });
      updateCount("bookmarksCount", isBookmarked ? 1 : -1);
    } catch (bookmarkError) {
      setError(bookmarkError instanceof Error ? bookmarkError.message : "Could not update saved resources.");
    } finally {
      setPending(false);
    }
  }, [resource, updateCount, user?._id]);

  const handleOpen = useCallback(async () => {
    if (!resource) return;
    const target = resource.fileUrl ?? resource.externalUrl;
    if (!target) return;

    try {
      await trackResourceDownload(resource.id);
      updateCount("downloadsCount", 1);
    } catch {
      // Non-blocking.
    }

    window.open(target, "_blank", "noopener,noreferrer");
  }, [resource, updateCount]);

  const handleDelete = useCallback(async () => {
    if (!resource || !user?._id) return;

    const confirmed = window.confirm(`Delete "${resource.title}" from the Knowledge Hub?`);
    if (!confirmed) return;

    setPending(true);
    try {
      await deleteKnowledgeResource(resource, user._id);
      router.replace("/repository");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this resource.");
      setPending(false);
    }
  }, [resource, router, user?._id]);

  if (isLoading) {
    return (
      <div className="page-shell page-stack">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
          <Skeleton className="h-[560px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </div>
    );
  }

  if (error && !resource) {
    return (
      <div className="page-shell">
        <div className="rounded-2xl bg-error/10 px-6 py-12 text-center">
          <Icon name="error" filled className="text-5xl text-error" />
          <h1 className="mt-4 text-xl font-bold text-error">Resource unavailable</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{error}</p>
          <Link
            href="/repository"
            className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary"
          >
            Back to Knowledge Hub
          </Link>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="page-shell">
        <div className="rounded-2xl bg-surface-container-lowest px-6 py-12 text-center shadow-editorial">
          <Icon name="folder_off" className="text-5xl text-stone-300" />
          <h1 className="mt-4 text-xl font-bold">Resource not found</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            It may have been deleted or made private.
          </p>
        </div>
      </div>
    );
  }

  const liked = interactionState.likedResourceIds.has(resource.id);
  const bookmarked = interactionState.bookmarkedResourceIds.has(resource.id);
  const canManage = resource.uploaderId === user?._id;

  return (
    <div className="page-shell page-stack">
      <section className="space-y-6">
        <nav className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest text-stone-500">
          <Link href="/repository" className="text-primary">Knowledge Hub</Link>
          <span>/</span>
          <span>{resource.type}</span>
        </nav>

        <div className="grid gap-8 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Tag className="normal-case tracking-normal">{resource.type}</Tag>
              {resource.visibility !== "public" ? (
                <Tag tone="muted" className="normal-case tracking-normal">
                  {resource.visibility}
                </Tag>
              ) : null}
              {resource.sessionId ? (
                <Tag tone="tertiary" className="normal-case tracking-normal">
                  Session Linked
                </Tag>
              ) : null}
            </div>
            <h1 className="font-headline text-4xl font-black leading-tight tracking-tight text-on-surface md:text-6xl">
              {resource.title}
            </h1>
            <p className="max-w-3xl text-lg leading-relaxed text-on-surface-variant">
              {resource.description}
            </p>
          </div>

          <aside className="rounded-2xl bg-surface-container-lowest p-5 shadow-editorial">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container font-headline text-lg font-black text-on-primary-container">
                {initials(resource.uploaderName) || "SC"}
              </div>
              <div>
                <p className="font-bold">{resource.uploaderName}</p>
                <p className="text-xs text-on-surface-variant">
                  {formatDate(resource.createdAtMillis)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-container px-2 py-3">
                <p className="font-black">{resource.likesCount}</p>
                <p className="text-[11px] font-bold uppercase text-stone-500">Likes</p>
              </div>
              <div className="rounded-lg bg-surface-container px-2 py-3">
                <p className="font-black">{resource.bookmarksCount}</p>
                <p className="text-[11px] font-bold uppercase text-stone-500">Saves</p>
              </div>
              <div className="rounded-lg bg-surface-container px-2 py-3">
                <p className="font-black">{resource.downloadsCount}</p>
                <p className="text-[11px] font-bold uppercase text-stone-500">Opens</p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleLike}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-tertiary/10 px-3 py-3 text-sm font-bold text-tertiary transition hover:bg-tertiary/15 disabled:opacity-60"
              >
                <Icon name="favorite" filled={liked} className="text-base" />
                {liked ? "Liked" : "Like"}
              </button>
              <button
                type="button"
                onClick={handleBookmark}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-3 text-sm font-bold text-primary transition hover:bg-primary/15 disabled:opacity-60"
              >
                <Icon name="bookmark" filled={bookmarked} className="text-base" />
                {bookmarked ? "Saved" : "Save"}
              </button>
            </div>

            {resource.fileUrl || resource.externalUrl ? (
              <button
                type="button"
                onClick={handleOpen}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary transition hover:opacity-90"
              >
                <Icon name={resource.fileUrl ? "download" : "open_in_new"} className="text-base" />
                {resource.fileUrl ? "Open Download" : "Open Resource"}
              </button>
            ) : null}

            {canManage ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="rounded-lg bg-surface-container px-3 py-2 text-xs font-bold text-on-surface-variant transition hover:bg-surface-container-high"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="rounded-lg bg-error/10 px-3 py-2 text-xs font-bold text-error transition hover:bg-error/15 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          {error}
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <main className="min-w-0 space-y-6">
          <ResourcePreview resource={resource} />
        </main>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-editorial">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">
              Resource Metadata
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">Visibility</dt>
                <dd className="font-bold capitalize">{resource.visibility}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">Type</dt>
                <dd className="font-bold">{resource.type}</dd>
              </div>
              {resource.fileName ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">File</dt>
                  <dd className="max-w-[160px] truncate text-right font-bold">
                    {resource.fileName}
                  </dd>
                </div>
              ) : null}
              {resource.fileSize ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Size</dt>
                  <dd className="font-bold">{formatResourceFileSize(resource.fileSize)}</dd>
                </div>
              ) : null}
              {resource.sessionId ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-on-surface-variant">Session</dt>
                  <dd>
                    <Link href={`/sessions/${resource.sessionId}`} className="font-bold text-primary">
                      Open
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {resource.tags.length > 0 ? (
            <section className="rounded-2xl bg-surface-container p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">
                Skill Tags
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-on-surface-variant"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <KnowledgeResourceCard
            resource={resource}
            liked={liked}
            bookmarked={bookmarked}
            compact
            onLike={() => void handleLike()}
            onBookmark={() => void handleBookmark()}
            onOpen={() => void handleOpen()}
            canManage={false}
          />
        </aside>
      </div>

      {composerOpen && user ? (
        <ResourceComposer
          open={composerOpen}
          currentUser={user}
          initialResource={resource}
          onClose={() => setComposerOpen(false)}
          onSaved={() => {
            setComposerOpen(false);
            void loadResource();
          }}
        />
      ) : null}
    </div>
  );
}
