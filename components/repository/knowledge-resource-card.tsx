"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import {
  formatResourceFileSize,
  type KnowledgeResource,
  type ResourceType,
} from "@/lib/repository";
import { cn } from "@/lib/utils";

type KnowledgeResourceCardProps = {
  resource: KnowledgeResource;
  liked?: boolean;
  bookmarked?: boolean;
  pending?: boolean;
  compact?: boolean;
  className?: string;
  onLike?: (resource: KnowledgeResource) => void;
  onBookmark?: (resource: KnowledgeResource) => void;
  onOpen?: (resource: KnowledgeResource) => void;
  onEdit?: (resource: KnowledgeResource) => void;
  onDelete?: (resource: KnowledgeResource) => void;
  canManage?: boolean;
};

const typeMeta: Record<ResourceType, { label: string; icon: string; tone: "primary" | "secondary" | "tertiary" | "outline" }> = {
  pdf: { label: "PDF", icon: "picture_as_pdf", tone: "tertiary" },
  markdown: { label: "Markdown", icon: "markdown", tone: "secondary" },
  "rich-text": { label: "Note", icon: "article", tone: "secondary" },
  code: { label: "Code", icon: "data_object", tone: "primary" },
  link: { label: "Link", icon: "link", tone: "outline" },
  image: { label: "Image", icon: "image", tone: "tertiary" },
  file: { label: "Resource", icon: "attach_file", tone: "outline" },
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarTone(name: string) {
  const tones = [
    "bg-primary-container text-on-primary-container",
    "bg-secondary-container text-on-secondary-container",
    "bg-tertiary-container text-on-tertiary-container",
  ];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = ((hash << 5) - hash + name.charCodeAt(index)) | 0;
  }
  return tones[Math.abs(hash) % tones.length];
}

function formatDate(millis: number) {
  if (!millis) return "Recently shared";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(millis));
}

function getActionLabel(resource: KnowledgeResource) {
  if (resource.externalUrl) return "Open";
  if (resource.fileUrl) return "Download";
  return "Read";
}

export function KnowledgeResourceCard({
  resource,
  liked = false,
  bookmarked = false,
  pending = false,
  compact = false,
  className,
  onLike,
  onBookmark,
  onOpen,
  onEdit,
  onDelete,
  canManage = false,
}: KnowledgeResourceCardProps) {
  const meta = typeMeta[resource.type] ?? typeMeta.file;
  const actionLabel = getActionLabel(resource);
  const preview = resource.content?.trim();

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-editorial transition duration-200 hover:-translate-y-0.5 hover:border-primary/25",
        compact ? "p-4" : "md:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={meta.tone} className="normal-case tracking-normal">
            <Icon name={meta.icon} className="text-sm" />
            {meta.label}
          </Tag>
          {resource.sessionId ? (
            <Tag tone="surface" className="normal-case tracking-normal">
              Session
            </Tag>
          ) : null}
          {resource.visibility !== "public" ? (
            <Tag tone="muted" className="normal-case tracking-normal">
              {resource.visibility === "shared" ? "Shared" : "Private"}
            </Tag>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onBookmark?.(resource)}
          disabled={pending}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
            bookmarked
              ? "bg-primary text-on-primary"
              : "bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary",
          )}
          aria-label={bookmarked ? "Remove saved resource" : "Save resource"}
        >
          <Icon name="bookmark" filled={bookmarked} className="text-lg" />
        </button>
      </div>

      <Link href={`/repository/${resource.id}`} className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-headline text-xl font-black tracking-tight text-on-surface transition group-hover:text-primary">
          {resource.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
          {resource.description}
        </p>
      </Link>

      {preview ? (
        <div
          className={cn(
            "mt-4 rounded-lg border border-outline-variant/25 bg-surface-container px-4 py-3 text-sm text-on-surface-variant",
            resource.type === "code" ? "font-mono text-xs leading-relaxed" : "",
          )}
        >
          <p className="line-clamp-3">{preview}</p>
        </div>
      ) : null}

      {resource.fileName ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-surface-container px-4 py-3">
          <Icon name="description" className="text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{resource.fileName}</p>
            <p className="text-xs text-on-surface-variant">
              {formatResourceFileSize(resource.fileSize)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {resource.tags.slice(0, compact ? 3 : 5).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-outline-variant/20 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black",
              avatarTone(resource.uploaderName),
            )}
          >
            {initials(resource.uploaderName) || "SC"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{resource.uploaderName}</p>
            <p className="text-[11px] text-on-surface-variant">
              {formatDate(resource.createdAtMillis)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onLike?.(resource)}
            disabled={pending}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold transition",
              liked
                ? "bg-tertiary/10 text-tertiary"
                : "bg-surface-container text-on-surface-variant hover:bg-tertiary/10 hover:text-tertiary",
            )}
          >
            <Icon name="favorite" filled={liked} className="text-base" />
            {resource.likesCount}
          </button>
          <button
            type="button"
            onClick={() => onOpen?.(resource)}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-bold text-on-primary transition hover:opacity-90"
          >
            <Icon
              name={resource.fileUrl ? "download" : resource.externalUrl ? "open_in_new" : "arrow_forward"}
              className="text-base"
            />
            {actionLabel}
          </button>
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(resource)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs font-bold text-on-surface-variant transition hover:bg-surface-container-high"
          >
            <Icon name="edit" className="text-base" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(resource)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs font-bold text-error transition hover:bg-error/15"
          >
            <Icon name="delete" className="text-base" />
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}
