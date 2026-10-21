import { prisma } from "@/lib/prisma";
import { presentThread } from "@/lib/portfolio";
import { Card } from "@/components/admin/ui";
import { AddPostForm, ArchiveForm, PostList, StartThreadForm, StoryRow, ThreadEditor } from "@/components/admin/thread-forms";

export default async function AdminNow() {
  const [threads, projects] = await Promise.all([
    prisma.thread.findMany({ include: { posts: { orderBy: { date: "asc" } }, project: true }, orderBy: { startedAt: "desc" } }),
    prisma.project.findMany({ where: { hidden: false }, select: { slug: true, name: true, nameOverride: true }, orderBy: { position: "asc" } }),
  ]);
  const opts = projects.map((p) => ({ slug: p.slug, name: p.nameOverride || p.name }));
  const active = threads.find((t) => t.status === "active");
  const stories = threads.filter((t) => t.status === "archived");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="title text-3xl text-ink">Now & stories</h1>
        <p className="mt-1 text-sm text-muted">Un seul thread actif à la fois. Quand il se termine, archive-le : il devient une page /stories/… autonome.</p>
      </div>

      {active ? (
        <>
          <Card title={`Actif : ${active.title}`} description="Affiché sur /now.">
            <ThreadEditor thread={presentThread(active)} id={active.id} projects={opts} />
          </Card>
          <Card title="Le fil" description="Posts du thread (ex : chaque post X avec ses captures). Les bots peuvent aussi poster via POST /api/v1/now/posts.">
            <PostList posts={presentThread(active).posts} />
            <div className="mt-5 border-t border-line pt-5">
              <AddPostForm thread={active.slug} />
            </div>
          </Card>
          <Card title="Terminer ce thread" description="Archive le thread actif en story, avec sa timeline complète.">
            <ArchiveForm thread={active.slug} />
          </Card>
        </>
      ) : (
        <p className="tile p-6 text-sm text-muted">Aucun thread actif : la page /now affiche « Pause ».</p>
      )}

      <Card title="Nouveau thread" description="Remplace l'entrée Now ; le thread actif éventuel est archivé automatiquement.">
        <StartThreadForm projects={opts} hasActive={Boolean(active)} />
      </Card>

      <div>
        <h2 className="mb-3 title text-xl text-ink">Stories ({stories.length})</h2>
        <div className="flex flex-col gap-3">
          {stories.map((s) => (
            <StoryRow key={s.id} story={presentThread(s)} id={s.id} projects={opts} />
          ))}
          {!stories.length && <p className="text-sm text-muted">Pas encore de story.</p>}
        </div>
      </div>
    </div>
  );
}
