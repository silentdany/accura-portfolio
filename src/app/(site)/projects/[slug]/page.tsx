import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Lock, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { PageShell, PDF_ALL } from "@/components/page-shell";
import { RawProject } from "@/components/raw/raw-pages";
import { ProjectTile } from "@/components/bento/project-tile";
import { Sparkline } from "@/components/sparkline";
import { StatusDot } from "@/components/status-dot";
import { JsonLd } from "@/components/json-ld";
import { getPublicProjectRow, listProjects, presentProject } from "@/lib/portfolio";
import { getWatchIndex, type WatchStats } from "@/lib/watch";
import { isUnlocked } from "@/lib/nda";
import { resolveView } from "@/lib/view-server";
import { delta, formatDate, formatNumber, formatPercent, relativeTime } from "@/lib/format";
import { UnlockForm } from "./unlock-form";

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublicProjectRow(slug);
  if (!row) return { title: "Projet introuvable" };
  const p = presentProject(row);
  const description = p.locked ? p.ndaContext ?? undefined : (p.tagline ?? p.description ?? undefined);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/projects/${p.slug}`, types: { "application/json": `/api/v1/projects/${p.slug}` } },
    openGraph: { type: "article", title: p.name, description, url: `/projects/${p.slug}` },
    twitter: { card: "summary_large_image", title: p.name, description },
    robots: p.locked ? { index: true, follow: true, nocache: true } : undefined,
  };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const row = await getPublicProjectRow(slug);
  if (!row) notFound();
  const [view, unlocked, watch] = await Promise.all([resolveView(sp.view), isUnlocked(row), getWatchIndex()]);
  const p = presentProject(row, { unlocked, watch });
  const pdf = [{ label: `Ce projet (${p.name})`, href: `/api/pdf?scope=project&slug=${p.slug}` }, PDF_ALL];

  if (view === "raw") {
    return (
      <PageShell view={view} pdf={pdf}>
        <RawProject p={p} unlockForm={<UnlockForm slug={p.slug} raw />} />
      </PageShell>
    );
  }

  const others = (await listProjects({ watch })).filter((o) => o.slug !== p.slug && !o.locked).slice(0, 4);
  const jsonLd = p.locked
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: p.name,
        description: p.description ?? p.tagline ?? undefined,
        url: p.url ?? p.link,
        applicationCategory: "WebApplication",
        operatingSystem: "Web",
        dateModified: p.lastUpdatedAt ?? undefined,
        image: p.image ?? undefined,
        codeRepository: p.repoUrl ?? undefined,
        programmingLanguage: p.languages,
        keywords: p.topics.join(", ") || undefined,
      };

  return (
    <PageShell view={view} pdf={pdf} active="/">
      {jsonLd && <JsonLd data={jsonLd} />}
      <Link href="/" className="no-print inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
        <ArrowLeft className="size-4" /> Tous les projets
      </Link>

      <header className="mt-8 max-w-3xl animate-rise">
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {p.nda && (
            <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted">
              <Lock className="size-3" /> NDA
            </span>
          )}
          {p.categories.map((c) => (
            <Link key={c.slug} href={`/?c=${c.slug}`} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 hover:border-line-strong">
              {c.emoji} {c.name}
            </Link>
          ))}
        </div>
        <h1 className="font-serif text-6xl leading-[0.95] tracking-tight text-ink sm:text-8xl">{p.name}</h1>
        {p.tagline && <p className="mt-5 text-xl leading-snug text-ink-2 sm:text-2xl">{p.tagline}</p>}
        {!p.locked && (
          <div className="no-print mt-7 flex flex-wrap items-center gap-2">
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener" className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg transition hover:opacity-90">
                Visiter {p.domain} <ArrowUpRight className="size-4" />
              </a>
            )}
            {p.repoUrl && (
              <a href={p.repoUrl} target="_blank" rel="noopener" className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition hover:border-line-strong">
                <GithubIcon /> Code source
              </a>
            )}
          </div>
        )}
      </header>

      {p.locked ? (
        <section className="tile mt-12 flex flex-col items-start gap-5 p-8 sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--line)_0_1px,transparent_1px_11px)] opacity-60" aria-hidden />
          <span className="relative grid size-12 place-items-center rounded-2xl bg-ink text-bg">
            <Lock className="size-5" />
          </span>
          <div className="relative max-w-lg">
            <h2 className="font-serif text-3xl text-ink">Projet confidentiel</h2>
            <p className="mt-2 text-muted">
              Ce travail est couvert par un accord de confidentialité. Le contexte est public ; le détail (captures, stack, liens, chiffres) est
              réservé aux personnes qui ont le mot de passe.
            </p>
          </div>
          <div className="relative w-full">
            <UnlockForm slug={p.slug} />
          </div>
        </section>
      ) : (
        <>
          {p.image && (
            <figure className="tile mt-12 overflow-hidden p-0 animate-rise [animation-delay:80ms]">
              <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-line-strong" />
                <span className="size-2.5 rounded-full bg-line-strong" />
                <span className="size-2.5 rounded-full bg-line-strong" />
                {p.domain && <span className="ml-3 rounded-md bg-surface px-3 py-0.5 font-mono text-[11px] text-muted">{p.domain}</span>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={`Aperçu de ${p.name}`} className="max-h-[640px] w-full object-cover object-top" />
            </figure>
          )}

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
            <div>
              {p.description && (
                <div className="prose-accura max-w-2xl text-lg">
                  {p.description.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              {p.screenshots.length > 1 && (
                <section className="mt-12">
                  <h2 className="mb-4 text-[11px] uppercase tracking-[0.16em] text-subtle">Captures</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {p.screenshots.slice(1).map((s) => (
                      <a key={s} href={s} target="_blank" rel="noopener" className="tile block overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover object-top transition duration-500 hover:scale-[1.02]" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="flex flex-col gap-4">
              {p.stats && <WatchCard s={p.stats} />}
              <div className="tile p-5">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                  {p.languages.length > 0 && (
                    <>
                      <dt className="text-muted">Stack</dt>
                      <dd className="flex flex-wrap gap-1">
                        {p.languages.map((l) => (
                          <span key={l} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
                            {l}
                          </span>
                        ))}
                      </dd>
                    </>
                  )}
                  {p.topics.length > 0 && (
                    <>
                      <dt className="text-muted">Sujets</dt>
                      <dd className="text-ink-2">{p.topics.join(", ")}</dd>
                    </>
                  )}
                  <dt className="text-muted">Mis à jour</dt>
                  <dd className="text-ink-2" title={formatDate(p.lastUpdatedAt)}>
                    {relativeTime(p.lastUpdatedAt)}
                  </dd>
                  {p.stars > 0 && (
                    <>
                      <dt className="text-muted">Étoiles</dt>
                      <dd className="flex items-center gap-1 text-ink-2">
                        <Star className="size-3.5" /> {p.stars}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </aside>
          </div>
        </>
      )}

      {others.length > 0 && (
        <section className="no-print mt-24">
          <h2 className="mb-4 font-serif text-3xl text-ink">Autres projets</h2>
          <div className="bento">
            {others.map((o) => (
              <ProjectTile key={o.slug} p={{ ...o, size: "sm" }} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function Delta({ cur, prev }: { cur: number | null; prev: number | null }) {
  const d = delta(cur, prev);
  if (d === null) return null;
  const up = d >= 0;
  return <span className={`font-mono text-[11px] ${up ? "text-live" : "text-danger"}`}>{up ? "↑" : "↓"} {formatPercent(Math.abs(d), 0)}</span>;
}

function WatchCard({ s }: { s: WatchStats }) {
  return (
    <div className="tile p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Audience · {s.range} j</p>
        <span className="flex items-center gap-1.5 text-xs text-ink-2">
          <StatusDot status={s.status} />
          {s.status === "up" ? "En ligne" : s.status === "down" ? "Hors ligne" : "—"}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-serif text-5xl leading-none text-ink tabular-nums">{formatNumber(s.visitors)}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            visiteurs <Delta cur={s.visitors} prev={s.visitorsPrev} />
          </p>
        </div>
        {s.series && <Sparkline values={s.series} className="h-12 w-32 text-accent" />}
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-subtle">Clics Google</dt>
          <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">{formatNumber(s.clicks)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-subtle">Erreurs</dt>
          <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">{formatNumber(s.unresolved)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-subtle">Uptime</dt>
          <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">{formatPercent(s.uptime)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[10px] text-subtle">Données Accura Watch · {relativeTime(s.generatedAt)}</p>
    </div>
  );
}
