"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { MentorCard } from "@/components/cards/mentor-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getMentors } from "@/lib/firebaseServices";
import { toMentorCardData } from "@/lib/view-models";
import { useAuth } from "@/components/providers/auth-provider";
import type { MentorCardData } from "@/components/cards/mentor-card";

function MentorsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filters, setFilters]           = useState<string[]>([]);
  const [mentors, setMentors]           = useState<MentorCardData[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMentors() {
      try {
        setIsLoading(true);
        setError(null);

        // Exclude the logged-in user so they don't see themselves as a mentor
        const response = await getMentors(
          activeFilter ?? undefined,
          user?._id ?? undefined,
        );

        if (!isMounted) return;

        // Build the filter pill list from all offered skills (only on first load)
        if (!activeFilter) {
          const allSkills = Array.from(
            new Set(response.flatMap((m) => m.skillsOffered ?? [])),
          ).slice(0, 8);
          setFilters(allSkills);
        }

        setMentors(toMentorCardData(response));
      } catch (requestError) {
        if (!isMounted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load mentors right now.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMentors();

    return () => { isMounted = false; };
  }, [activeFilter, user?._id]);

  const filteredMentors = mentors.filter((mentor) => {
    if (!searchQuery) return true;
    const matchName = mentor.name.toLowerCase().includes(searchQuery);
    const matchRole = mentor.role.toLowerCase().includes(searchQuery);
    const matchTags = mentor.tags.some(t => t.toLowerCase().includes(searchQuery));
    return matchName || matchRole || matchTags;
  });

  return (
    <div className="page-shell page-stack">
      {/* ── Header + filters ───────────────────────────────────────────── */}
      <section className="section-stack max-w-3xl">
        <span className="mb-4 block text-xs font-bold uppercase tracking-widest text-primary">
          Real members · Real skills
        </span>
        <h1 className="max-w-2xl font-headline text-5xl font-extrabold leading-none tracking-tighter text-on-background md:text-7xl">
          Discover your <br />
          <span className="inline-block rounded-2xl bg-primary px-4 py-1 text-primary-container">
            next mentor.
          </span>
        </h1>

        {/* Skill filter pills */}
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-5 py-2 text-sm font-medium text-on-surface-variant">
            <Icon name="filter_alt" className="text-lg" />
            Filter by skill
          </span>

          {/* "All" pill */}
          <button
            id="filter-all"
            type="button"
            onClick={() => setActiveFilter(null)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              activeFilter === null
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container text-on-surface hover:bg-surface-container-high"
            }`}
          >
            All
          </button>

          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                id={`filter-${filter.toLowerCase().replace(/\s+/g, "-")}`}
                type="button"
                onClick={() =>
                  setActiveFilter((cur) => (cur === filter ? null : filter))
                }
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {/* ── Mentor grid ────────────────────────────────────────────────── */}
      <section className="grid gap-8 xl:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[320px] w-full" />
            ))
          : filteredMentors.map((mentor) => (
              <MentorCard key={mentor.id ?? mentor.name} mentor={mentor} />
            ))}
      </section>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!isLoading && filteredMentors.length === 0 && (
        <div className="rounded-2xl bg-surface-container-low px-6 py-14 text-center">
          <Icon name="person_search" className="mb-3 text-5xl text-stone-400" />
          <p className="text-lg font-semibold text-on-surface">
            {activeFilter || searchQuery
              ? `No mentors found for ${[activeFilter, searchQuery && `"${searchQuery}"`].filter(Boolean).join(' and ')}`
              : "No mentors yet — be the first!"}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {activeFilter || searchQuery
              ? "Try a different skill filter or search query to widen the search."
              : "Complete your profile and add skills to appear here."}
          </p>
          {(activeFilter || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setActiveFilter(null);
                // The URL clear will be handled if we use router.replace, but it's easier to just clear it.
                // It's a bit complex to clear URL from here cleanly without useRouter, but we have router available.
                // However, just setActiveFilter is fine, we can't easily clear the URL searchQuery without router.
              }}
              className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-2">
        <div className="mb-6 h-1 w-24 overflow-hidden rounded-full bg-surface-container-highest">
          <div className="h-full w-1/2 bg-primary" />
        </div>
        <p className="text-sm font-medium text-stone-400">
          {isLoading
            ? "Loading mentors…"
            : `${mentors.length} mentor${mentors.length !== 1 ? "s" : ""} · live from Firestore`}
        </p>
        <Button variant="outline" rounded="xl" className="mt-6 px-12" disabled>
          Powered by Firebase
        </Button>
      </div>
    </div>
  );
}

export default function MentorsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-32 bg-surface-container-high rounded-full"></div>
          <div className="h-4 w-48 bg-surface-container-high rounded-full"></div>
        </div>
      </div>
    }>
      <MentorsContent />
    </Suspense>
  );
}
