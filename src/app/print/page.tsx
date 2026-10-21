import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProjectRow, listCategories, listProjects, presentProject, type PublicProject } from "@/lib/portfolio";
import { getProfile } from "@/lib/settings";
import { getWatchIndex } from "@/lib/watch";
import { siteUrl } from "@/lib/env";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { Logo } from "@/components/logo";
import { BrowserShot, PhoneShot } from "@/components/shots";

export const metadata: Metadata = { title: "Export PDF", robots: { index: false } };

/** Print layout rendered by /api/pdf (headless Chromium) — also printable straight from the browser. */
export default async function PrintPage({ searchParams }: PageProps<"/print">) {
  const sp = await searchParams;
  const scope = typeof sp.scope === "string" ? sp.scope : "all";
  const slug = typeof sp.slug === "string" ? sp.slug : null;
  const [profile, watch, categories] = await Promise.all([getProfile(), getWatchIndex(), listCategories()]);

  let projects: PublicProject[] = [];
  let title = "Portfolio";
  if (scope === "project" && slug) {
    const row = await getPublicProjectRow(slug);
    if (!row) notFound();
    projects = [presentProject(row, { watch })];
    title = projects[0].name;
  } else if (scope === "category" && slug) {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) notFound();
    projects = await listProjects({ category: slug, watch });
    title = cat.name;
  } else {
    projects = await listProjects({ watch });
  }

  const base = siteUrl();
  const single = scope === "project";

  return (
    <div className="force-light min-h-screen bg-bg text-ink">
      <style>{`
        @page { size: A4; margin: 14mm 14mm 16mm; }
        html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .avoid { break-inside: avoid; }
      `}</style>
      <div className="mx-auto max-w-[860px] px-8 py-10 print:p-0">
        <header className="flex items-end justify-between gap-6 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Logo size={18} />
              <span className="eyebrow">{single ? "Projet" : scope === "category" ? `Catégorie · ${title}` : "Portfolio"}</span>
            </div>
            <h1 className="mt-3 text-5xl leading-none font-semibold tracking-[-0.045em]">{profile.name}</h1>
            <p className="mt-3 max-w-md text-sm leading-snug text-ink-2">
              {profile.headline} <span className="text-muted">{profile.headlineTail}</span>{" "}
              {profile.headlineAccent && <span className="accent-word">{profile.headlineAccent}</span>}
            </p>
          </div>
          <div className="text-right font-mono text-[10px] leading-relaxed text-muted">
            {profile.email && <p>{profile.email}</p>}
            <p>{base.replace(/^https?:\/\//, "")}</p>
            {profile.links.slice(0, 3).map((l) => (
              <p key={l.url}>{l.url.replace(/^https?:\/\//, "")}</p>
            ))}
          </div>
        </header>

        {single ? (
          <SingleProject p={projects[0]} />
        ) : (
          <main className="mt-8 grid grid-cols-2 gap-5">
            {projects.map((p) => (
              <article key={p.slug} className="avoid overflow-hidden rounded-2xl border border-line bg-surface">
                {p.image && !p.locked && (
                  <div className="border-b border-line bg-surface-2 px-4 pt-4">
                    <BrowserShot src={p.image} domain={p.domain} eager className="rounded-b-none border-b-0 shadow-none" imgClassName="aspect-[16/9]" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-xl leading-tight font-semibold tracking-[-0.03em]">{p.name}</h2>
                    {p.locked ? <span className="text-[10px] uppercase tracking-wider text-subtle">NDA</span> : p.domain && <span className="font-mono text-[10px] text-muted">{p.domain}</span>}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-ink-2">{p.locked ? p.ndaContext : p.tagline}</p>
                  {!p.locked && (
                    <p className="mt-2 font-mono text-[10px] text-subtle">
                      {[p.languages.slice(0, 3).join(" · "), p.stats?.visitors ? `${formatNumber(p.stats.visitors)} visiteurs/28 j` : null].filter(Boolean).join("  —  ")}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </main>
        )}

        <footer className="mt-10 flex justify-between border-t border-line pt-4 font-mono text-[9px] text-subtle">
          <span>Généré le {formatDate(new Date())} · version à jour : {base.replace(/^https?:\/\//, "")}{single ? `/projects/${projects[0].slug}` : ""}</span>
          <span>{projects.length} projet{projects.length > 1 ? "s" : ""}</span>
        </footer>
      </div>
    </div>
  );
}

function SingleProject({ p }: { p: PublicProject }) {
  return (
    <main className="mt-8">
      <h2 className="text-6xl leading-none font-semibold tracking-[-0.045em]">{p.name}</h2>
      <p className="mt-3 text-lg text-ink-2">{p.locked ? p.ndaContext : p.tagline}</p>
      {p.locked ? (
        <p className="mt-6 text-sm text-muted">Projet sous NDA — détails disponibles sur demande.</p>
      ) : (
        <>
          {p.image && (
            <div className="avoid relative mt-6">
              <BrowserShot src={p.image} domain={p.domain} eager imgClassName="max-h-[420px]" className={p.capture.mobile ? "mr-[16%]" : ""} />
              {p.capture.mobile && <PhoneShot src={p.capture.mobile} eager className="absolute right-0 bottom-[-4%] w-[17%]" />}
            </div>
          )}
          <div className="mt-6 grid grid-cols-[1fr_220px] gap-8">
            <div className="text-[13px] leading-relaxed text-ink-2">
              {p.description?.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="mb-3">
                  {para}
                </p>
              ))}
            </div>
            <dl className="avoid space-y-2 text-[11px]">
              {p.url && <Fact k="Site" v={p.domain ?? p.url} />}
              {p.repoUrl && <Fact k="Code" v={p.repoUrl.replace("https://", "")} />}
              {p.languages.length > 0 && <Fact k="Stack" v={p.languages.join(", ")} />}
              <Fact k="Mis à jour" v={formatDate(p.lastUpdatedAt)} />
              {p.stats && (
                <>
                  <Fact k="Visiteurs (28 j)" v={formatNumber(p.stats.visitors)} />
                  <Fact k="Clics Google" v={formatNumber(p.stats.clicks)} />
                  <Fact k="Uptime" v={formatPercent(p.stats.uptime)} />
                </>
              )}
            </dl>
          </div>
          {p.screenshots.length > 1 && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {p.screenshots.slice(1, 5).map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s} src={s} alt="" className="avoid aspect-[16/10] w-full rounded-xl border border-line object-cover object-top" />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-wider text-subtle">{k}</dt>
      <dd className="font-mono text-ink">{v}</dd>
    </div>
  );
}
