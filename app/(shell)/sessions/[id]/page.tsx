"use client";


import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import { useAuth } from "@/components/providers/auth-provider";
import { KnowledgeResourceCard } from "@/components/repository/knowledge-resource-card";
import { RepositoryEmptyState } from "@/components/repository/repository-empty-state";
import { ResourceComposer } from "@/components/repository/resource-composer";
import { SessionRequestModal } from "@/components/sessions/session-request-modal";
import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import {
  acceptSession,
  canJoinSession,
  cancelSession,
  getSessionTimeLabel,
  listenSessionById,
  syncSessionLifecycle,
  type ApiSession,
} from "@/lib/firebaseServices";
import { formatSessionDateParts } from "@/lib/view-models";
import {
  deleteKnowledgeResource,
  getViewerResourceState,
  listSessionResources,
  toggleResourceBookmark,
  toggleResourceLike,
  trackResourceDownload,
  type KnowledgeResource,
  type ResourceViewerState,
} from "@/lib/repository";

function getJoinLabel(session: ApiSession, isMentor: boolean, canJoin: boolean) {
  if (session.status === "completed") return "Session History";
  if (session.status === "cancelled") return "Request Cancelled";
  if (session.status === "missed") return "Session Missed";
  if (session.status === "pending") return isMentor ? "Review Request" : "Awaiting Mentor";
  if (session.status === "live") return "Join Live Session";
  if (canJoin) return isMentor ? "Start Session" : "Join Session";
  return "Join Opens Near Start";
}

