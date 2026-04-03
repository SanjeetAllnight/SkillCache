"use client";

import { useEffect, useState } from "react";

import { MentorCard } from "@/components/cards/mentor-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getMentors } from "@/lib/api";
import { toMentorCardData } from "@/lib/view-models";
import type { MentorCardData } from "@/components/cards/mentor-card";

export default function MentorsPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [mentors, setMentors] = useState<MentorCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMentors() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getMentors(activeFilter ?? undefined);

        if (!isMounted) {
          return;
        }

        if (!activeFilter) {
          const skillFilters = Array.from(
            new Set(
              response.flatMap((mentor) => mentor.skillsOffered ?? []),
            ),
          ).slice(0, 6);
          setFilters(skillFilters);
        }

        setMentors(toMentorCardData(response));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load mentors right now.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMentors();

    return () => {
      isMounted = false;
    };
  }, [activeFilter]);

  return (
    <div className="page-shell page-stack">
      <section className="section-stack max-w-3xl">
        <span className="mb-4 block text-xs font-bold uppercase tracking-widest text-primary">
          Curation for your craft
        </span>
        <h1 className="max-w-2xl font-headline text-5xl font-extrabold leading-none tracking-tighter text-on-background md:text-7xl">
          Discover your <br />
          <span className="inline-block rounded-2xl bg-primary px-4 py-1 text-primary-container">
            next mentor.
          </span>
        </h1>

        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-5 py-2 text-sm font-medium text-on-surface-variant">
            <Icon name="filter_alt" className="text-lg" />
            Filters
          </span>
          {filters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter((current) => (current === filter ? null : filter))}
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

      {error ? (
        <div className="rounded-2xl bg-error/10 px-5 py-4 text-sm font-medium text-error">
          {error}
        </div>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[360px] w-full" />
            ))
          : mentors.map((mentor) => <MentorCard key={mentor.id ?? mentor.name} mentor={mentor} />)}
      </section>

      {!isLoading && mentors.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-low px-6 py-10 text-center">
          <p className="text-lg font-semibold text-on-surface">No mentors found.</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Try a different skill filter to widen the atelier search.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col items-center pt-2">
        <div className="mb-6 h-1 w-24 overflow-hidden rounded-full bg-surface-container-highest">
          <div className="h-full w-1/2 bg-primary" />
        </div>
        <p className="text-sm font-medium text-stone-400">
          {isLoading ? "Loading mentors..." : `Showing ${mentors.length} mentors`}
        </p>
        <Button variant="outline" rounded="xl" className="mt-6 px-12" disabled>
          Curated by Firestore
        </Button>
      </div>
    </div>
  );
}
