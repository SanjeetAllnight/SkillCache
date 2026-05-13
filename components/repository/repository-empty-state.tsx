"use client";

import { Icon } from "@/components/ui/icon";

type RepositoryEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  icon?: string;
  onAction?: () => void;
};

export function RepositoryEmptyState({
  title,
  description,
  actionLabel,
  icon = "auto_stories",
  onAction,
}: RepositoryEmptyStateProps) {
  return (
    <div className="col-span-full overflow-hidden rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon name={icon} className="text-4xl" />
      </div>
      <h3 className="mt-5 font-headline text-2xl font-black tracking-tight text-on-surface">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary transition hover:opacity-90"
        >
          <Icon name="ios_share" className="text-base" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