function SessionResourcesPanel({ session }: { session: ApiSession }) {
  const router = useRouter();
  const { user } = useAuth();
  const [resources, setResources] = useState<KnowledgeResource[]>([]);
  const [interactionState, setInteractionState] = useState<ResourceViewerState>({
    likedResourceIds: new Set(),
    bookmarkedResourceIds: new Set(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<KnowledgeResource | null>(null);
  const [pendingResourceId, setPendingResourceId] = useState<string | null>(null);

  const participantIds = [session.mentor?._id, session.learner?._id].filter(Boolean) as string[];

  const loadResources = useCallback(async () => {
    if (!user?._id) {
      setResources([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextResources = await listSessionResources(session._id, user._id);
      setResources(nextResources);
      const nextState = await getViewerResourceState(
        nextResources.map((resource) => resource.id),
        user._id,
      );
      setInteractionState(nextState);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load session resources.");
    } finally {
      setIsLoading(false);
    }
  }, [session._id, user?._id]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

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
    if (!user?._id) return;

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
    if (!user?._id) return;

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
    } catch (bookmarkError) {
      setError(bookmarkError instanceof Error ? bookmarkError.message : "Could not update saved resources.");
    } finally {
      setPendingResourceId(null);
    }
  }, [updateResourceCount, user?._id]);

  const handleOpen = useCallback(async (resource: KnowledgeResource) => {
    const target = resource.fileUrl ?? resource.externalUrl;
    if (!target) {
      router.push(`/repository/${resource.id}`);
      return;
    }

    try {
      await trackResourceDownload(resource.id);
      updateResourceCount(resource.id, "downloadsCount", 1);
    } catch {
      // Non-blocking.
    }

    window.open(target, "_blank", "noopener,noreferrer");
  }, [router, updateResourceCount]);

  const handleDelete = useCallback(async (resource: KnowledgeResource) => {
    if (!user?._id) return;
    const confirmed = window.confirm(`Delete "${resource.title}" from this session?`);
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

  const handleSaved = useCallback(() => {
    setComposerOpen(false);
    setEditingResource(null);
    void loadResources();
  }, [loadResources]);

  return (
    <section className="app-card-soft">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Session Knowledge</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Notes, files, links, and takeaways attached to this mentorship exchange.
          </p>
        </div>
        {user ? (
          <button
            type="button"
            onClick={() => {
              setEditingResource(null);
              setComposerOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:opacity-90"
          >
            <Icon name="add_circle" filled className="text-base" />
            Attach Resource
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mb-5 rounded-lg bg-error/10 px-4 py-3 text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-[300px] w-full" />
          ))
        ) : resources.length === 0 ? (
          <RepositoryEmptyState
            title="No session resources yet"
            description="Capture the useful parts of this exchange as shared notes, links, snippets, PDFs, or follow-up material."
            actionLabel={user ? "Attach Resource" : undefined}
            icon="hub"
            onAction={user ? () => setComposerOpen(true) : undefined}
          />
        ) : (
          resources.map((resource) => (
            <KnowledgeResourceCard
              key={resource.id}
              resource={resource}
              liked={interactionState.likedResourceIds.has(resource.id)}
              bookmarked={interactionState.bookmarkedResourceIds.has(resource.id)}
              pending={pendingResourceId === resource.id}
              compact
              canManage={resource.uploaderId === user?._id}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onOpen={handleOpen}
              onEdit={(nextResource) => {
                setEditingResource(nextResource);
                setComposerOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {composerOpen && user ? (
        <ResourceComposer
          open={composerOpen}
          currentUser={user}
          initialResource={editingResource}
          sessionContext={{
            sessionId: session._id,
            sessionTitle: session.title,
            participantIds,
          }}
          onClose={() => {
            setComposerOpen(false);
            setEditingResource(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}
    </section>
  );
}

export default function SessionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthReady } = useAuth();
  const [session, setSession] = useState<ApiSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !params.id) return;
    if (!user?._id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = listenSessionById(
      params.id,
      (nextSession) => {
        if (!nextSession) {
          setSession(null);
          setError("Session not found.");
          setIsLoading(false);
          return;
        }

        const isParticipant =
          nextSession.mentorId === user._id || nextSession.learnerId === user._id;

        if (!isParticipant) {
          setSession(null);
          setError("Only session participants can view this exchange.");
          setIsLoading(false);
          return;
        }

        setSession(nextSession);
        setError(null);
        setIsLoading(false);
        void syncSessionLifecycle(nextSession);
      },
      (listenError) => {
        setError(listenError.message || "Unable to load this session.");
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isAuthReady, params.id, user?._id]);

  const handleAccept = useCallback(async () => {
    if (!session) return;
    setPendingAction("accept");
    try {
      await acceptSession(session._id);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to accept this session.");
    } finally {
      setPendingAction(null);
    }
  }, [session]);

  const handleReject = useCallback(async () => {
    if (!session || !user?._id) return;
    const confirmed = window.confirm(`Reject "${session.title}"?`);
    if (!confirmed) return;

    setPendingAction("reject");
    try {
      await cancelSession(session._id, user._id, "Request rejected by mentor");
      router.push("/sessions");
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Unable to reject this session.");
    } finally {
      setPendingAction(null);
    }
  }, [router, session, user?._id]);

  if (isLoading) {
    return (
      <div className="page-shell page-stack">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-full max-w-3xl" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="grid gap-8 xl:grid-cols-12">
          <div className="space-y-8 xl:col-span-8">
            <Skeleton className="h-[320px] w-full" />
            <Skeleton className="h-[220px] w-full" />
          </div>
          <div className="space-y-8 xl:col-span-4">
            <Skeleton className="h-[240px] w-full" />
            <Skeleton className="h-[180px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="page-shell">
        <div className="rounded-2xl bg-error/10 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-error">
            {error ?? "Session not found."}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Try returning to the sessions list and reopening the exchange.
          </p>
        </div>
      </div>
    );
  }

  const dateParts = formatSessionDateParts(session.date);
  const mentorSkills = session.mentor?.skillsOffered?.length
    ? session.mentor.skillsOffered
    : ["Creative mentorship"];
  const learnerGoals = session.learner?.skillsWanted?.length
    ? session.learner.skillsWanted
    : ["Skill growth"];
  const isMentor = session.mentorId === user?._id;
  const joinable = canJoinSession(session);
  const canReviewRequest = isMentor && session.status === "pending";
  const canReschedule =
    isMentor && ["pending", "accepted", "upcoming"].includes(session.status);
  const canOpenCall =
    session.status === "live" ||
    (joinable && (session.status === "accepted" || session.status === "upcoming"));
  const joinLabel = getJoinLabel(session, isMentor, joinable);

  return (
    <div className="page-shell page-stack">
      <section className="section-stack">
        <nav className="flex gap-2 text-xs uppercase tracking-widest text-stone-500">
          <span>Sessions</span>
          <span>/</span>
          <span className="font-bold text-primary">Details</span>
        </nav>

        <div className="flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div className="section-stack">
            <h1 className="font-headline text-4xl font-extrabold leading-[1.1] tracking-tighter text-on-background md:text-5xl">
              {session.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Tag className="px-4 py-1 text-xs">{mentorSkills[0]}</Tag>
              <span className="text-sm text-stone-500">
                {dateParts.fullDate} at {dateParts.time}
              </span>
            </div>
          </div>

          <div className="space-y-3 xl:text-right">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <SessionStatusBadge status={session.status} callStatus={session.callStatus} />
              <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
                {getSessionTimeLabel(session)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {canReviewRequest ? (
                <>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={pendingAction === "accept"}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:opacity-60"
                  >
                    <Icon name="check" className="text-base" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={pendingAction === "reject"}
                    className="inline-flex items-center gap-2 rounded-xl bg-error/10 px-5 py-3 text-sm font-bold text-error transition hover:bg-error/15 disabled:opacity-60"
                  >
                    <Icon name="close" className="text-base" />
                    Reject
                  </button>
                </>
              ) : null}
              {canReschedule ? (
                <button
                  type="button"
                  onClick={() => setShowReschedule(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-surface-container px-5 py-3 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-high"
                >
                  <Icon name="edit_calendar" className="text-base" />
                  Reschedule
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (session.status === "completed" || session.status === "cancelled" || session.status === "missed") {
                    return;
                  }
                  if (canOpenCall) router.push(`/call/${session._id}`);
                }}
                disabled={!canOpenCall}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Icon name={session.status === "live" ? "login" : "video_call"} className="text-base" />
                {joinLabel}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-12">
        <div className="min-w-0 space-y-8 xl:col-span-8">
          <section className="app-card">
            <div className="grid gap-8 md:grid-cols-2 md:gap-12">
              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Mentor
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container font-headline text-2xl font-bold text-on-primary-container">
                    {(session.mentor?.name ?? "M")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-on-background">
                      {session.mentor?.name ?? "Unknown Mentor"}
                    </p>
                    <p className="text-sm text-stone-500">
                      {mentorSkills.join(" • ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Schedule
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-surface-container text-primary">
                    <span className="text-xs font-bold uppercase">{dateParts.month}</span>
                    <span className="text-2xl font-black">{dateParts.day}</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-on-background">
                      {dateParts.fullDate}
                    </p>
                    <p className="text-sm text-stone-500">{dateParts.time}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-outline-variant/20 pt-10 md:mt-12 md:pt-12">
              <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-stone-400">
                Session Focus
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">
                    01
                  </span>
                  <p className="leading-relaxed text-on-background">
                    Mentor sharing expertise in {mentorSkills.join(", ")}.
                  </p>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">
                    02
                  </span>
                  <p className="leading-relaxed text-on-background">
                    Learner goals centered on {learnerGoals.join(", ")}.
                  </p>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/30 text-xs font-bold text-primary">
                    03
                  </span>
                  <p className="leading-relaxed text-on-background">
                    Status update: this exchange is currently marked as {session.status}.
                  </p>
                </li>
              </ul>
            </div>
          </section>

          <SessionResourcesPanel session={session} />
        </div>

        <aside className="space-y-8 xl:col-span-4">
          <section className="relative overflow-hidden rounded-2xl bg-on-background p-6 text-white md:p-8">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">
              Connection Details
            </h2>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <Icon name="person" className="text-primary-container" />
                <span className="text-sm">{session.mentor?.email ?? "Mentor contact available after join"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="schedule" className="text-primary-container" />
                <span className="text-sm">{dateParts.fullDate} • {dateParts.time}</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon name="info" className="text-primary-container" />
                <span className="text-sm">Session status: {session.status}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-surface-container p-6 md:p-8">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-stone-400">
              Participants
            </h2>
            <div className="space-y-4">
              {[session.mentor, session.learner].filter(Boolean).map((participant) => (
                <div key={participant._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container font-bold text-xs text-on-primary-container">
                      {participant.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold">{participant.name}</span>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {showReschedule && user ? (
        <SessionRequestModal
          currentUser={user}
          mode="reschedule"
          session={session}
          onClose={() => setShowReschedule(false)}
          onSaved={() => setShowReschedule(false)}
        />
      ) : null}
    </div>
  );
}
