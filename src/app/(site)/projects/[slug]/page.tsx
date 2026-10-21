import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Lock, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { PageShell, PDF_ALL } from "@/components/page-shell";
import { RawProject } from "@/components/raw/raw-pages";
import { ProjectTile } from "@/components/bento/project-tile";
import { Sparkline } from "@/components/sparkline";
import { Backdrop } from "@/components/backdrop";
import { BrowserShot, PhoneShot } from "@/components/shots";
import { SectionHeading } from "@/components/section-heading";
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
  const description = p.locked ? (p.ndaContext ?? undefined) : (p.tagline ?? p.description ?? undefined);
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
    <PageShell view={view} pdf={pdf} active="/" bleed>
      {jsonLd && <JsonLd data={jsonLd} />}
      <section className="relative isolate overflow-hidden px-5 pt-10 pb-12 sm:px-8 sm:pt-14">
        <Backdrop />
        <div className="shell relative">
          <Link href="/#projets" className="no-print inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
            <ArrowLeft className="size-4" /> Tous les projets
          </Link>

          <header className="mt-10 max-w-4xl animate-reveal">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{p.nda ? "Projet sous NDA" : (p.categories[0]?.name ?? "Projet")}</span>
              {p.categories.slice(p.nda ? 0 : 1).map((c) => (
                <Link
                  key={c.slug}
                  href={`/?c=${c.slug}#projets`}
                  className="rounded-full border border-line bg-surface/70 px-2.5 py-0.5 text-xs text-muted hover:text-ink"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <h1 className="headline mt-6">{p.name}</h1>
            {p.tagline && <p className="mt-6 max-w-2xl text-xl leading-snug text-muted sm:text-2xl">{p.tagline}</p>}
            {!p.locked && (
              <div className="no-print mt-9 flex flex-wrap items-center gap-3">
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener" className="btn btn-primary btn-lg group">
                    Visiter {p.domain} <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                )}
                {p.repoUrl && (
                  <a href={p.repoUrl} target="_blank" rel="noopener" className="btn btn-outline btn-lg">
                    <GithubIcon /> Code source
                  </a>
                )}
                {p.stats && (
                  <span className="ml-1 inline-flex items-center gap-2 text-sm text-muted">
                    <StatusDot status={p.stats.status} />
                    {p.stats.status === "up" ? "En ligne" : p.stats.status === "down" ? "Hors ligne" : "Statut inconnu"}
                  </span>
                )}
              </div>
            )}
          </header>
        </div>
      </section>

      <div className="px-5 sm:px-8">
        <div className="shell">
          {p.locked ? (
            <section className="tile flex flex-col items-start gap-6 p-8 sm:p-12">
              <div
                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--line)_0_1px,transparent_1px_11px)] opacity-60"
                aria-hidden
              />
              <span className="relative grid size-12 place-items-center rounded-xl bg-ink text-bg">
                <Lock className="size-5" />
              </span>
              <div className="relative max-w-lg">
                <h2 className="title text-3xl text-ink">Projet confidentiel</h2>
                <p className="mt-3 leading-relaxed text-muted">
                  Ce travail est couvert par un accord de confidentialité. Le contexte est public ; le détail (captures, stack, liens, chiffres) est réservé aux
                  personnes qui ont le mot de passe.
                </p>
              </div>
              <div className="relative w-full">
                <UnlockForm slug={p.slug} />
              </div>
            </section>
          ) : (
            <>
              {(p.image || p.capture.mobile) && (
                <figure className="relative animate-reveal [animation-delay:120ms]">
                  <div className={p.capture.mobile ? "lg:pr-[14%]" : ""}>
                    {p.image ? (
                      <BrowserShot src={p.image} domain={p.domain} alt={`Aperçu de ${p.name}`} eager className="rounded-2xl" imgClassName="max-h-[720px]" />
                    ) : null}
                  </div>
                  {p.capture.mobile && (
                    <PhoneShot
                      src={p.capture.mobile}
                      alt={`${p.name} sur mobile`}
                      eager
                      className={p.image ? "absolute right-0 bottom-[-6%] hidden w-[19%] lg:block" : "mx-auto w-64"}
                    />
                  )}
                </figure>
              )}

              <div className="mt-20 grid gap-12 lg:grid-cols-[1fr_340px]">
                <div>
                  <span className="eyebrow">Le projet</span>
                  {p.description ? (
                    <div className="prose-accura mt-6 max-w-2xl text-lg">
                      {p.description.split(/\n{2,}/).map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-6 text-muted">Pas encore de description.</p>
                  )}
                  {p.screenshots.filter((s) => s !== p.image).length > 0 && (
                    <section className="mt-14">
                      <span className="eyebrow">Captures</span>
                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        {p.screenshots
                          .filter((s) => s !== p.image)
                          .map((s) => (
                            <a key={s} href={s} target="_blank" rel="noopener" className="block transition-transform hover:-translate-y-1">
                              <BrowserShot src={s} imgClassName="aspect-[16/10]" />
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
                              <span key={l} className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
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
            <section className="no-print mt-28">
              <SectionHeading
                eyebrow="Portfolio"
                title={
                  <>
                    Autres projets <span className="text-muted">en ligne.</span>
                  </>
                }
              />
              <div className="bento">
                {others.map((o) => (
                  <ProjectTile key={o.slug} p={{ ...o, size: "sm" }} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Delta({ cur, prev }: { cur: number | null; prev: number | null }) {
  const d = delta(cur, prev);
  if (d === null) return null;
  const up = d >= 0;
  return (
    <span className={`font-mono text-[11px] ${up ? "text-live" : "text-danger"}`}>
      {up ? "↑" : "↓"} {formatPercent(Math.abs(d), 0)}
    </span>
  );
}

function WatchCard({ s }: { s: WatchStats }) {
  return (
    <div className="tile p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Audience · {s.range} j</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-2">
          <StatusDot status={s.status} />
          {s.status === "up" ? "En ligne" : s.status === "down" ? "Hors ligne" : "—"}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-5xl leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums">{formatNumber(s.visitors)}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            visiteurs <Delta cur={s.visitors} prev={s.visitorsPrev} />
          </p>
        </div>
        {s.series && <Sparkline values={s.series} className="h-12 w-32 text-primary" />}
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
