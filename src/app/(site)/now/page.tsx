import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageShell, PDF_ALL } from "@/components/page-shell";
import { RawNow } from "@/components/raw/raw-pages";
import { Timeline } from "@/components/timeline";
import { CommitGroups } from "@/components/commit-groups";
import { getActiveThread } from "@/lib/portfolio";
import { recentCommits } from "@/lib/now";
import { resolveView } from "@/lib/view-server";
import { formatDate, relativeTime } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getActiveThread();
  return {
    title: "Now",
    description: t ? `En ce moment : ${t.title}. ${t.brief ?? ""}`.trim() : "Ce sur quoi je travaille en ce moment.",
    alternates: { canonical: "/now", types: { "application/json": "/api/v1/now" } },
  };
}

export default async function NowPage({ searchParams }: PageProps<"/now">) {
  const sp = await searchParams;
  const [view, thread] = await Promise.all([resolveView(sp.view), getActiveThread()]);
  const commits = await recentCommits(thread?.repos ?? []);
  const total = commits.reduce((a, g) => a + g.commits.length, 0);

  if (view === "raw") {
    return (
      <PageShell view={view} pdf={[PDF_ALL]}>
        <RawNow thread={thread} commits={commits} />
      </PageShell>
    );
  }

  return (
    <PageShell view={view} pdf={[PDF_ALL]} active="/now">
      <header className="max-w-3xl animate-rise">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-subtle">
          <span className="live-dot" /> Now · un seul projet à la fois
        </p>
        <h1 className="mt-4 font-serif text-6xl leading-[0.95] tracking-tight text-ink sm:text-8xl">{thread?.title ?? "Pause."}</h1>
        {thread?.project && (
          <Link href={`/projects/${thread.project.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            Projet : {thread.project.name} <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </header>

      <section className="tile mt-10 bg-ink p-7 text-bg sm:p-10 dark:bg-surface-2 dark:text-ink">
        <p className="text-[11px] uppercase tracking-[0.16em] opacity-60">Brief du jour</p>
        <blockquote className="mt-3 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">
          {thread?.brief ? <>&ldquo;{thread.brief}&rdquo;</> : "Pas encore de brief aujourd'hui."}
        </blockquote>
        <p className="mt-5 font-mono text-[11px] opacity-55">
          {thread?.briefAt ? `${formatDate(thread.briefAt)} · ${relativeTime(thread.briefAt)}` : "—"}
          {thread?.threadUrl && (
            <>
              {" · "}
              <a href={thread.threadUrl} target="_blank" rel="noopener" className="underline underline-offset-4">
                suivre le thread
              </a>
            </>
          )}
        </p>
      </section>

      <section className="mt-16">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-3xl text-ink">Preuves d&apos;activité</h2>
          <p className="font-mono text-xs text-muted">{total} commits · 7 derniers jours</p>
        </div>
        <CommitGroups groups={commits} />
      </section>

      {thread && thread.posts.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl text-ink">Le fil</h2>
          <Timeline thread={thread} />
        </section>
      )}

      <p className="mt-16 text-sm text-muted">
        Quand ce thread se termine, il devient une{" "}
        <Link href="/stories" className="text-ink underline decoration-line-strong underline-offset-4">
          story
        </Link>{" "}
        avec sa timeline complète.
      </p>
    </PageShell>
  );
}
