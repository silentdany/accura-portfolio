"use client";

import { useActionState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { deleteCategory, moveCategory, saveCategory } from "@/app/admin/actions";
import { Feedback, inputCls, Submit } from "@/components/admin/ui";

type Cat = { id: string; slug: string; name: string; emoji: string | null; count: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [state, action] = useActionState(saveCategory, {});
  return (
    <div className="flex flex-col gap-3">
      {categories.map((c, i) => (
        <CategoryRow key={c.id} c={c} first={i === 0} last={i === categories.length - 1} />
      ))}
      <form action={action} className="tile flex flex-wrap items-center gap-2 p-3">
        <input name="emoji" placeholder="🙂" className={`${inputCls} w-16 text-center`} maxLength={4} />
        <input name="name" required placeholder="Nouvelle catégorie" className={`${inputCls} flex-1`} />
        <Submit>Ajouter</Submit>
        <div className="basis-full">
          <Feedback state={state} />
        </div>
      </form>
    </div>
  );
}

function CategoryRow({ c, first, last }: { c: Cat; first: boolean; last: boolean }) {
  const [state, action] = useActionState(saveCategory, {});
  const [pending, start] = useTransition();
  return (
    <form action={action} className={`tile flex flex-wrap items-center gap-2 p-3 ${pending ? "opacity-60" : ""}`}>
      <input type="hidden" name="id" value={c.id} />
      <input name="emoji" defaultValue={c.emoji ?? ""} className={`${inputCls} w-16 text-center`} maxLength={4} />
      <input name="name" defaultValue={c.name} required className={`${inputCls} flex-1`} />
      <input name="slug" defaultValue={c.slug} pattern="[a-z0-9-]+" className={`${inputCls} w-32 font-mono text-xs`} />
      <span className="w-14 text-center font-mono text-xs text-muted">{c.count}</span>
      <button type="button" disabled={first} onClick={() => start(() => void moveCategory(c.id, -1))} className="grid size-8 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30" aria-label="Monter">
        <ArrowUp className="size-4" />
      </button>
      <button type="button" disabled={last} onClick={() => start(() => void moveCategory(c.id, 1))} className="grid size-8 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-30" aria-label="Descendre">
        <ArrowDown className="size-4" />
      </button>
      <Submit variant="ghost">OK</Submit>
      <button
        type="button"
        onClick={() => confirm(`Supprimer « ${c.name} » ?`) && start(() => void deleteCategory(c.id))}
        className="grid size-8 place-items-center rounded-full text-danger hover:bg-danger/10"
        aria-label="Supprimer"
      >
        <Trash2 className="size-4" />
      </button>
      {(state.error || state.message) && (
        <div className="basis-full">
          <Feedback state={state} />
        </div>
      )}
    </form>
  );
}
