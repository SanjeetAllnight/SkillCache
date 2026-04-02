import Image from "next/image";
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

export function MentorCard({ mentor }: MentorCardProps) {
  const tiltClass =
    mentor.tilt === "left"
      ? "rotate-[-2deg] group-hover:rotate-0"
      : mentor.tilt === "right"
        ? "rotate-[2deg] group-hover:rotate-0"
        : "group-hover:scale-105";

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-6 overflow-hidden rounded-2xl p-6 transition-all duration-300 md:flex-row md:gap-8 md:p-8",
        mentor.featured
          ? "border border-primary/10 bg-primary-container/20 backdrop-blur-md editorial-shadow hover:-translate-y-1"
          : "bg-surface-container-lowest editorial-shadow hover:-translate-y-1",
      )}
    >
      <div className="relative shrink-0">
        <Link
          href={mentor.profileHref ?? "/profile"}
          className={cn(
            "relative block h-32 w-32 overflow-hidden rounded-2xl shadow-xl transition-transform duration-500 md:h-48 md:w-48",
            tiltClass,
          )}
        >
          <Image
            src={mentor.image}
            alt={mentor.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 128px, 192px"
          />
        </Link>
        {mentor.badge ? (
          <div className="absolute left-2 top-2 rounded-full bg-tertiary px-3 py-1 text-[10px] font-bold uppercase tracking-tight text-white">
            {mentor.badge}
          </div>
        ) : null}
        <div className="absolute -bottom-2 -right-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-md">
          <Icon name="star" filled className="text-sm text-yellow-500" />
          <span className="text-sm font-bold">{mentor.rating}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="space-y-2">
          <Link href={mentor.profileHref ?? "/profile"} className="group/title inline-block">
            <h3 className="font-headline text-2xl font-extrabold text-on-background transition-colors group-hover/title:text-primary">
              {mentor.name}
            </h3>
          </Link>
          <p className="text-sm font-semibold text-primary">{mentor.role}</p>
        </div>

        <p className="mt-4 line-clamp-3 text-sm italic leading-relaxed text-on-surface-variant">
          "{mentor.quote}"
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
