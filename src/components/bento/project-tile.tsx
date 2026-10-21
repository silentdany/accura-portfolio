import Link from "next/link";
import { ArrowUpRight, Lock, Pin, Star } from "lucide-react";
import type { PublicProject } from "@/lib/portfolio";
import { formatNumber } from "@/lib/format";
import { StatusDot } from "@/components/status-dot";
import { Sparkline } from "@/components/sparkline";

/** Deterministic warm/cool tint per project for image-less cards. */
const TINTS = [
  "from-[#e9dcc4] to-[#d8c3a0] dark:from-[#1d1a16] dark:to-[#151310]",
  "from-[#dfe4dc] to-[#c7d1c2] dark:from-[#141a17] dark:to-[#0f1311]",
  "from-[#e6dcd6] to-[#d4bfb3] dark:from-[#1b1615] dark:to-[#120f0e]",
  "from-[#dde2ea] to-[#c5cfdc] dark:from-[#14171c] dark:to-[#0e1014]",
];

function tint(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

function Stats({ p, light }: { p: PublicProject; light?: boolean }) {
  const s = p.stats;
  if (!s) return null;
  const items = [
    s.visitors !== null ? `${formatNumber(s.visitors)} visiteurs` : null,
    s.clicks !== null ? `${formatNumber(s.clicks)} clics` : null,
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <span className={`font-mono text-[11px] tabular-nums ${light ? "text-white/75" : "text-muted"}`} title={`${s.range} derniers jours · Accura Watch`}>
      {items.join(" · ")}
    </span>
  );
}

export function ProjectTile({ p, className = "", style }: { p: PublicProject; className?: string; style?: React.CSSProperties }) {
  const big = p.size === "lg" || p.size === "tall";
  const href = `/projects/${p.slug}`;

  if (p.locked) {
    return (
      <Link href={href} className={`tile group cell-${p.size} flex flex-col justify-between p-5 ${className}`} style={style}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
            <Lock className="size-3" /> NDA
          </span>
          {p.pinned && <Pin className="size-3.5 text-subtle" />}
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-5 -top-24 h-24 bg-[repeating-linear-gradient(135deg,var(--line)_0_1px,transparent_1px_9px)] opacity-70"
          />
          <h3 className="font-serif text-2xl leading-tight tracking-tight text-ink sm:text-[28px]">{p.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{p.ndaContext}</p>
        </div>
      </Link>
    );
  }

  if (p.image) {
    return (
      <Link href={href} className={`tile group cell-${p.size} isolate flex flex-col justify-end ${className}`} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-10 size-full object-cover object-top transition duration-700 ease-out group-hover:scale-[1.035]"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {p.pinned && (
            <span className="grid size-7 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md">
              <Pin className="size-3.5" />
            </span>
          )}
          <span className="grid size-7 translate-y-1 place-items-center rounded-full bg-white/90 text-black opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
        <div className="p-5 text-white">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] text-white/70">
            {p.stats && <StatusDot status={p.stats.status} />}
            {p.domain && <span className="font-mono">{p.domain}</span>}
          </div>
          <h3 className={`font-serif leading-[1.05] tracking-tight ${big ? "text-4xl sm:text-5xl" : "text-2xl sm:text-[28px]"}`}>{p.name}</h3>
          {p.tagline && <p className={`mt-1 text-sm text-white/80 ${big ? "line-clamp-3 max-w-md" : "line-clamp-1"}`}>{p.tagline}</p>}
          <div className="mt-2 flex items-center gap-3">
            <Stats p={p} light />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className={`tile group cell-${p.size} flex flex-col justify-between bg-linear-to-br p-5 ${tint(p.slug)} ${className}`} style={style}>
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-surface/70 font-serif text-2xl text-ink shadow-sm backdrop-blur">
          {p.name.slice(0, 1)}
        </span>
        <div className="flex items-center gap-1.5">
          {p.pinned && <Pin className="size-3.5 text-muted" />}
          {p.stars > 0 && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
              <Star className="size-3" /> {p.stars}
            </span>
          )}
          {p.language && <span className="rounded-full bg-surface/60 px-2 py-0.5 font-mono text-[10px] text-ink-2">{p.language}</span>}
        </div>
      </div>
      <div>
        <h3 className={`font-serif leading-[1.05] tracking-tight text-ink ${big ? "text-4xl" : "text-2xl sm:text-[28px]"}`}>{p.name}</h3>
        {p.tagline && <p className={`mt-1 text-sm text-ink-2/80 ${big ? "line-clamp-4" : "line-clamp-2"}`}>{p.tagline}</p>}
        <div className="mt-2 flex items-center gap-2">
          {p.stats && <StatusDot status={p.stats.status} />}
          {p.domain && <span className="font-mono text-[11px] text-muted">{p.domain}</span>}
          {p.stats?.series && p.size !== "sm" && <Sparkline values={p.stats.series} className="ml-auto h-6 w-24 text-ink/60" />}
        </div>
        {p.size !== "sm" && (
          <div className="mt-1">
            <Stats p={p} />
          </div>
        )}
      </div>
    </Link>
  );
}
