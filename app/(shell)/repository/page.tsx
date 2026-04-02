import { ResourceCard } from "@/components/cards/resource-card";
import { repositoryData, resources } from "@/lib/mock-data";

export default function RepositoryPage() {
  return (
    <div className="page-shell page-stack">
      <section className="section-stack max-w-4xl">
        <h1 className="font-headline text-5xl font-extrabold leading-tight tracking-tighter text-on-background md:text-[3.5rem]">
          Curated Knowledge <br />
          for the <span className="italic text-primary">Digital Craft</span>.
        </h1>
        <p className="max-w-2xl text-lg text-on-surface-variant md:text-xl">
          Access high-fidelity learning materials, framework blueprints, and design
          systems contributed by master mentors within the atelier.
        </p>
      </section>

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {repositoryData.filters.map((filter, index) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full px-6 py-2 text-sm font-medium ${
                index === 0
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="text-sm font-medium">Sort by:</span>
          <button type="button" className="flex items-center gap-1 text-sm font-bold">
            Most Recent
            <span className="material-symbols-outlined text-xs">expand_more</span>
          </button>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource, index) => (
          <ResourceCard
            key={resource.title}
            resource={resource}
            className={index === 0 ? "md:col-span-2 xl:col-span-2" : ""}
          />
        ))}
      </section>

      <div className="flex flex-col items-center pt-2">
        <p className="mb-6 text-sm text-stone-500">Showing 5 of 124 available materials</p>
        <button
          type="button"
          className="rounded-2xl bg-surface-container-high px-12 py-4 font-bold text-on-surface transition-all hover:bg-surface-container-highest"
        >
          Load More Resources
        </button>
      </div>
    </div>
  );
}
