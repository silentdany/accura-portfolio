import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicThread } from "@/lib/portfolio";
import { relativeTime } from "@/lib/format";

export function NowTile({ thread, commitCount }: { thread: PublicThread | null; commitCount: number }) {
  return (
    <Link href="/now" className="tile group cell-wide flex flex-col justify-between bg-ink p-5 text-bg animate-rise [animation-delay:120ms] dark:bg-surface-2 dark:text-ink">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] opacity-70">
        <span className="flex items-center gap-2">
          <span className="live-dot" /> En ce moment
        </span>
        <ArrowRight className="size-4 transition group-hover:translate-x-1" />
      </div>
      <div>
        <h2 className="font-serif text-2xl leading-tight sm:text-3xl">{thread?.title ?? "Rien d'annoncé… pour l'instant"}</h2>
        <p className="mt-1 line-clamp-2 text-sm opacity-75">{thread?.brief ?? "Le brief quotidien apparaîtra ici dès qu'un thread est lancé."}</p>
        <p className="mt-2 font-mono text-[11px] opacity-55">
          {commitCount} commits sur 7 jours{thread?.briefAt ? ` · brief ${relativeTime(thread.briefAt)}` : ""}
        </p>
      </div>
    </Link>
  );
}
