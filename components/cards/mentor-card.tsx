import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

export type MentorCardData = {
  id?: string;
  name: string;
  role: string;
  quote: string;
  tags: string[];
  rating: string;
  /** URL to the mentor's photo. Leave empty ("") to render an initials avatar. */
  image: string;
  location?: string;
  narrative?: string;
  coverImage?: string;
  profileHref?: string;
  connectHref?: string;
  featured?: boolean;
  badge?: string;
  tilt?: "left" | "right" | "none";
};

type MentorCardProps = {
  mentor: MentorCardData;
};

// ─── Initials avatar ──────────────────────────────────────────────────────────

const INITIALS_PALETTE = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function hashIndex(str: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MentorCard({ mentor }: MentorCardProps) {
  const hasImage = Boolean(mentor.image);
  const initials  = getInitials(mentor.name);
  const palette   = INITIALS_PALETTE[hashIndex(mentor.name, INITIALS_PALETTE.length)];

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-6 overflow-hidden rounded-2xl p-6 transition-all duration-300 md:flex-row md:gap-8 md:p-8",
        mentor.featured
          ? "border border-primary/10 bg-primary-container/20 backdrop-blur-md editorial-shadow hover:-translate-y-1"
          : "bg-surface-container-lowest editorial-shadow hover:-translate-y-1",
      )}
    >
      {/* ── Avatar column ────────────────────────────────────────────── */}
      <div className="relative shrink-0">
        <Link
          href={mentor.profileHref ?? "/profile"}
          className="relative block h-32 w-32 overflow-hidden rounded-2xl shadow-xl transition-transform duration-500 group-hover:scale-105 md:h-48 md:w-48"
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mentor.image}
              alt={mentor.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center font-headline text-4xl font-black md:text-5xl",
                palette,
              )}
            >
              {initials}
            </div>
          )}
        </Link>

        {mentor.badge && (
          <div className="absolute left-2 top-2 rounded-full bg-tertiary px-3 py-1 text-[10px] font-bold uppercase tracking-tight text-white">
            {mentor.badge}
          </div>
        )}

        {/* Rating chip */}
        <div className="absolute -bottom-2 -right-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-md">
          <Icon name="star" filled className="text-sm text-yellow-500" />
          <span className="text-sm font-bold">{mentor.rating}</span>
        </div>
      </div>

      {/* ── Info column ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="space-y-1">
          <Link href={mentor.profileHref ?? "/profile"} className="group/title inline-block">
            <h3 className="font-headline text-2xl font-extrabold text-on-background transition-colors group-hover/title:text-primary">
              {mentor.name}
            </h3>
          </Link>
          <p className="text-sm font-semibold text-primary">{mentor.role}</p>
          {mentor.location && (
            <p className="flex items-center gap-1 text-xs text-stone-400">
              <Icon name="location_on" className="text-sm" />
              {mentor.location}
            </p>
          )}
        </div>

        <p className="mt-4 line-clamp-3 text-sm italic leading-relaxed text-on-surface-variant">
          &ldquo;{mentor.quote}&rdquo;
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {mentor.tags.map((tag) => (
            <Tag key={tag} className="px-3 py-1 text-xs normal-case tracking-normal">
              {tag}
            </Tag>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:mt-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            href={mentor.connectHref ?? mentor.profileHref ?? "/profile"}
            rounded="xl"
            className="w-full sm:flex-1"
          >
            Connect
          </Button>
          <Button
            href={mentor.profileHref ?? "/profile"}
            variant="surface"
            rounded="xl"
            className="w-full px-6 sm:w-auto"
          >
            View Profile
          </Button>
        </div>
      </div>
    </article>
  );
}
