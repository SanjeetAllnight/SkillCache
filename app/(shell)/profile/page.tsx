import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { mentors, profileData } from "@/lib/mock-data";
import { mockUser } from "@/lib/mockUser";

const badgeToneClasses: Record<string, string> = {
  primary: "from-primary/10 text-primary",
  tertiary: "from-tertiary/10 text-tertiary",
  secondary: "from-secondary/10 text-secondary",
  locked: "border-2 border-dashed border-outline-variant text-outline-variant",
};

type ProfilePageProps = {
  searchParams: Promise<{ mentor?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { mentor } = await searchParams;
  const selectedMentor = mentor
    ? mentors.find((entry) => entry.id === mentor)
    : undefined;

  const activeProfile = {
    name: selectedMentor?.name ?? mockUser.name,
    avatar: selectedMentor?.image ?? mockUser.avatar,
    cover: selectedMentor?.coverImage ?? mockUser.coverImage,
    location: selectedMentor?.location ?? mockUser.location,
    role: selectedMentor?.role ?? mockUser.title,
    narrative: selectedMentor?.narrative ?? profileData.narrative,
  };

  return (
    <div className="page-shell page-stack">
      <section className="section-stack">
        <div className="relative">
          <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-surface-container md:h-80">
            <Image
              src={activeProfile.cover}
              alt="Profile cover"
              fill
              className="object-cover opacity-80"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          </div>
          <div className="relative -mt-10 flex flex-col gap-6 px-5 sm:px-6 md:-mt-16 md:flex-row md:items-end md:px-8 lg:px-10">
            <div className="relative h-32 w-32 overflow-hidden rounded-2xl border-4 border-surface bg-surface-container-lowest shadow-xl md:h-44 md:w-44">
              <Image
                src={activeProfile.avatar}
                alt={activeProfile.name}
                fill
                className="object-cover"
                sizes="176px"
              />
            </div>
            <div className="space-y-2 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-headline text-3xl font-black tracking-tighter text-on-surface md:text-5xl">
                  {activeProfile.name}
                </h1>
                <Icon name="verified" filled className="text-primary" />
              </div>
              <p className="flex flex-wrap items-center gap-2 font-medium text-stone-500">
                <Icon name="location_on" className="text-sm" />
                {activeProfile.location} &middot; {activeProfile.role}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-12">
        <aside className="space-y-12 xl:col-span-4">
          <section className="section-stack">
            <h2 className="text-xs font-bold uppercase tracking-editorial text-stone-400">
              The Narrative
            </h2>
            <p className="text-lg leading-relaxed text-on-surface-variant">
              {activeProfile.narrative}
            </p>
            <div className="flex items-center gap-4 py-2">
              <div className="flex -space-x-3">
                {profileData.connections.map((connection) => (
                  <div
                    key={connection}
                    className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-surface bg-surface-container"
                  >
                    <Image
                      src={connection}
                      alt="Connection"
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                ))}
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-primary-container text-[10px] font-bold text-on-primary-container">
                  +42
                </div>
              </div>
              <span className="text-sm font-medium text-stone-500">
                {selectedMentor
                  ? `Connect with ${selectedMentor.name}`
                  : "Mentored 44+ artisans"}
              </span>
            </div>
          </section>

          <section className="app-card-soft">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-editorial text-stone-400">
              Vitality
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {profileData.vitality.map((item) => (
                <div key={item.label} className="space-y-1">
                  <span className="text-3xl font-black text-primary">{item.value}</span>
                  <p className="text-xs font-bold uppercase text-stone-500">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section-stack">
            <h2 className="text-xs font-bold uppercase tracking-editorial text-stone-400">
              Connect
            </h2>
            <div className="flex gap-3">
              {["language", "alternate_email", "share"].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-primary transition-all hover:bg-primary hover:text-white"
                >
                  <Icon name={icon} />
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-12 xl:col-span-8">
          <section className="section-stack">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xs font-bold uppercase tracking-editorial text-stone-400">
                The Arsenal
              </h2>
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-bold text-primary"
              >
                View All
                <Icon name="arrow_forward" className="text-sm" />
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {profileData.skills.map((skill) => (
                <article
                  key={skill.title}
                  className="app-card transition-all hover:-translate-y-0.5"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        skill.tone === "primary"
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-secondary-container text-on-secondary-container"
                      }`}
                    >
                      <Icon name={skill.icon} />
                    </div>
                    <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-stone-500">
                      {skill.level}
                    </span>
                  </div>
                  <h3 className="mb-2 font-headline text-xl font-bold">{skill.title}</h3>
                  <p className="mb-4 text-sm text-stone-500">{skill.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {skill.tags.map((tag) => (
                      <Tag
                        key={tag}
                        className="bg-secondary-fixed px-3 py-1 text-[10px] uppercase tracking-wider text-on-secondary-fixed-variant"
                      >
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section-stack">
            <h2 className="text-xs font-bold uppercase tracking-editorial text-stone-400">
              Accolades
            </h2>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
              {profileData.badges.map((badge) => (
                <article
                  key={badge.title}
                  className={`flex flex-col items-center gap-3 text-center ${
                    badge.tone === "locked" ? "opacity-40 grayscale" : ""
                  }`}
                >
                  <div
                    className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-highest ${
                      badge.tone === "locked"
                        ? badgeToneClasses.locked
                        : `bg-gradient-to-tr ${badgeToneClasses[badge.tone]}`
                    }`}
                  >
                    <Icon
                      name={badge.icon}
                      filled={badge.icon !== "lock"}
                      className="text-4xl"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <h3
                      className={`text-sm font-bold ${
                        badge.tone === "locked" ? "text-stone-400" : ""
                      }`}
                    >
                      {badge.title}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-stone-400">
                      {badge.subtitle}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-surface-container p-6 md:p-12">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-10">
              <Icon
                name="brush"
                className="absolute -right-20 -top-20 text-[200px] text-primary"
              />
            </div>
            <div className="relative z-10 max-w-lg space-y-6">
              <Tag className="px-4 py-1.5 text-xs">Active Exchange</Tag>
              <h2 className="font-headline text-3xl font-black tracking-tighter md:text-4xl">
                {selectedMentor
                  ? `Work with ${selectedMentor.name}`
                  : "Creative Direction & Design Philosophy"}
              </h2>
              <p className="font-medium text-on-surface-variant">
                {selectedMentor ? (
                  <>Explore {selectedMentor.name}&apos;s practice and start a new mentorship exchange.</>
                ) : (
                  <>
                    Currently mentoring{" "}
                    <span className="font-bold text-primary">Elena Rossi</span> on
                    editorial layout strategies.
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  href={selectedMentor ? "/sessions/advanced-clay-glazing-techniques" : "/call"}
                  variant="solid"
                  rounded="xl"
                >
                  {selectedMentor ? "Book Session" : "Join Studio"}
                  <Icon name="chevron_right" className="text-sm" />
                </Button>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/50 bg-white/20 backdrop-blur-sm">
                  <Icon name="videocam" className="text-primary" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
