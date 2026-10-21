"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowUpRight, Lock, Pin } from "lucide-react";
import type { PublicProject } from "@/lib/portfolio";
import { formatNumber } from "@/lib/format";
import { StatusDot } from "@/components/status-dot";
import { Sparkline } from "@/components/sparkline";
import { BrowserShot, EmptyShot, PhoneShot } from "@/components/shots";

/** The site's own icon when the sync found one, otherwise a monogram (never a broken image). */
export function ProjectIcon({ p, size = "size-8" }: { p: Pick<PublicProject, "name" | "icon">; size?: string }) {
  return p.icon ? (
    <img src={p.icon} alt="" loading="lazy" decoding="async" className={`${size} shrink-0 rounded-lg border border-line bg-surface object-contain p-1`} />
  ) : (
    <span className={`grid ${size} shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-xs font-semibold text-ink`}>{p.name.slice(0, 1)}</span>
  );
}

function Stats({ p, compact = false }: { p: PublicProject; compact?: boolean }) {
  const s = p.stats;
  if (!s || (s.visitors === null && s.clicks === null)) return null;
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-muted" title={`${s.range} derniers jours · Accura Watch`}>
      {s.visitors !== null && (
        <span>
          <b className="font-medium text-ink">{formatNumber(s.visitors)}</b> visiteurs
        </span>
      )}
      {!compact && s.clicks !== null && (
        <span>
          <b className="font-medium text-ink">{formatNumber(s.clicks)}</b> clics
        </span>
      )}
      {!compact && s.series && <Sparkline values={s.series} className="h-5 w-16 text-primary" />}
    </div>
  );
}

function Header({ p, big = false }: { p: PublicProject; big?: boolean }) {
  return (
    <div className="relative z-10">
      <div className="flex items-center gap-2.5">
        <ProjectIcon p={p} />
        <div className="min-w-0 flex-1">
          <h3 className={`title truncate text-ink ${big ? "text-2xl sm:text-[28px]" : "text-[17px]"}`}>{p.name}</h3>
          {p.domain && (
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-subtle">
              {p.stats && <StatusDot status={p.stats.status} />}
              <span className="truncate">{p.domain}</span>
            </p>
          )}
        </div>
        {p.pinned && <Pin className="size-3.5 shrink-0 text-subtle" aria-label="Épinglé" />}
        <ArrowUpRight className="size-4 shrink-0 text-subtle transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      {p.tagline && (
        <p className={`mt-3 text-ink-2 ${big ? "max-w-md text-lg leading-snug" : "line-clamp-2 text-sm leading-relaxed"}`}>{p.tagline}</p>
      )}
    </div>
  );
}

/** Desktop capture (or fallback) as a browser window peeking from the bottom of the card. */
function Desktop({ p, className = "" }: { p: PublicProject; className?: string }) {
  const src = p.image;
  const shift = "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5";
  return src ? (
    <BrowserShot src={src} domain={p.domain} alt={`Aperçu de ${p.name}`} className={`${shift} ${className}`} imgClassName="aspect-[16/10]" />
  ) : (
    <EmptyShot name={p.name} domain={p.domain} className={`${shift} ${className}`} />
  );
}

export function ProjectTile({ p, className = "", style }: { p: PublicProject; className?: string; style?: React.CSSProperties }) {
  const href = `/projects/${p.slug}`;
  const base = `tile group cell-${p.size} flex flex-col ${className}`;

  if (p.locked) {
    return (
      <Link href={href} className={`${base} p-5`} style={style}>
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-bg">
            <Lock className="size-3.5" />
          </span>
          <h3 className="title flex-1 truncate text-[17px] text-ink">{p.name}</h3>
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">NDA</span>
        </div>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-2">{p.ndaContext}</p>
        <div className="relative mt-auto h-24 overflow-hidden rounded-xl border border-line bg-[repeating-linear-gradient(135deg,var(--line)_0_1px,transparent_1px_10px)]">
          <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">Accès protégé</span>
        </div>
      </Link>
    );
  }

  if (p.size === "wide") {
    return (
      <Link href={href} className={`${base} p-5 sm:flex-row sm:gap-5`} style={style}>
        <div className="flex flex-col sm:w-[44%] sm:shrink-0">
          <Header p={p} />
          <div className="mt-auto pt-4">
            <Stats p={p} />
          </div>
        </div>
        <div className="relative mt-4 flex-1 sm:mt-0">
          <Desktop p={p} className="absolute top-2 -right-12 left-0 sm:top-6" />
        </div>
      </Link>
    );
  }

  if (p.size === "tall") {
    return (
      <Link href={href} className={`${base} p-5`} style={style}>
        <Header p={p} />
        <div className="mt-3">
          <Stats p={p} compact />
        </div>
        <div className="relative mt-5 flex-1">
          {p.capture.mobile ? (
            <PhoneShot
              src={p.capture.mobile}
              alt={`${p.name} sur mobile`}
              className="absolute top-0 left-1/2 w-[68%] -translate-x-1/2 transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:-translate-x-1/2"
            />
          ) : (
            <Desktop p={p} className="absolute inset-x-0 top-0" />
          )}
        </div>
      </Link>
    );
  }

  if (p.size === "lg") {
    return (
      <Link href={href} className={`${base} p-6 sm:p-7`} style={style}>
        <Header p={p} big />
        <div className="mt-4">
          <Stats p={p} />
        </div>
        <div className="relative mt-6 flex-1">
          <Desktop p={p} className="absolute top-0 -right-10 left-0" />
          {p.capture.mobile && (
            <PhoneShot
              src={p.capture.mobile}
              alt=""
              className="absolute top-16 right-4 hidden w-[24%] transition-transform delay-75 duration-500 group-hover:-translate-y-3 sm:block"
            />
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className={`${base} p-5`} style={style}>
      <Header p={p} />
      <div className="relative mt-4 flex-1">
        <Desktop p={p} className="absolute top-0 -right-8 left-0" />
      </div>
    </Link>
  );
}
