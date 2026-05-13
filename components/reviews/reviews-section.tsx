"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating, StarBadge } from "@/components/reviews/star-rating";
import { ReviewModal } from "@/components/reviews/review-modal";
import { ToastPortal, pushToast } from "@/components/skills/toast";
import type { ToastData } from "@/components/skills/toast";
import {
  listenReviewsForMentor,
  hasUserReviewedMentor,
  type ApiReview,
  type MentorRatingMeta,
} from "@/lib/firebaseServices";
import type { BackendUser } from "@/lib/mockUser";
import { cn } from "@/lib/utils";

type ReviewsSectionProps = {
  mentor: BackendUser;
  /** Currently logged-in user. Null if not authenticated. */
  viewer: BackendUser | null;
  /** Whether the viewer is the profile owner (to hide the "Write a review" button). */
  isOwnProfile: boolean;
  /** Pre-fetched rating meta from the user document (fast initial render). */
  initialMeta?: MentorRatingMeta;
};

// ─── Review card ─────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarTone(name: string) {
  const tones = [
    "bg-primary-container text-on-primary-container",
    "bg-secondary-container text-on-secondary-container",
    "bg-tertiary-container text-on-tertiary-container",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return tones[Math.abs(h) % tones.length];
}

function formatDate(millis: number) {
  if (!millis) return "Recently";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(millis),
  );
}

function ReviewCard({ review, isNew }: { review: ApiReview; isNew?: boolean }) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-editorial transition duration-300",
        isNew && "ring-2 ring-primary/30 animate-in fade-in slide-in-from-bottom-3",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-headline text-sm font-black",
              avatarTone(review.reviewerName),
            )}
          >
            {initials(review.reviewerName)}
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">{review.reviewerName}</p>
            <p className="text-[11px] text-stone-400">{formatDate(review.createdAtMillis)}</p>
          </div>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{review.reviewText}</p>
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewsSection({
  mentor,
  viewer,
  isOwnProfile,
  initialMeta,
}: ReviewsSectionProps) {
  const [reviews, setReviews]           = useState<ApiReview[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [newReviewId, setNewReviewId]   = useState<string | null>(null);
  const [toasts, setToasts]             = useState<ToastData[]>([]);
  const [showAll, setShowAll]           = useState(false);
  const listenerRef = useRef<(() => void) | null>(null);

  // Live reviews listener
  useEffect(() => {
    if (!mentor._id) return;
    setLoading(true);

    listenerRef.current = listenReviewsForMentor(
      mentor._id,
      (incoming) => {
        setReviews(incoming);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => listenerRef.current?.();
  }, [mentor._id]);

  // Check if the viewer has already reviewed this mentor
  useEffect(() => {
    if (!viewer?._id || isOwnProfile) return;
    hasUserReviewedMentor(mentor._id, viewer._id)
      .then(setAlreadyReviewed)
      .catch(() => undefined);
  }, [mentor._id, viewer?._id, isOwnProfile]);

  // Derive live averageRating from the reviews array (or fall back to initialMeta)
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? parseFloat(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1),
        )
      : (initialMeta?.averageRating ?? 0);

  const handleSubmitted = useCallback(
    (review: ApiReview) => {
      setModalOpen(false);
      setAlreadyReviewed(true);
      setNewReviewId(review._id);
      setToasts((prev) => pushToast(prev, "Review submitted — thank you! 🎉"));
      // Listener will pick up the new doc automatically; optimistically prepend
      setReviews((prev) => {
        const exists = prev.some((r) => r._id === review._id);
        return exists ? prev : [review, ...prev];
      });
      // Remove "new" highlight after 3 s
      setTimeout(() => setNewReviewId(null), 3000);
    },
    [],
  );

  const canReview = !isOwnProfile && !!viewer && !alreadyReviewed;
  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: totalReviews > 0 ? (reviews.filter((r) => r.rating === star).length / totalReviews) * 100 : 0,
  }));

  return (
    <>
      <ReviewModal
        isOpen={modalOpen}
        mentor={mentor}
        reviewer={viewer!}
        onClose={() => setModalOpen(false)}
        onSubmitted={handleSubmitted}
      />

      <ToastPortal
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      <section className="section-stack">
        {/* ── Section header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Reviews
            </h2>
            {totalReviews > 0 && (
              <StarBadge
                rating={averageRating}
                totalReviews={totalReviews}
                size="md"
                className="mt-2"
              />
            )}
          </div>

          {canReview && (
            <button
              id="btn-write-review"
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-editorial transition hover:opacity-90"
            >
              <Icon name="rate_review" className="text-base" />
              Write a Review
            </button>
          )}

          {alreadyReviewed && !isOwnProfile && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Icon name="check_circle" filled className="text-sm" />
              You reviewed this mentor
            </div>
          )}
        </div>

        {/* ── Rating summary (when there are reviews) ── */}
        {totalReviews >= 2 && (
          <div className="grid gap-4 rounded-2xl bg-surface-container p-5 sm:grid-cols-[auto_1fr]">
            {/* Big number */}
            <div className="flex flex-col items-center justify-center gap-1 pr-4 text-center sm:border-r sm:border-outline-variant/20">
              <p className="font-headline text-5xl font-black text-on-surface">
                {averageRating.toFixed(1)}
              </p>
              <StarRating value={averageRating} size="sm" />
              <p className="text-xs text-stone-400">{totalReviews} reviews</p>
            </div>
            {/* Distribution bars */}
            <div className="flex flex-col justify-center gap-1.5">
              {distribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 shrink-0 text-right font-bold text-stone-500">{star}</span>
                  <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-4 shrink-0 text-stone-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reviews list ── */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/30 p-8 text-center">
            <span className="material-symbols-outlined mb-2 text-4xl text-stone-300">
              rate_review
            </span>
            <p className="text-sm text-stone-400">
              {isOwnProfile
                ? "No reviews yet — complete sessions to earn your first rating."
                : `Be the first to review ${mentor.name.split(" ")[0]}!`}
            </p>
            {canReview && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-on-primary transition hover:opacity-90"
              >
                <Icon name="rate_review" className="text-base" />
                Write the First Review
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {displayedReviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                isNew={review._id === newReviewId}
              />
            ))}
          </div>
        )}

        {/* Show more / less */}
        {reviews.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:opacity-75"
          >
            <Icon name={showAll ? "expand_less" : "expand_more"} className="text-base" />
            {showAll ? "Show fewer reviews" : `Show all ${reviews.length} reviews`}
          </button>
        )}
      </section>
    </>
  );
}
