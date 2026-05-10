import Image from "next/image";
import Link from "next/link";

// Helper: returns true only for http(s) URLs so we never feed <Image> a blank src
function isValidUrl(src: string | undefined): src is string {
  return typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/"));
}

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

type DashboardSession = {
  variant: "dashboard";
  id?: string;
  label: string;
  title: string;
  subtitle: string;
  icon: string;
  avatar: string;
  href?: string;
  tone?: "primary" | "default";
};

type UpcomingSession = {
  variant: "upcoming";
  title: string;
  mentor: string;
  date: string;
  time: string;
  avatar: string;
  href?: string;
};

type PastSession = {
  variant: "past";
  id?: string;
  title: string;
  mentor: string;
  date: string;
  quote: string;
  ctaLabel: string;
  ctaHref?: string;
};

type FeaturedSession = {
  variant: "featured";
  id?: string;
  title: string;
  mentor: string;
  status: string;
  category: string;
  image: string;
  joinHref?: string;
  detailHref?: string;
};

export type SessionCardData =
  | DashboardSession
  | UpcomingSession
  | PastSession
  | FeaturedSession;

type SessionCardProps = {
  session: SessionCardData;
};

export function SessionCard({ session }: SessionCardProps) {
  if (session.variant === "dashboard") {
    const content = (
      <article
        className={cn(
          "rounded-2xl bg-surface-container-lowest p-6 editorial-shadow",
          session.tone === "primary" ? "border-l-4 border-primary" : "",
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-stone-400">
              {session.label}
            </p>
            <h4 className="font-bold text-on-surface">{session.title}</h4>
          </div>
          <Icon
            name={session.icon}
            filled={session.icon === "video_call"}
            className={cn(
              "text-xl",
              session.tone === "primary" ? "text-primary" : "text-stone-400",
            )}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          {isValidUrl(session.avatar) ? (
            <Image
              src={session.avatar}
              alt={session.title}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container text-[10px] font-bold text-on-primary-container">
              {session.title[0]?.toUpperCase() ?? "S"}
            </div>
          )}
          <p className="text-xs font-medium text-on-surface-variant">
            {session.subtitle}
          </p>
        </div>
      </article>
    );

    if (session.href) {
      return (
        <Link href={session.href} className="block transition-transform hover:-translate-y-0.5">
          {content}
        </Link>
      );
    }

    return content;
  }

  if (session.variant === "upcoming") {
    return (
      <article className="group rounded-2xl bg-surface-container-lowest p-6 editorial-shadow transition-all hover:-translate-y-0.5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h5 className="font-headline text-lg font-bold text-on-surface transition-colors group-hover:text-primary">
              {session.title}
            </h5>
            <p className="text-sm text-on-surface-variant">Mentor: {session.mentor}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-primary">{session.date}</p>
            <p className="text-stone-400">{session.time}</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-surface-container pt-4">
          {isValidUrl(session.avatar) ? (
            <Image
              src={session.avatar}
              alt={session.mentor}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full border-2 border-surface-container-lowest object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary-container text-xs font-bold text-on-primary-container">
              {session.mentor[0]?.toUpperCase() ?? "M"}
            </div>
          )}
          <Link
            href={session.href ?? "/sessions"}
            className="inline-flex items-center gap-1 text-sm font-bold text-primary transition-all hover:gap-2"
          >
            Details <Icon name="arrow_forward" className="text-sm" />
          </Link>
        </div>
      </article>
    );
  }

  if (session.variant === "past") {
    return (
      <article className="rounded-2xl bg-surface-container-low p-6 opacity-80 transition-opacity hover:opacity-100">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h5 className="font-headline text-lg font-bold text-on-surface">
                {session.title}
              </h5>
              <Icon
                name="check_circle"
                filled
                className="text-sm text-primary"
              />
            </div>
            <p className="text-sm text-on-surface-variant">Mentor: {session.mentor}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-medium text-stone-500">{session.date}</p>
            <span className="rounded bg-surface-container-high px-2 py-0.5 font-bold uppercase text-on-surface-variant">
              Completed
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
          <p className="text-xs italic text-on-surface-variant">"{session.quote}"</p>
          <Button
            href={session.ctaHref ?? "/sessions"}
            variant="white"
            size="sm"
            className="border border-outline-variant/10"
          >
            {session.ctaLabel}
          </Button>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col gap-6 rounded-2xl bg-surface-container-lowest p-6 editorial-shadow transition-all hover:-translate-y-1 md:flex-row md:gap-8 md:p-8">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-container md:w-1/3">
        {isValidUrl(session.image) ? (
          <Image
            src={session.image}
            alt={session.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-container/30">
            <span className="font-headline text-4xl font-bold text-primary/40">
              {session.title[0]?.toUpperCase() ?? "S"}
            </span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Tag className="tracking-tight normal-case">{session.category}</Tag>
          <span className="text-xs font-bold uppercase text-tertiary">{session.status}</span>
        </div>
        <h4 className="mt-4 font-headline text-3xl font-bold text-on-surface">
          {session.title}
        </h4>
        <p className="mt-2 text-on-surface-variant">
          Session with <strong>{session.mentor}</strong> &middot; Started 15m ago
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:mt-auto sm:flex-row sm:flex-wrap">
          <Button href={session.joinHref ?? "/call"} variant="primary">
            <Icon name="videocam" className="text-sm" />
            Join Session
          </Button>
          <Button
            href={session.detailHref ?? "/sessions/advanced-clay-glazing-techniques"}
            variant="surface"
          >
            Details
          </Button>
        </div>
      </div>
    </article>
  );
}
