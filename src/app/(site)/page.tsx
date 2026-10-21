import { headlineText } from "@/lib/profile-text";
import { PageShell, PDF_ALL } from "@/components/page-shell";
import { HomeHero } from "@/components/bento/home-hero";
import { NowTeaser } from "@/components/bento/now-teaser";
import { PortfolioGrid } from "@/components/bento/portfolio-grid";
import { SectionHeading } from "@/components/section-heading";
import { RawHome } from "@/components/raw/raw-pages";
import { JsonLd } from "@/components/json-ld";
import { getActiveThread, listCategories, listProjects } from "@/lib/portfolio";
import { getProfile } from "@/lib/settings";
import { getWatchIndex } from "@/lib/watch";
import { recentCommits } from "@/lib/now";
import { resolveView } from "@/lib/view-server";
import { siteUrl } from "@/lib/env";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const [view, profile, watch, thread, categories] = await Promise.all([
    resolveView(sp.view),
    getProfile(),
    getWatchIndex(),
    getActiveThread(),
    listCategories(),
  ]);
  const projects = await listProjects({ watch });
  const initialCategory = typeof sp.c === "string" && categories.some((c) => c.slug === sp.c) ? sp.c : null;
  const pdf = [
    PDF_ALL,
    ...(initialCategory
      ? [{ label: `Catégorie « ${categories.find((c) => c.slug === initialCategory)?.name} »`, href: `/api/pdf?scope=category&slug=${initialCategory}` }]
      : []),
    ...categories
      .filter((c) => c.count > 0 && c.slug !== initialCategory)
      .map((c) => ({ label: `Catégorie ${c.name}`, href: `/api/pdf?scope=category&slug=${c.slug}` })),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      description: headlineText(profile),
      url: siteUrl(),
      sameAs: profile.links.map((l) => l.url),
    },
    hasPart: projects.filter((p) => !p.locked).map((p) => ({ "@type": "CreativeWork", name: p.name, description: p.tagline ?? undefined, url: p.link })),
  };

  if (view === "raw") {
    return (
      <PageShell view={view} pdf={pdf}>
        <RawHome profile={profile} projects={projects} thread={thread} />
      </PageShell>
    );
  }

  const commits = await recentCommits(thread?.repos ?? []);
  return (
    <PageShell view={view} pdf={pdf} active="/" bleed>
      <JsonLd data={jsonLd} />
      <HomeHero profile={profile} projects={projects} thread={thread} />
      <section className="px-5 pt-8 sm:px-8">
        <div className="shell">
          <SectionHeading
            id="projets"
            eyebrow="Projets"
            title={
              <>
                Tout ce qui tourne en ligne, <span className="text-muted">capturé et mis à jour chaque semaine.</span>
              </>
            }
          />
          <PortfolioGrid projects={projects} categories={categories} initialCategory={initialCategory} />
        </div>
      </section>
      <section className="px-5 pt-20 sm:px-8">
        <div className="shell">
          <NowTeaser thread={thread} commits={commits} />
        </div>
      </section>
    </PageShell>
  );
}
