"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionCard } from "@/components/cards/session-card";
import { MentorCard } from "@/components/cards/mentor-card";
import { KnowledgeResourceCard } from "@/components/repository/knowledge-resource-card";
import {
  getUsers,
  getSessions,
  listenPublicSessions,
  type ApiSession,
} from "@/lib/firebaseServices";
import { ensureDiscoverDataSeeded } from "@/lib/seedData";
import { listRepositoryResources, type KnowledgeResource } from "@/lib/repository";
import { type BackendUser } from "@/lib/mockUser";
import { toDashboardSessionCards } from "@/lib/view-models";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateTrendingSkills(users: BackendUser[]) {
  const skillStats: Record<string, { learners: number; mentors: number; trend: number }> = {};

  users.forEach((u) => {
    u.skillsWanted?.forEach((s) => {
      if (!skillStats[s]) skillStats[s] = { learners: 0, mentors: 0, trend: Math.floor(Math.random() * 20) + 5 };
      skillStats[s].learners++;
    });
    u.skillsOffered?.forEach((s) => {
      if (!skillStats[s]) skillStats[s] = { learners: 0, mentors: 0, trend: Math.floor(Math.random() * 20) + 5 };
      skillStats[s].mentors++;
    });
  });

  return Object.entries(skillStats)
    .map(([name, stats]) => ({ name, ...stats, score: stats.learners + stats.mentors * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { user, isAuthReady } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [publicWorkshops, setPublicWorkshops] = useState<ApiSession[]>([]);
  const [resources, setResources] = useState<KnowledgeResource[]>([]);

  useEffect(() => {
    if (!isAuthReady || !user?._id) return;

    let isMounted = true;
    
    async function loadData() {
      try {
        // Ensure the platform has realistic demo content so it doesn't look empty
        await ensureDiscoverDataSeeded();

        const [uRes, sRes, rRes] = await Promise.all([
          getUsers(),
          getSessions(),
          listRepositoryResources({ scope: "community", pageSize: 10 }),
        ]);

        if (isMounted) {
          setUsers(uRes);
          setSessions(sRes);
          setResources(rRes.resources);
        }
      } catch (err) {
        console.error("Failed to load discover data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();

    const unsubscribeWorkshops = listenPublicSessions((data) => {
      if (isMounted) setPublicWorkshops(data);
    });

    return () => {
      isMounted = false;
      unsubscribeWorkshops();
    };
  }, [user, isAuthReady]);

  if (!isAuthReady || loading) {
    return (
      <div className="page-shell page-stack animate-pulse">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-10 w-48 mt-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // ─── Data Derivation ────────────────────────────────────────────────────────

  const trendingSkills = calculateTrendingSkills(users);
  
  const liveSessions = sessions.filter((s) => s.status === "live");
  
  // Featured mentors: Top 4 by some metric (here we'll just use the ones with most skills offered for now)
  const featuredMentors = [...users]
    .filter((u) => (u.skillsOffered?.length ?? 0) > 0 && u._id !== user?._id)
    .sort((a, b) => (b.skillsOffered?.length || 0) - (a.skillsOffered?.length || 0))
    .slice(0, 4);

  // Recommendations based on what user wants to learn
  const userWants = user?.skillsWanted || [];
  const recommendedMentors = featuredMentors.filter((m) => 
    m.skillsOffered?.some((skill) => userWants.includes(skill))
  );

  const recommendedResources = resources
    .filter((r) => r.tags?.some((t) => userWants.includes(t)))
    .slice(0, 3);

  const communityHighlights = resources.slice(0, 4); // Latest resources

  return (
    <div className="page-shell page-stack pb-20">
      
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-primary p-8 text-on-primary md:p-12">
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight md:text-5xl">
            Discover the Community
          </h1>
          <p className="mt-4 text-lg text-on-primary/80">
            Explore trending skills, join live workshops, and connect with expert mentors in the SkillCache atelier.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button variant="dark" size="lg" href="/mentors">
              Find a Mentor
            </Button>
            <Button variant="ghost" size="lg" className="text-on-primary hover:bg-on-primary/10" href="#workshops">
              Browse Workshops
            </Button>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 z-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 z-0 h-64 w-64 rounded-full bg-black/10 blur-2xl" />
      </section>

      {/* ── Section 1: Trending Skills ──────────────────────────────────────── */}
      <section className="section-stack mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-2xl font-bold">Trending Skills</h2>
          <Button variant="ghost" size="sm" className="text-primary" href="/mentors">View All</Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trendingSkills.map((skill, i) => (
            <div key={skill.name} className="app-card group relative overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${i % 2 === 0 ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"}`}>
                  <Icon name="local_fire_department" />
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                  <Icon name="trending_up" className="text-[14px]" />
                  +{skill.trend}%
                </span>
              </div>
              <h3 className="font-headline text-lg font-bold">{skill.name}</h3>
              <div className="mt-2 flex items-center gap-4 text-sm text-stone-500">
                <span className="flex items-center gap-1">
                  <Icon name="school" className="text-[16px]" /> {skill.learners} learning
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="engineering" className="text-[16px]" /> {skill.mentors} teaching
                </span>
              </div>
              <Link href={`/mentors?q=${encodeURIComponent(skill.name)}`} className="absolute inset-0 z-10">
                <span className="sr-only">Explore {skill.name}</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Upcoming Workshops ───────────────────────────────────── */}
      <section id="workshops" className="section-stack mt-12">
        <h2 className="font-headline text-2xl font-bold">Upcoming Workshops</h2>
        {publicWorkshops.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publicWorkshops.map((workshop) => {
              const startsAt = new Date(workshop.date).getTime();
              const now = Date.now();
              const isLive = workshop.status === "live";
              const isStartingSoon = !isLive && startsAt > now && startsAt - now <= 15 * 60 * 1000;
              const isCompleted = workshop.status === "completed" || workshop.status === "cancelled";
              
              const acceptedCount = Object.values(workshop.participants || {}).filter(p => p.status === "accepted").length;
              // Add 1 for the mentor/host themselves, so total taken = acceptedCount + 1
              const seatsLeft = Math.max(0, (workshop.maxParticipants ?? 10) - (acceptedCount + 1));
              
              const participantStatus = user ? workshop.participants?.[user._id]?.status : undefined;
              
              let badge = <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold tracking-widest text-on-surface-variant">SCHEDULED</span>;
              if (isLive) {
                badge = <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold tracking-widest text-emerald-600">LIVE</span>;
              } else if (isStartingSoon) {
                badge = <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold tracking-widest text-amber-600">STARTING SOON</span>;
              } else if (isCompleted) {
                badge = <span className="rounded-full bg-surface-container-highest px-3 py-1 text-[10px] font-bold tracking-widest text-stone-500">COMPLETED</span>;
              }

              let actionLabel = "View Details";
              let actionDisabled = false;
              let actionIcon = "arrow_forward";

              if (isCompleted) {
                actionLabel = "Completed";
                actionDisabled = true;
                actionIcon = "check";
              } else if (participantStatus === "pending") {
                actionLabel = "Request Sent";
                actionDisabled = true;
                actionIcon = "hourglass_empty";
              } else if (participantStatus === "accepted" || workshop.mentorId === user?._id) {
                if (isLive) {
                  actionLabel = "Join Now";
                  actionIcon = "login";
                } else {
                  actionLabel = "Open Workshop";
                  actionIcon = "event_seat";
                }
              }

              return (
              <div key={workshop._id} className="app-card relative flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl group">
                <Link href={`/sessions/${workshop._id}`} className="absolute inset-0 z-10">
                  <span className="sr-only">View {workshop.title} details</span>
                </Link>
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                      <Icon name="event" className="text-[16px]" /> Workshop
                    </div>
                    {badge}
                  </div>
                  <h3 className="mt-3 font-headline text-xl font-bold line-clamp-2">{workshop.title}</h3>
                  <p className="mt-2 text-sm text-stone-500 line-clamp-2">{workshop.description}</p>
                  
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                      {workshop.mentor.name[0]}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-on-surface">By {workshop.mentor.name}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(workshop.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        <span className="mx-1">•</span>
                        {workshop.durationMinutes ?? 30} min
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-outline-variant/30 pt-4 relative z-20">
                  <span className="text-xs font-medium text-stone-500">
                    <Icon name="group" className="inline text-[14px] align-text-bottom mr-1" />
                    {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
                  </span>
                  {actionDisabled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-4 py-2 text-xs font-bold text-stone-500">
                      {actionLabel} <Icon name={actionIcon} className="text-[14px]" />
                    </span>
                  ) : (
                    <Link href={`/sessions/${workshop._id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:opacity-90">
                      {actionLabel} <Icon name={actionIcon} className="text-[14px]" />
                    </Link>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline-variant/30 p-10 text-center text-sm text-stone-500">
            <Icon name="event_busy" className="text-4xl text-stone-300 mb-3" />
            <p className="font-medium text-on-surface">No upcoming workshops</p>
            <p className="mt-1">Check back soon — workshops are added by mentors regularly.</p>
          </div>
        )}
      </section>

      {/* ── Section 3: Live Now ─────────────────────────────────────────────── */}
      <section className="section-stack mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-error"></span>
          </div>
          <h2 className="font-headline text-2xl font-bold text-error">Live Now</h2>
        </div>
        
        {liveSessions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {toDashboardSessionCards(liveSessions).map((session, i) => (
              <SessionCard key={i} session={session} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-container-lowest p-8 text-center border border-outline-variant/20">
            <Icon name="sensors_off" className="text-4xl text-stone-300 mb-2" />
            <p className="font-semibold text-on-surface">Quiet right now</p>
            <p className="text-sm text-stone-500 mt-1">No community sessions are currently live.</p>
          </div>
        )}
      </section>

      {/* ── Section 4 & 5 Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 mt-12">
        
        <div className="xl:col-span-8 space-y-12">
          {/* Featured Mentors */}
          <section className="section-stack">
            <h2 className="font-headline text-2xl font-bold">Featured Mentors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredMentors.map((m) => (
                <MentorCard 
                  key={m._id} 
                  mentor={{
                    id: m._id,
                    name: m.name,
                    role: m.skillsOffered?.[0] ? `${m.skillsOffered[0]} Mentor` : "Community Mentor",
                    quote: m.bio || "Passionate about sharing knowledge and growing together.",
                    tags: m.skillsOffered || [],
                    averageRating: m.averageRating ?? 0,
                    totalReviews: m.totalReviews ?? 0,
                    image: m.avatar || "",
                    profileHref: `/profile?mentor=${m._id}`,
                  }} 
                />
              ))}
            </div>
          </section>

          {/* Recommended For You */}
          {userWants.length > 0 && (
            <section className="section-stack">
              <div className="flex items-center gap-2 mb-6">
                <Icon name="auto_awesome" className="text-primary" />
                <h2 className="font-headline text-2xl font-bold">Recommended For You</h2>
              </div>
              <div className="rounded-3xl bg-primary-container/20 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Because you want to learn: {userWants.slice(0, 2).join(", ")}</h3>
                
                {recommendedMentors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendedMentors.map(m => (
                      <MentorCard 
                        key={m._id} 
                        mentor={{
                          id: m._id,
                          name: m.name,
                          role: m.skillsOffered?.[0] ? `${m.skillsOffered[0]} Mentor` : "Community Mentor",
                          quote: m.bio || "Passionate about sharing knowledge and growing together.",
                          tags: m.skillsOffered || [],
                          averageRating: m.averageRating ?? 0,
                          totalReviews: m.totalReviews ?? 0,
                          image: m.avatar || "",
                          profileHref: `/profile?mentor=${m._id}`,
                        }} 
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500 italic">Expand your network to see more tailored recommendations.</p>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="xl:col-span-4 space-y-12">
          {/* Community Highlights */}
          <section className="section-stack">
            <h2 className="font-headline text-2xl font-bold">Community Highlights</h2>
            <p className="text-sm text-on-surface-variant mb-6">Fresh resources from the repository</p>
            <div className="space-y-4">
              {communityHighlights.length > 0 ? (
                communityHighlights.map((resource) => (
                  <KnowledgeResourceCard key={resource.id} resource={resource} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-stone-500">
                  The repository is currently empty.
                </div>
              )}
            </div>
            <Button href="/repository" variant="ghost" className="w-full justify-center mt-4">
              Explore Repository
            </Button>
          </section>
        </div>
      </div>

    </div>
  );
}
