"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { KnowledgeResourceCard } from "@/components/repository/knowledge-resource-card";
import { RepositoryEmptyState } from "@/components/repository/repository-empty-state";
import { ResourceComposer } from "@/components/repository/resource-composer";
import { useAuth } from "@/components/providers/auth-provider";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteKnowledgeResource,
  filterResourcesLocally,
  getViewerResourceState,
  listRepositoryResources,
  listSavedResources,
  toggleResourceBookmark,
  toggleResourceLike,
  trackResourceDownload,
  type KnowledgeResource,
  type ResourcePageCursor,
  type ResourceType,
  type ResourceViewerState,
} from "@/lib/repository";
import { cn } from "@/lib/utils";

type RepositoryView = "community" | "mine" | "saved";
type SortKey = "latest" | "most-liked" | "most-saved" | "most-used";

const pageSize = 15;

const viewTabs: Array<{ value: RepositoryView; label: string; icon: string }> = [
  { value: "community", label: "Community", icon: "groups" },
  { value: "mine", label: "My Contributions", icon: "inventory_2" },
  { value: "saved", label: "Saved Resources", icon: "bookmark" },
];

const typeFilters: Array<{ value: ResourceType | "all"; label: string; icon: string }> = [
  { value: "all", label: "All Types", icon: "auto_stories" },
  { value: "pdf", label: "PDFs", icon: "picture_as_pdf" },
  { value: "rich-text", label: "Notes", icon: "article" },
  { value: "markdown", label: "Markdown", icon: "markdown" },
  { value: "code", label: "Code", icon: "data_object" },
  { value: "link", label: "Links", icon: "link" },
  { value: "image", label: "Images", icon: "image" },
  { value: "file", label: "Files", icon: "attach_file" },
];

function sortResources(resources: KnowledgeResource[], sort: SortKey) {
  return [...resources].sort((a, b) => {
    if (sort === "most-liked") return b.likesCount - a.likesCount;
    if (sort === "most-saved") return b.bookmarksCount - a.bookmarksCount;
    if (sort === "most-used") return b.downloadsCount - a.downloadsCount;
    return b.createdAtMillis - a.createdAtMillis;
  });
}

function emptyStateFor(view: RepositoryView, hasFilters: boolean) {
  if (hasFilters) {
    return {
      title: "No matching resources",
      description: "Try a broader search, clear the tag filter, or switch to another library view.",
      icon: "manage_search",
    };
  }

  if (view === "mine") {
    return {
      title: "Your contribution library is waiting",
      description: "Share notes, snippets, links, or files from your learning sessions so others can build on them.",
      actionLabel: "Share Resource",
      icon: "inventory_2",
    };
  }

  if (view === "saved") {
    return {
      title: "Nothing saved yet",
      description: "Bookmark useful learning resources and they will collect here for later review.",
      icon: "bookmark",
    };
  }

  return {
    title: "No learning resources yet",
    description: "Start the shared library with a note, link, snippet, PDF, or session takeaway.",
    actionLabel: "Share Resource",
    icon: "auto_stories",
  };
}

