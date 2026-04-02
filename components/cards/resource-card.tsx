import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

type ResourceBase = {
  title: string;
  description: string;
};

type FeaturedResource = ResourceBase & {
  variant: "featured";
  image: string;
  primaryTag: string;
  secondaryTag?: string;
  author: string;
  authorAvatar: string;
  href?: string;
};

type StandardResource = ResourceBase & {
  variant: "standard";
  image: string;
  tag: string;
  author: string;
  authorAvatar: string;
  href?: string;
};

type HighlightResource = ResourceBase & {
  variant: "highlight";
  eyebrow: string;
  ctaLabel: string;
  href?: string;
};

type AttachmentResource = {
  variant: "attachment";
  title: string;
  subtitle: string;
  icon: string;
  actionIcon: string;
  href?: string;
};

type IncludedResource = {
  variant: "included";
  title: string;
  icon: string;
  tone: "primary" | "tertiary";
  href?: string;
};

export type ResourceCardData =
  | FeaturedResource
  | StandardResource
  | HighlightResource
  | AttachmentResource
  | IncludedResource;

type ResourceCardProps = {
  resource: ResourceCardData;
  className?: string;
};

export function ResourceCard({ resource, className }: ResourceCardProps) {
  if (resource.variant === "attachment") {
    return (
      <article className={cn("group rounded-2xl bg-surface-container-lowest p-6 editorial-shadow", className)}>
        <div className="mb-4 flex items-start justify-between">
          <div className="rounded-2xl bg-secondary-container/20 p-3 text-primary">
            <Icon name={resource.icon} />
          </div>
          {resource.href ? (
            <Link
              href={resource.href}
              className="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Icon name={resource.actionIcon} />
            </Link>
          ) : (
            <button className="text-stone-400 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name={resource.actionIcon} />
            </button>
          )}
        </div>
        <p className="mb-1 font-bold">{resource.title}</p>
        <p className="text-xs uppercase text-stone-500">{resource.subtitle}</p>
      </article>
    );
  }

  if (resource.variant === "included") {
    const content = (
      <div className={cn("flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-container-lowest p-4 transition-colors hover:bg-white", className)}>
        <Icon
          name={resource.icon}
          className={resource.tone === "tertiary" ? "text-tertiary" : "text-primary"}
        />
        <span className="text-sm font-medium">{resource.title}</span>
      </div>
    );

    return resource.href ? <Link href={resource.href}>{content}</Link> : content;
  }

  if (resource.variant === "highlight") {
    return (
      <article
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/20 bg-surface-container-high/40 p-6 backdrop-blur-md editorial-shadow md:p-8",
          className,
        )}
      >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col">
          <Icon name="auto_awesome" className="mb-6 text-4xl text-primary" />
          <h3 className="mb-4 font-headline text-2xl font-bold text-on-background">
            {resource.title}
          </h3>
          <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
            {resource.description}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-outline-variant/30 pt-6">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {resource.eyebrow}
            </span>
            <Button href={resource.href ?? "/repository/typography-architectural-foundation"} variant="white" size="sm" rounded="lg">
              {resource.ctaLabel}
            </Button>
          </div>
        </div>
      </article>
    );
  }

  if (resource.variant === "featured") {
    return (
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest editorial-shadow transition-all duration-300 hover:-translate-y-1 md:flex-row",
          className,
        )}
      >
        <div className="relative h-64 w-full overflow-hidden md:h-auto md:w-1/2">
          <Image
            src={resource.image}
            alt={resource.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        </div>
        <div className="flex flex-1 flex-col p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <Tag className="tracking-wide normal-case">{resource.primaryTag}</Tag>
            {resource.secondaryTag ? (
              <Tag tone="tertiary" className="tracking-wide normal-case">
                {resource.secondaryTag}
              </Tag>
            ) : null}
          </div>
          <h3 className="mt-4 font-headline text-3xl font-bold text-on-background">
            {resource.title}
          </h3>
          <p className="mt-4 line-clamp-3 text-on-surface-variant">
            {resource.description}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={resource.authorAvatar}
                alt={resource.author}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-outline-variant object-cover"
              />
              <span className="text-sm font-semibold">{resource.author}</span>
            </div>
            <Button href={resource.href ?? "/repository/typography-architectural-foundation"} variant="solid">
              Open
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl bg-surface-container-lowest p-6 editorial-shadow transition-all duration-300 hover:-translate-y-1 md:p-8",
        className,
      )}
    >
      <div className="relative mb-6 aspect-video overflow-hidden rounded-2xl">
        <Image
          src={resource.image}
          alt={resource.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
      </div>
      <div className="mb-4">
        <Tag className="tracking-wide normal-case">{resource.tag}</Tag>
      </div>
      <h3 className="mb-2 font-headline text-xl font-bold text-on-background">
        {resource.title}
      </h3>
      <p className="mb-6 flex-1 text-sm text-on-surface-variant">
        {resource.description}
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image
            src={resource.authorAvatar}
            alt={resource.author}
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="text-xs font-semibold">{resource.author}</span>
        </div>
        <Link
          href={resource.href ?? "/repository/typography-architectural-foundation"}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary transition-all hover:gap-2"
        >
          Open <Icon name="arrow_forward" className="text-sm" />
        </Link>
      </div>
    </article>
  );
}
