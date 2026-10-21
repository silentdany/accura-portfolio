import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicThread } from "@/lib/portfolio";
import { lastDays, type CommitGroup } from "@/lib/now";
import { relativeTime } from "@/lib/format";

/** Home block linking to /now: the active thread, today's brief, a 7-day commit strip. */
export function NowTeaser({ thread, commits }: { thread: PublicThread | null; commits: CommitGroup[] }) {
  const days = lastDays(7);
  const perDay = days.map((d) => commits.reduce((a, g) => a + g.commits.filter((c) => c.date.slice(0, 10) === d).length, 0));
  const total = perDay.reduce((a, b) => a + b, 0);
  const max = Math.max(...perDay, 1);
  return (
    <Link href="/now" className="tile group grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <span className="eyebrow">En ce moment</span>
        <h2 className="title mt-5 text-3xl text-ink sm:text-4xl">{thread?.title ?? "Rien d'annoncé… pour l'instant"}</h2>
        <p className="mt-3 max-w-2xl text-lg leading-snug text-muted">
          {thread?.brief ?? "Le brief quotidien apparaîtra ici dès qu'un thread est lancé."}
        </p>
        <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
          Voir le fil et les commits
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </p>
      </div>
      <div className="md:w-64">
        <div className="flex h-16 items-end gap-1.5" aria-label="Commits par jour, 7 derniers jours">
          {perDay.map((n, i) => (
            <span
              key={days[i]}
              title={`${days[i]} : ${n}`}
              className={`flex-1 rounded-sm ${n ? "bg-primary" : "bg-line"}`}
              style={{ height: `${n ? 18 + (n / max) * 82 : 8}%` }}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-subtle">
          {total} commits · 7 jours{thread?.briefAt ? ` · brief ${relativeTime(thread.briefAt)}` : ""}
        </p>
      </div>
    </Link>
  );
}
