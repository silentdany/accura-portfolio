import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PageShell, PDF_ALL } from "@/components/page-shell";
import { RawTimeline } from "@/components/raw/raw-pages";
import { Timeline } from "@/components/timeline";
import { JsonLd } from "@/components/json-ld";
import { getStory } from "@/lib/portfolio";
import { resolveView } from "@/lib/view-server";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/stories/[slug]">): Promise<Metadata> {
  const s = await getStory((await params).slug);
  if (!s) return { title: "Story introuvable" };
  const description = s.summary ?? s.brief ?? `${s.posts.length} étapes, du ${formatDate(s.startedAt)} au ${formatDate(s.archivedAt)}.`;
  return {
    title: s.title,
    description,
    alternates: { canonical: `/stories/${s.slug}`, types: { "application/json": `/api/v1/stories/${s.slug}` } },
    openGraph: { type: "article", title: s.title, description, publishedTime: s.startedAt, modifiedTime: s.archivedAt ?? undefined },
  };
}

export default async function StoryPage({ params, searchParams }: PageProps<"/stories/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const story = await getStory(slug);
  if (!story) notFound();
  const view = await resolveView(sp.view);

  if (view === "raw") {
    return (
      <PageShell view={view} pdf={[PDF_ALL]}>
        <h1>{story.title}</h1>
        <p>
          {formatDate(story.startedAt)} → {formatDate(story.archivedAt)}
        </p>
        {story.summary && <p>{story.summary}</p>}
        <RawTimeline thread={story} />
        <p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- raw view: plain HTML */}
          <a href="/stories?view=raw">&larr; toutes les stories</a>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell view={view} pdf={[PDF_ALL]} active="/stories">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: story.title,
          datePublished: story.startedAt,
          dateModified: story.archivedAt ?? story.startedAt,
          description: story.summary ?? undefined,
          image: story.cover ?? undefined,
        }}
      />
      <Link href="/stories" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Toutes les stories
      </Link>
      <header className="mt-8 max-w-3xl animate-rise">
        <p className="font-mono text-[11px] text-subtle">
          {formatDate(story.startedAt)} → {formatDate(story.archivedAt)} · {story.posts.length} étapes
        </p>
        <h1 className="mt-4 font-serif text-6xl leading-[0.95] tracking-tight text-ink sm:text-8xl">{story.title}</h1>
        {story.summary && <p className="mt-6 text-xl leading-snug text-ink-2">{story.summary}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          {story.project && (
            <Link href={`/projects/${story.project.slug}`} className="rounded-full bg-ink px-4 py-2 text-sm text-bg">
              Voir le projet {story.project.name}
            </Link>
          )}
          {story.threadUrl && (
            <a href={story.threadUrl} target="_blank" rel="noopener" className="flex items-center gap-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink">
              Thread original <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </header>
      {story.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.cover} alt="" className="tile mt-12 max-h-[560px] w-full object-cover" />
      )}
      <section className="mt-14">
        <Timeline thread={story} />
      </section>
    </PageShell>
  );
}
