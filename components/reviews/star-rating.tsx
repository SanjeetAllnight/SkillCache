"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  /** Current value (0–5). 0 = no rating yet. */
  value: number;
  /** Max stars (default 5). */
  max?: number;
  /** Allow the user to click stars to select a rating. */
  interactive?: boolean;
  /** Size of each star icon. */
  size?: "sm" | "md" | "lg";
  onChange?: (rating: number) => void;
  className?: string;
};

const sizeClasses = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

/**
 * Renders a row of stars. When `interactive`, hovering previews a value
 * and clicking commits it.
 */
export function StarRating({
  value,
  max = 5,
  interactive = false,
  size = "md",
  onChange,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const displayed = interactive && hovered > 0 ? hovered : value;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "Star rating" : `Rating: ${value} out of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= displayed;
        const half = !filled && starValue - 0.5 <= displayed;

        return (
          <button
            key={starValue}
            type="button"
            disabled={!interactive}
            aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={cn(
              "leading-none transition-transform",
              sizeClasses[size],
              interactive
                ? "cursor-pointer hover:scale-110 active:scale-95"
                : "cursor-default",
              !interactive && "pointer-events-none",
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined select-none transition-colors",
                filled
                  ? "text-amber-400"
                  : half
                    ? "text-amber-300"
                    : "text-stone-300",
              )}
              style={{ fontVariationSettings: filled || half ? "'FILL' 1" : "'FILL' 0" }}
            >
              star
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact inline display: stars + numeric label. */
export function StarBadge({
  rating,
  totalReviews,
  size = "sm",
  className,
}: {
  rating: number;
  totalReviews: number;
  size?: StarRatingProps["size"];
  className?: string;
}) {
  if (totalReviews === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <StarRating value={rating} size={size} />
      <span className="text-sm font-bold text-on-surface">
        {rating.toFixed(1)}
      </span>
      <span className="text-xs text-stone-400">
        ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}
