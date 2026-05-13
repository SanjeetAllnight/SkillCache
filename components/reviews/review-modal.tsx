"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { StarRating } from "@/components/reviews/star-rating";
import { submitReview } from "@/lib/firebaseServices";
import type { ApiReview } from "@/lib/firebaseServices";
import type { BackendUser } from "@/lib/mockUser";
import { cn } from "@/lib/utils";

type ReviewModalProps = {
  isOpen: boolean;
  mentor: BackendUser;
  reviewer: BackendUser;
  sessionId?: string | null;
  onClose: () => void;
  onSubmitted: (review: ApiReview) => void;
};

const MAX_CHARS = 300;
const MIN_CHARS = 5;

export function ReviewModal({
  isOpen,
  mentor,
  reviewer,
  sessionId,
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const [rating, setRating]     = useState(0);
  const [text, setText]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setRating(0);
    setText("");
    setError(null);
    setSubmitting(false);
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, submitting, onClose]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    if (text.trim().length < MIN_CHARS) {
      setError(`Please write at least ${MIN_CHARS} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const review = await submitReview(
        mentor._id,
        { uid: reviewer._id, name: reviewer.name },
        { rating, reviewText: text, sessionId: sessionId ?? null },
      );
      onSubmitted(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }, [rating, text, mentor._id, reviewer, sessionId, onSubmitted]);

  if (!isOpen) return null;

  const charsLeft = MAX_CHARS - text.length;
  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close review modal"
        onClick={submitting ? undefined : onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="fixed inset-x-4 top-1/2 z-50 w-full max-w-lg -translate-y-1/2 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/20 px-6 pt-6 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Rate &amp; Review
            </p>
            <h2
              id="review-modal-title"
              className="mt-1 font-headline text-xl font-black tracking-tight text-on-surface"
            >
              {mentor.name}
            </h2>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              {mentor.skillsOffered?.[0] ?? "Mentor"} · Remote
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-high disabled:opacity-50"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Star picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-500">
              Your Rating
            </label>
            <div className="flex items-center gap-4">
              <StarRating
                value={rating}
                size="lg"
                interactive
                onChange={setRating}
              />
              {rating > 0 && (
                <span className="text-sm font-semibold text-primary animate-in fade-in slide-in-from-left-2 duration-200">
                  {ratingLabels[rating]}
                </span>
              )}
            </div>
          </div>

          {/* Text area */}
          <div className="space-y-1.5">
            <label
              htmlFor="review-text"
              className="text-xs font-bold uppercase tracking-widest text-stone-500"
            >
              Your Review
            </label>
            <textarea
              id="review-text"
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setText(e.target.value);
              }}
              rows={4}
              placeholder={`Share your experience with ${mentor.name.split(" ")[0]}…`}
              disabled={submitting}
              className={cn(
                "w-full resize-none rounded-xl border bg-surface px-4 py-3 text-sm text-on-surface placeholder-stone-400 outline-none transition focus:ring-2 disabled:opacity-60",
                error && rating === 0
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant/30 focus:border-primary focus:ring-primary/15",
              )}
            />
            <div className="flex justify-between text-[11px] text-stone-400">
              <span>
                {text.trim().length < MIN_CHARS && text.length > 0
                  ? `${MIN_CHARS - text.trim().length} more characters needed`
                  : ""}
              </span>
              <span className={charsLeft < 30 ? "text-amber-500 font-bold" : ""}>
                {charsLeft}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-error/10 px-4 py-2.5 text-sm font-medium text-error">
              <Icon name="error" filled className="shrink-0 text-base" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-outline-variant/20 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-outline-variant/40 px-5 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || rating === 0 || text.trim().length < MIN_CHARS}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <Icon name="rate_review" className="text-base" />
            )}
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </>
  );
}
