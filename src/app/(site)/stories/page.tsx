import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell, PDF_ALL } from "@/components/page-shell";
import { RawStories } from "@/components/raw/raw-pages";
import { listStories } from "@/lib/portfolio";
import { resolveView } from "@/lib/view-server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Stories",
  description: "Les projets terminés, racontés depuis le premier post jusqu'à la mise en ligne.",
  alternates: { canonical: "/stories", types: { "application/json": "/api/v1/stories" } },
};

export default async function StoriesPage({ searchParams }: PageProps<"/stories">) {
  const sp = await searchParams;
  const [view, stories] = await Promise.all([resolveView(sp.view), listStories()]);

  if (view === "raw") {
    return (
      <PageShell view={view} pdf={[PDF_ALL]}>
        <RawStories stories={stories} />
      </PageShell>
    );
  }

  return (
    <PageShell view={view} pdf={[PDF_ALL]} active="/stories">
      <header className="max-w-3xl animate-rise">
        <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Stories</p>
        <h1 className="mt-4 font-serif text-6xl leading-[0.95] tracking-tight text-ink sm:text-8xl">Ce qui a été construit.</h1>
        <p className="mt-5 text-lg text-ink-2">Chaque thread terminé, du premier post à la mise en ligne.</p>
      </header>
      {stories.length === 0 ? (
        <p className="mt-12 text-muted">Aucune story archivée pour l&apos;instant — le thread en cours est sur la page Now.</p>
      ) : (
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {stories.map((s, i) => {
            const cover = s.cover ?? s.posts.find((p) => p.images.length)?.images[0] ?? null;
            return (
              <li key={s.slug} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <Link href={`/stories/${s.slug}`} className="tile group flex h-full flex-col">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" loading="lazy" className="aspect-[16/8] w-full border-b border-line object-cover transition duration-700 group-hover:scale-[1.02]" />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-mono text-[11px] text-subtle">
                      {formatDate(s.startedAt)} → {formatDate(s.archivedAt)} · {s.posts.length} posts
                    </p>
                    <h2 className="mt-2 font-serif text-3xl text-ink">{s.title}</h2>
                    {(s.summary || s.brief) && <p className="mt-2 line-clamp-3 text-sm text-muted">{s.summary ?? s.brief}</p>}
                    <span className="mt-auto flex items-center gap-1 pt-5 text-sm text-ink">
                      Lire la story <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
