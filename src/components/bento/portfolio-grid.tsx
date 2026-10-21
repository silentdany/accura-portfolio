"use client";

import { useMemo, useState } from "react";
import type { PublicCategory, PublicProject } from "@/lib/portfolio";
import { ProjectTile } from "@/components/bento/project-tile";

type Cat = PublicCategory & { count: number };

/** Category filter + project tiles. Filtering is instant (client-side) and mirrored in ?c= for sharing. */
export function PortfolioGrid({
  projects,
  categories,
  initialCategory,
}: {
  projects: PublicProject[];
  categories: Cat[];
  initialCategory: string | null;
}) {
  const [cat, setCat] = useState<string | null>(initialCategory);
  const visible = useMemo(() => (cat ? projects.filter((p) => p.categories.some((c) => c.slug === cat)) : projects), [cat, projects]);

  function pick(slug: string | null) {
    setCat(slug);
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("c", slug);
    else url.searchParams.delete("c");
    window.history.replaceState(null, "", url);
  }

  const used = categories.filter((c) => c.count > 0);

  return (
    <>
      {used.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-10 mb-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Catégories">
          <Chip active={!cat} onClick={() => pick(null)} label="Tout" count={projects.length} />
          {used.map((c) => (
            <Chip key={c.slug} active={cat === c.slug} onClick={() => pick(c.slug)} label={`${c.emoji ? `${c.emoji} ` : ""}${c.name}`} count={c.count} />
          ))}
        </div>
      )}
      <div className={`bento ${used.length ? "" : "mt-4"}`}>
        {visible.map((p, i) => (
          <ProjectTile key={p.slug} p={p} className="animate-rise" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }} />
        ))}
        {!visible.length && (
          <div className="tile cell-wide grid place-items-center p-6 text-sm text-muted">Aucun projet dans cette catégorie pour l&apos;instant.</div>
        )}
      </div>
    </>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? "border-ink bg-ink text-bg" : "border-line bg-surface/60 text-ink-2 hover:border-line-strong hover:text-ink"
      }`}
    >
      {label}
      <span className={`font-mono text-[10px] ${active ? "opacity-60" : "text-subtle"}`}>{count}</span>
    </button>
  );
}