export default function RepositoryPage() {
  const router = useRouter();
  const { user, isAuthReady } = useAuth();

  const [view, setView] = useState<RepositoryView>("community");
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [cursor, setCursor] = useState<ResourcePageCursor>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState<ResourceViewerState>({
    likedResourceIds: new Set(),
    bookmarkedResourceIds: new Set(),
  });
  const [pendingResourceId, setPendingResourceId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<KnowledgeResource | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ResourceType | "all">("all");
  const [sort, setSort] = useState<SortKey>("latest");

  const refreshInteractions = useCallback(async (items: KnowledgeResource[]) => {
    const state = await getViewerResourceState(
      items.map((resource) => resource.id),
      user?._id,
    );
    setInteractionState(state);
  }, [user?._id]);

  const loadResources = useCallback(async (
    nextView: RepositoryView,
    mode: "replace" | "append" = "replace",
    activeCursor: ResourcePageCursor = null,
  ) => {
    if (!isAuthReady) return;

    if (mode === "replace") {
      setIsLoading(true);
      setCursor(null);
    } else {
      setIsLoadingMore(true);
    }

    setError(null);

    try {
      let nextResources: KnowledgeResource[] = [];
      let nextCursor: ResourcePageCursor = null;
      let nextHasMore = false;

      if (nextView === "saved") {
        nextResources = user?._id ? await listSavedResources(user._id) : [];
      } else {
        const page = await listRepositoryResources({
          scope: nextView === "mine" ? "mine" : "community",
          userId: user?._id,
          pageSize,
          cursor: mode === "append" ? activeCursor : null,
        });
        nextResources = page.resources;
        nextCursor = page.cursor;
        nextHasMore = page.hasMore;
      }

      setResources((current) => {
        if (mode === "append") {
          const merged = new Map(current.map((resource) => [resource.id, resource]));
          nextResources.forEach((resource) => merged.set(resource.id, resource));
          const values = Array.from(merged.values());
          void refreshInteractions(values);
          return values;
        }

        void refreshInteractions(nextResources);
        return nextResources;
      });
      setCursor(nextCursor);
      setHasMore(nextHasMore);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the Knowledge Hub right now.",
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isAuthReady, refreshInteractions, user?._id]);

  useEffect(() => {
    if (!isAuthReady) return;
    void loadResources(view);
  }, [isAuthReady, view, loadResources]);

  const allTags = useMemo(
    () =>
      Array.from(new Set(resources.flatMap((resource) => resource.tags)))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 14),
    [resources],
  );

  const filteredResources = useMemo(() => {
    const locallyFiltered = filterResourcesLocally(resources, search, activeTag).filter(
      (resource) => activeType === "all" || resource.type === activeType,
    );
    return sortResources(locallyFiltered, sort);
  }, [activeTag, activeType, resources, search, sort]);

  const hasFilters = Boolean(search.trim() || activeTag || activeType !== "all");
  const emptyState = emptyStateFor(view, hasFilters);

  const stats = useMemo(() => {
    const notes = resources.filter((resource) =>
      ["markdown", "rich-text", "code"].includes(resource.type),
    ).length;
    const sessionLinked = resources.filter((resource) => Boolean(resource.sessionId)).length;
    const saved = interactionState.bookmarkedResourceIds.size;

    return [
      { label: "Learning Resources", value: resources.length, icon: "auto_stories" },
      { label: "Notes and Snippets", value: notes, icon: "article" },
      { label: "Session Linked", value: sessionLinked, icon: "hub" },
      { label: "Saved Here", value: saved, icon: "bookmark" },
    ];
  }, [interactionState.bookmarkedResourceIds.size, resources]);

  const handleOpenComposer = useCallback((resource?: KnowledgeResource) => {
    setEditingResource(resource ?? null);
    setComposerOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setComposerOpen(false);
    setEditingResource(null);
    void loadResources(view);
  }, [loadResources, view]);

  const updateResourceCount = useCallback((resourceId: string, field: "likesCount" | "bookmarksCount" | "downloadsCount", delta: number) => {
    setResources((current) =>
      current.map((resource) =>
        resource.id === resourceId
          ? { ...resource, [field]: Math.max(0, resource[field] + delta) }
          : resource,
      ),
    );
  }, []);

  const handleLike = useCallback(async (resource: KnowledgeResource) => {
    if (!user?._id) {
      setError("Sign in to like learning resources.");
      return;
    }

    setPendingResourceId(resource.id);
    try {
      const isLiked = await toggleResourceLike(resource.id, user._id);
      setInteractionState((current) => {
        const likedResourceIds = new Set(current.likedResourceIds);
        if (isLiked) likedResourceIds.add(resource.id);
        else likedResourceIds.delete(resource.id);
        return { ...current, likedResourceIds };
      });
      updateResourceCount(resource.id, "likesCount", isLiked ? 1 : -1);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : "Could not update the like.");
    } finally {
      setPendingResourceId(null);
    }
  }, [updateResourceCount, user?._id]);

  const handleBookmark = useCallback(async (resource: KnowledgeResource) => {
    if (!user?._id) {
      setError("Sign in to save learning resources.");
      return;
    }

    setPendingResourceId(resource.id);
    try {
      const isBookmarked = await toggleResourceBookmark(resource.id, user._id);
      setInteractionState((current) => {
        const bookmarkedResourceIds = new Set(current.bookmarkedResourceIds);
        if (isBookmarked) bookmarkedResourceIds.add(resource.id);
        else bookmarkedResourceIds.delete(resource.id);
        return { ...current, bookmarkedResourceIds };
      });
      updateResourceCount(resource.id, "bookmarksCount", isBookmarked ? 1 : -1);
      if (!isBookmarked && view === "saved") {
        setResources((current) => current.filter((item) => item.id !== resource.id));
      }
    } catch (bookmarkError) {
      setError(bookmarkError instanceof Error ? bookmarkError.message : "Could not update saved resources.");
    } finally {
      setPendingResourceId(null);
    }
  }, [updateResourceCount, user?._id, view]);

  const handleOpenResource = useCallback(async (resource: KnowledgeResource) => {
    const target = resource.fileUrl ?? resource.externalUrl;
    if (!target) {
      router.push(`/repository/${resource.id}`);
      return;
    }

    try {
      await trackResourceDownload(resource.id);
      updateResourceCount(resource.id, "downloadsCount", 1);
    } catch {
      // Non-blocking. Opening the resource matters more than the counter.
    }

    window.open(target, "_blank", "noopener,noreferrer");
  }, [router, updateResourceCount]);

  const handleDelete = useCallback(async (resource: KnowledgeResource) => {
    if (!user?._id) return;
    const confirmed = window.confirm(`Delete "${resource.title}" from the Knowledge Hub?`);
    if (!confirmed) return;

    setPendingResourceId(resource.id);
    try {
      await deleteKnowledgeResource(resource, user._id);
      setResources((current) => current.filter((item) => item.id !== resource.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this resource.");
    } finally {
      setPendingResourceId(null);
    }
  }, [user?._id]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setActiveTag(null);
    setActiveType("all");
  }, []);

  return (
    <div className="page-shell page-stack">
      <section className="grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
            <Icon name="hub" className="text-base" />
            Peer Learning Ecosystem
          </div>
          <h1 className="font-headline text-4xl font-black leading-tight tracking-tight text-on-surface md:text-6xl">
            Knowledge Hub for every session, note, and shared breakthrough.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-on-surface-variant">
            Discover community resources, preserve mentorship takeaways, and build a contribution library that grows with the SkillCache network.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-2xl bg-surface-container-lowest p-4 shadow-editorial">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={stat.icon} />
              </div>
              <p className="font-headline text-2xl font-black">{stat.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-stone-500">
                {stat.label}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-editorial md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {viewTabs.map((tab) => {
              const active = tab.value === view;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setView(tab.value);
                    clearFilters();
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition",
                    active
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  <Icon name={tab.icon} filled={active} className="text-base" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleOpenComposer()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-editorial transition hover:opacity-90"
          >
            <Icon name="ios_share" className="text-base" />
            Share Resource
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by topic, skill, contributor, or content"
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-12 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-on-surface"
              >
                <Icon name="close" className="text-base" />
              </button>
            ) : null}
          </label>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="rounded-lg border border-outline-variant/30 bg-surface px-4 py-3 text-sm font-semibold text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="latest">Latest uploads</option>
            <option value="most-liked">Most liked</option>
            <option value="most-saved">Most saved</option>
            <option value="most-used">Most opened</option>
          </select>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {typeFilters.map((filter) => {
            const active = activeType === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveType(filter.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition",
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
                )}
              >
                <Icon name={filter.icon} className="text-base" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {allTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const active = activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold transition",
                    active
                      ? "bg-tertiary text-on-tertiary"
                      : "bg-surface-container text-on-surface-variant hover:bg-tertiary/10 hover:text-tertiary",
                  )}
                >
                  {tag}
                </button>
              );
            })}
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          <Icon name="error" filled className="text-base" />
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[360px] w-full" />
            ))
          : filteredResources.length === 0
            ? (
              <RepositoryEmptyState
                title={emptyState.title}
                description={emptyState.description}
                actionLabel={emptyState.actionLabel}
                icon={emptyState.icon}
                onAction={emptyState.actionLabel ? () => handleOpenComposer() : undefined}
              />
            )
            : filteredResources.map((resource) => (
                <KnowledgeResourceCard
                  key={resource.id}
                  resource={resource}
                  liked={interactionState.likedResourceIds.has(resource.id)}
                  bookmarked={interactionState.bookmarkedResourceIds.has(resource.id)}
                  pending={pendingResourceId === resource.id}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  onOpen={handleOpenResource}
                  onEdit={handleOpenComposer}
                  onDelete={handleDelete}
                  canManage={resource.uploaderId === user?._id}
                />
              ))}
      </section>

      {!isLoading && hasMore && view !== "saved" ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadResources(view, "append", cursor)}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-5 py-3 text-sm font-bold text-on-surface transition hover:bg-surface-container disabled:opacity-60"
          >
            {isLoadingMore ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            ) : (
              <Icon name="expand_more" className="text-base" />
            )}
            {isLoadingMore ? "Loading..." : "Load more resources"}
          </button>
        </div>
      ) : null}

      {composerOpen && user ? (
        <ResourceComposer
          open={composerOpen}
          currentUser={user}
          initialResource={editingResource}
          onClose={() => {
            setComposerOpen(false);
            setEditingResource(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
