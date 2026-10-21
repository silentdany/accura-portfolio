import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageShell, PDF_ALL } from "@/components/page-shell";
import { RawNow } from "@/components/raw/raw-pages";
import { Timeline } from "@/components/timeline";
import { CommitGroups } from "@/components/commit-groups";
import { Backdrop } from "@/components/backdrop";
import { SectionHeading } from "@/components/section-heading";
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
    <PageShell view={view} pdf={[PDF_ALL]} active="/now" bleed>
      <section className="relative isolate overflow-hidden px-5 pt-16 pb-14 sm:px-8 md:pt-24">
        <Backdrop />
        <header className="shell relative animate-reveal">
          <span className="eyebrow">Now · un seul projet à la fois</span>
          <h1 className="headline mt-7 max-w-4xl">
            {thread ? (
              <>
                {thread.title} <span className="accent-word">en cours.</span>
              </>
            ) : (
              "Pause."
            )}
          </h1>
          {thread?.project && (
            <Link href={`/projects/${thread.project.slug}`} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-ink link-underline">
              Voir le projet {thread.project.name} <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </header>
      </section>

      <div className="px-5 sm:px-8">
        <div className="shell">
          <section className="tile relative overflow-hidden p-7 sm:p-10">
            <div aria-hidden className="bloom -top-40 -right-32 h-96 w-96" />
            <span className="eyebrow relative">Brief du jour</span>
            <blockquote className="relative mt-5 max-w-3xl text-2xl leading-snug font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
              {thread?.brief ?? "Pas encore de brief aujourd'hui."}
            </blockquote>
            <p className="relative mt-6 font-mono text-[11px] text-subtle">
              {thread?.briefAt ? `${formatDate(thread.briefAt)} · ${relativeTime(thread.briefAt)}` : "—"}
              {thread?.threadUrl && (
                <>
                  {" · "}
                  <a href={thread.threadUrl} target="_blank" rel="noopener" className="link-underline text-ink">
                    suivre le thread
                  </a>
                </>
              )}
            </p>
          </section>

          <section className="mt-24">
            <SectionHeading
              eyebrow="Preuves d'activité"
              title={
                <>
                  {total} commits <span className="text-muted">ces 7 derniers jours.</span>
                </>
              }
            />
            <CommitGroups groups={commits} />
          </section>

          {thread && thread.posts.length > 0 && (
            <section className="mt-24">
              <SectionHeading
                eyebrow="Le fil"
                title={
                  <>
                    Le thread, <span className="text-muted">post après post.</span>
                  </>
                }
              />
              <Timeline thread={thread} />
            </section>
          )}

          <p className="mt-20 text-sm text-muted">
            Quand ce thread se termine, il devient une{" "}
            <Link href="/stories" className="link-underline text-ink">
              story
            </Link>{" "}
            avec sa timeline complète.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
