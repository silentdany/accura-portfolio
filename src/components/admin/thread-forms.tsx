"use client";

import { useActionState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  addPostAction,
  archiveThreadAction,
  deletePost,
  deleteThread,
  importXThreadAction,
  reactivateThread,
  startThreadAction,
  updateThreadAction,
} from "@/app/admin/actions";
import { Feedback, Field, inputCls, Submit, Toggle } from "@/components/admin/ui";
import type { PublicThread } from "@/lib/portfolio";
import { formatDate } from "@/lib/format";

type ProjectOpt = { slug: string; name: string };

export function ThreadEditor({ thread, id, projects }: { thread: PublicThread; id: string; projects: ProjectOpt[] }) {
  const [state, action] = useActionState(updateThreadAction, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre">
          <input name="title" defaultValue={thread.title} required className={inputCls} />
        </Field>
        <Field label="Projet lié">
          <select name="project" defaultValue={thread.project?.slug ?? ""} className={inputCls}>
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Brief (2 lignes)" hint={thread.briefAt ? `Dernier brief : ${formatDate(thread.briefAt)}. Les bots Grok le remplacent via POST /api/v1/now/brief.` : "Les bots Grok le remplacent via POST /api/v1/now/brief."}>
        <textarea name="brief" rows={2} defaultValue={thread.brief ?? ""} maxLength={400} className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Repos suivis" hint="owner/repo séparés par des espaces. Vide = tous les repos publics actifs.">
          <input name="repos" defaultValue={thread.repos.join(" ")} placeholder="silentdany/wow-lite" className={inputCls} />
        </Field>
        <Field label="URL du thread (X…)">
          <input name="threadUrl" type="url" defaultValue={thread.threadUrl ?? ""} className={inputCls} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Résumé (story)">
          <textarea name="summary" rows={2} defaultValue={thread.summary ?? ""} className={inputCls} />
        </Field>
        <Field label="Image de couverture">
          <input name="cover" type="url" defaultValue={thread.cover ?? ""} className={inputCls} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Submit>Enregistrer</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AddPostForm({ thread }: { thread: string }) {
  const [state, action] = useActionState(addPostAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="thread" value={thread} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input name="title" placeholder="Titre (optionnel)" className={inputCls} />
        <input name="date" type="datetime-local" className={inputCls} />
      </div>
      <textarea name="body" required rows={3} placeholder="Contenu du post" className={inputCls} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="url" type="url" placeholder="Lien du post" className={inputCls} />
        <input name="images" placeholder="URLs d'images (séparées par des espaces)" className={inputCls} />
      </div>
      <div className="flex items-center gap-4">
        <Toggle name="milestone" label="Jalon" />
        <Submit variant="ghost">Ajouter au fil</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PostList({ posts }: { posts: PublicThread["posts"] }) {
  const [pending, start] = useTransition();
  if (!posts.length) return <p className="text-sm text-muted">Pas encore de posts.</p>;
  return (
    <ol className={`flex flex-col divide-y divide-line ${pending ? "opacity-60" : ""}`}>
      {posts.map((p) => (
        <li key={p.id} className="flex items-start gap-3 py-2.5">
          <span className="w-24 shrink-0 font-mono text-[11px] text-subtle">{formatDate(p.date, true)}</span>
          <p className="line-clamp-2 flex-1 text-sm text-ink-2">
            {p.milestone && <span className="mr-1 rounded bg-accent-soft px-1 text-[10px] text-primary">jalon</span>}
            {p.title && <b className="text-ink">{p.title}. </b>}
            {p.body}
          </p>
          <button type="button" onClick={() => start(() => void deletePost(p.id))} className="grid size-7 place-items-center rounded-full text-danger hover:bg-danger/10" aria-label="Supprimer">
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ArchiveForm({ thread }: { thread: string }) {
  const [state, action] = useActionState(archiveThreadAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="thread" value={thread} />
      <textarea name="summary" rows={2} placeholder="Résumé de la story (optionnel)" className={inputCls} />
      <div className="flex items-center gap-3">
        <Submit variant="danger">Archiver en story</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Paste an X thread URL: everything else is read from the thread. With `url`, a one-click refresh. */
export function ImportXForm({ url, hasActive }: { url?: string; hasActive?: boolean }) {
  const [state, action] = useActionState(importXThreadAction, {});
  return (
    <form action={action} className="grid gap-3">
      {url ? (
        <input type="hidden" name="url" value={url} />
      ) : (
        <input name="url" type="url" required placeholder="https://x.com/toi/status/…" className={inputCls} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Submit>{url ? "Rafraîchir depuis X" : hasActive ? "Importer (archive l'actuel)" : "Importer"}</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function StartThreadForm({ projects, hasActive }: { projects: ProjectOpt[]; hasActive: boolean }) {
  const [state, action] = useActionState(startThreadAction, {});
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="title" required placeholder="Titre du thread (ex : WoW-Lite)" className={inputCls} />
        <select name="project" defaultValue="" className={inputCls}>
          <option value="">Projet lié (optionnel)</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <textarea name="brief" rows={2} placeholder="Premier brief (optionnel)" className={inputCls} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="repos" placeholder="Repos suivis : owner/repo …" className={inputCls} />
        <input name="threadUrl" type="url" placeholder="URL du thread" className={inputCls} />
      </div>
      <div className="flex items-center gap-3">
        <Submit>{hasActive ? "Lancer (archive l'actuel)" : "Lancer"}</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function StoryRow({ story, id, projects }: { story: PublicThread; id: string; projects: ProjectOpt[] }) {
  const [pending, start] = useTransition();
  return (
    <details className={`tile group p-4 ${pending ? "opacity-60" : ""}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="title text-base text-ink">{story.title}</span>
        <span className="font-mono text-[11px] text-subtle">
          {formatDate(story.startedAt, true)} → {formatDate(story.archivedAt, true)} · {story.posts.length} posts
        </span>
        <span className="ml-auto flex gap-2">
          <a href={`/stories/${story.slug}`} target="_blank" className="text-xs text-muted hover:text-ink">
            voir
          </a>
          <button type="button" onClick={() => start(() => void reactivateThread(id))} className="text-xs text-muted hover:text-ink">
            réactiver
          </button>
          <button
            type="button"
            onClick={() => confirm(`Supprimer « ${story.title} » et ses posts ?`) && start(() => void deleteThread(id))}
            className="text-xs text-danger"
          >
            supprimer
          </button>
        </span>
      </summary>
      <div className="mt-4 grid gap-6">
        <ThreadEditor thread={story} id={id} projects={projects} />
        <div>
          <h4 className="mb-2 text-[11px] uppercase tracking-[0.16em] text-subtle">Timeline</h4>
          <PostList posts={story.posts} />
          <div className="mt-3">
            <AddPostForm thread={story.slug} />
          </div>
        </div>
      </div>
    </details>
  );
}
