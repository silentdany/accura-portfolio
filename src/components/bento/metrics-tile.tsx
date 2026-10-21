import type { PublicProject } from "@/lib/portfolio";
import { formatNumber } from "@/lib/format";
import { Sparkline } from "@/components/sparkline";

/** Portfolio-wide traffic from Accura Watch (sum of mapped projects). */
export function MetricsTile({ projects }: { projects: PublicProject[] }) {
  const stats = projects.map((p) => p.stats).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const visitors = stats.reduce((a, s) => a + (s.visitors ?? 0), 0);
  const clicks = stats.reduce((a, s) => a + (s.clicks ?? 0), 0);
  const up = stats.filter((s) => s.status === "up").length;
  const len = Math.max(0, ...stats.map((s) => s.series?.length ?? 0));
  const series = Array.from({ length: len }, (_, i) => stats.reduce((a, s) => a + (s.series?.[s.series.length - len + i] ?? 0), 0));
  return (
    <section className="tile cell-sm flex flex-col justify-between p-5 animate-rise [animation-delay:180ms]">
      <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">28 derniers jours</p>
      {stats.length ? (
        <div>
          <p className="font-serif text-4xl leading-none text-ink tabular-nums">{formatNumber(visitors)}</p>
          <p className="mt-1 text-xs text-muted">visiteurs · {formatNumber(clicks)} clics Google</p>
          <Sparkline values={series} className="mt-3 h-8 w-full text-accent" />
          <p className="mt-1 font-mono text-[10px] text-subtle">
            {up}/{stats.length} sites en ligne
          </p>
        </div>
      ) : (
        <div>
          <p className="font-serif text-4xl leading-none text-ink">{projects.length}</p>
          <p className="mt-1 text-xs text-muted">projets en ligne</p>
        </div>
      )}
    </section>
  );
}
