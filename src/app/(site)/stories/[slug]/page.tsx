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
      <header className="mt-10 max-w-4xl animate-reveal">
        <span className="eyebrow">
          Story · {formatDate(story.startedAt)} → {formatDate(story.archivedAt)}
        </span>
        <h1 className="headline mt-7">{story.title}</h1>
        {story.summary && <p className="mt-6 max-w-2xl text-xl leading-snug text-muted">{story.summary}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          {story.project && (
            <Link href={`/projects/${story.project.slug}`} className="btn btn-primary">
              Voir le projet {story.project.name}
            </Link>
          )}
          {story.threadUrl && (
            <a href={story.threadUrl} target="_blank" rel="noopener" className="btn btn-outline">
              Thread original <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </header>
      {story.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.cover} alt="" className="mt-14 max-h-[560px] w-full rounded-2xl border border-line object-cover shadow-[var(--shot-shadow)]" />
      )}
      <section className="mt-14">
        <Timeline thread={story} />
      </section>
    </PageShell>
  );
}
