import { GitCommitHorizontal } from "lucide-react";
import type { CommitGroup } from "@/lib/now";
import { relativeTime } from "@/lib/format";
import { GithubIcon } from "@/components/icons";

/** 7-day activity proof: commits grouped by repo, with a per-day density strip. */
export function CommitGroups({ groups, days = 7 }: { groups: CommitGroup[]; days?: number }) {
  if (!groups.length) return <p className="text-sm text-muted">Aucun commit public ces {days} derniers jours.</p>;
  const today = new Date();
  const dayKeys = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * 86400_000);
    return d.toISOString().slice(0, 10);
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => {
        const perDay = dayKeys.map((k) => g.commits.filter((c) => c.date.slice(0, 10) === k).length);
        const max = Math.max(...perDay, 1);
        return (
          <section key={g.repo} className="tile p-5">
            <header className="flex items-center gap-2">
              <GithubIcon className="size-4 text-muted" />
              <a href={g.url} target="_blank" rel="noopener" className="truncate font-mono text-sm font-medium text-ink hover:underline">
                {g.repo}
              </a>
              <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted">{g.commits.length}</span>
            </header>
            <div className="mt-3 flex h-6 items-end gap-1" aria-label="Commits par jour">
              {perDay.map((n, i) => (
                <span
                  key={dayKeys[i]}
                  title={`${dayKeys[i]} : ${n} commit${n > 1 ? "s" : ""}`}
                  className="flex-1 rounded-sm bg-primary"
                  style={{ height: `${n ? 20 + (n / max) * 80 : 6}%`, opacity: n ? 1 : 0.18 }}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {g.commits.slice(0, 6).map((c) => (
                <li key={c.sha} className="flex gap-2 text-sm">
                  <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-subtle" />
                  <a href={c.url} target="_blank" rel="noopener" className="line-clamp-1 flex-1 text-ink-2 hover:text-ink">
                    {c.message}
                  </a>
                  <span className="shrink-0 font-mono text-[11px] text-subtle">{relativeTime(c.date)}</span>
                </li>
              ))}
              {g.commits.length > 6 && <li className="pl-6 text-xs text-subtle">+ {g.commits.length - 6} autres</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
