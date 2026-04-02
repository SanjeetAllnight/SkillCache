import Image from "next/image";
import { notFound } from "next/navigation";

import { ResourceCard } from "@/components/cards/resource-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import { resourceDetailsById } from "@/lib/mock-data";

type ResourceDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return Object.keys(resourceDetailsById).map((id) => ({ id }));
}

export default async function ResourceDetailsPage({
  params,
}: ResourceDetailsPageProps) {
  const { id } = await params;
  const resource = resourceDetailsById[id as keyof typeof resourceDetailsById];

  if (!resource) {
    notFound();
  }

  return (
    <div className="page-shell page-stack">
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant">
        <span>Repository</span>
        <Icon name="chevron_right" className="text-xs" />
        <span className="font-medium text-on-surface">{resource.breadcrumb}</span>
      </nav>

      <header className="section-stack">
        <div className="flex flex-wrap gap-3">
          <Tag>{resource.tags[0]}</Tag>
          <Tag tone="premium">{resource.tags[1]}</Tag>
        </div>

        <h1 className="max-w-4xl font-headline text-4xl font-black leading-[1.1] tracking-tighter text-on-background md:text-6xl">
          {resource.title}
        </h1>

        <div className="flex flex-col justify-between gap-6 border-y border-outline-variant/15 py-8 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Image
              src={resource.author.avatar}
              alt={resource.author.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p className="font-bold text-on-surface">{resource.author.name}</p>
              <p className="text-xs text-on-surface-variant">{resource.author.role}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="white" size="sm">
              <Icon name="favorite" className="text-primary" />
              {resource.likes}
            </Button>
            <Button variant="white" size="sm">
              <Icon name="bookmark" className="text-primary" />
              Save
            </Button>
            <Button variant="white" size="icon">
              <Icon name="share" />
            </Button>
          </div>
        </div>
      </header>

      <article className="grid gap-10 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <div className="space-y-8 text-lg leading-relaxed text-on-surface-variant">
            <p className="text-2xl font-medium italic leading-normal text-on-surface">
              "{resource.introQuote}"
            </p>
            <p>{resource.paragraphs[0]}</p>

            <div className="overflow-hidden rounded-2xl bg-surface-container-highest">
              <div className="relative h-[320px] w-full md:h-[420px]">
                <Image
                  src={resource.figureImage}
                  alt={resource.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              </div>
              <div className="bg-surface-container p-4 text-center text-xs italic text-on-surface-variant">
                {resource.figureCaption}
              </div>
            </div>

            <h2 className="pt-4 font-headline text-3xl font-black tracking-tight text-on-surface">
              {resource.ruleTitle}
            </h2>
            <p>{resource.paragraphs[1]}</p>
            <ul className="list-disc space-y-4 pl-6">
              {resource.ruleItems.map((item) => (
                <li key={item}>
                  <strong>{item.split(":")[0]}:</strong>
                  {item.includes(":") ? ` ${item.split(":").slice(1).join(":").trim()}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-8 xl:col-span-4">
          <div className="sticky top-24 rounded-2xl bg-surface-container p-6 md:p-8">
            <h3 className="mb-6 font-headline text-lg font-bold">Key Takeaways</h3>
            <ul className="space-y-6">
              {resource.takeaways.map((takeaway, index) => (
                <li key={takeaway} className="flex gap-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                    {index + 1}
                  </span>
                  <p className="text-sm text-on-surface-variant">{takeaway}</p>
                </li>
              ))}
            </ul>

            <div className="mt-10 border-t border-outline-variant/20 pt-8">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Resources Included
              </p>
              <div className="space-y-3">
                {resource.includedResources.map((item) => (
                  <ResourceCard key={item.title} resource={item} />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </article>

      <section className="max-w-4xl border-t border-outline-variant/15 pt-12 md:pt-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-headline text-2xl font-black tracking-tight text-on-surface">
            Thoughts &amp; Discussions (24)
          </h2>
          <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <span>Newest first</span>
            <Icon name="expand_more" />
          </div>
        </div>

        <div className="mb-12 rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
          <div className="flex gap-4">
            <Image
              src={resource.commentAvatar}
              alt="Your avatar"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <textarea
              placeholder="Add your perspective..."
              className="min-h-[80px] w-full resize-none border-none bg-transparent text-sm placeholder:text-stone-400 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="solid" size="sm">
              Post Comment
            </Button>
          </div>
        </div>

        <div className="space-y-8 md:space-y-10">
          {resource.comments.map((comment) => (
            <article key={comment.name} className="flex gap-4 md:gap-6">
              <Image
                src={comment.avatar}
                alt={comment.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <span className="font-bold text-on-surface">{comment.name}</span>
                  <span className="text-xs text-on-surface-variant">{comment.time}</span>
                </div>
                <p className="mb-4 leading-relaxed text-on-surface-variant">{comment.body}</p>
                <div className="flex items-center gap-6 text-xs font-bold text-on-surface-variant">
                  <button
                    type="button"
                    className="flex items-center gap-1 transition-colors hover:text-primary"
                  >
                    <Icon name="thumb_up" className="text-lg" />
                    {comment.likes}
                  </button>
                  <button type="button" className="transition-colors hover:text-primary">
                    Reply
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="mt-12 w-full rounded-2xl border border-outline-variant/30 py-4 font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          Load More Discussions
        </button>
      </section>
    </div>
  );
}
