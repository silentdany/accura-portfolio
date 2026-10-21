import { PageShell, PDF_ALL } from "@/components/page-shell";
import { ProfileTile } from "@/components/bento/profile-tile";
import { LinksTile } from "@/components/bento/links-tile";
import { NowTile } from "@/components/bento/now-tile";
import { MetricsTile } from "@/components/bento/metrics-tile";
import { PortfolioGrid } from "@/components/bento/portfolio-grid";
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
    ...(initialCategory ? [{ label: `Catégorie « ${categories.find((c) => c.slug === initialCategory)?.name} »`, href: `/api/pdf?scope=category&slug=${initialCategory}` }] : []),
    ...categories.filter((c) => c.count > 0 && c.slug !== initialCategory).map((c) => ({ label: `Catégorie ${c.name}`, href: `/api/pdf?scope=category&slug=${c.slug}` })),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      description: profile.headline,
      url: siteUrl(),
      sameAs: profile.links.map((l) => l.url),
    },
    hasPart: projects
      .filter((p) => !p.locked)
      .map((p) => ({ "@type": "CreativeWork", name: p.name, description: p.tagline ?? undefined, url: p.link })),
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
    <PageShell view={view} pdf={pdf} active="/">
      <JsonLd data={jsonLd} />
      <div className="bento">
        <ProfileTile profile={profile} projectCount={projects.length} />
        <NowTile thread={thread} commitCount={commits.reduce((a, g) => a + g.commits.length, 0)} />
        <MetricsTile projects={projects} />
        <LinksTile links={profile.links} />
      </div>
      <PortfolioGrid projects={projects} categories={categories} initialCategory={initialCategory} />
    </PageShell>
  );
}
