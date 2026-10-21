"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Lock, Maximize2, Pencil, Pin, PinOff, Plus, RefreshCw, X } from "lucide-react";
import { createManualProject, patchProject, reorderProjects, syncNow, type ActionState } from "@/app/admin/actions";
import { ProjectEditor } from "@/components/admin/project-editor";
import { Feedback, Field, inputCls, Submit } from "@/components/admin/ui";

export type AdminProject = {
  id: string;
  slug: string;
  name: string;
  rawName: string;
  nameOverride: string | null;
  tagline: string | null;
  taglineOverride: string | null;
  description: string | null;
  descriptionOverride: string | null;
  aiTagline: string | null;
  aiDescription: string | null;
  url: string | null;
  urlOverride: string | null;
  imageOverride: string | null;
  image: string | null;
  screenshots: string[];
  capture: { desktop: string | null; mobile: string | null };
  size: "sm" | "wide" | "tall" | "lg";
  pinned: boolean;
  hidden: boolean;
  manual: boolean;
  nda: boolean;
  ndaContext: string | null;
  hasPassword: boolean;
  watchSlug: string | null;
  watchResolved: string | null;
  categoryIds: string[];
  repoFullName: string | null;
  syncedAt: string | null;
};

export type AdminCategory = { id: string; name: string; emoji: string | null };

const SIZES: AdminProject["size"][] = ["sm", "wide", "tall", "lg"];
const SIZE_LABEL = { sm: "1×1", wide: "2×1", tall: "1×2", lg: "2×2" };

export function ProjectBoard({
  initial,
  categories,
  watchSites,
}: {
  initial: AdminProject[];
  categories: AdminCategory[];
  watchSites: { slug: string; domain: string }[];
}) {
  const [items, setItems] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncState, setSyncState] = useState<ActionState>({});
  const [syncing, startSync] = useTransition();
  const [, startSave] = useTransition();
  const [createState, createAction] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await createManualProject(prev, form);
    if (res.ok) setCreating(false);
    return res;
  }, {});

  // Server data changed (revalidation after an action): adopt it.
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    startSave(() => void reorderProjects(next.map((i) => i.id)));
  }

  function patch(id: string, p: Partial<Pick<AdminProject, "pinned" | "hidden" | "size">>) {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));
    startSave(() => void patchProject(id, p));
  }

  const editingProject = useMemo(() => items.find((i) => i.id === editing) ?? null, [items, editing]);
  const hiddenCount = items.filter((i) => i.hidden).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="title text-3xl text-ink">Projets</h1>
          <p className="mt-1 text-sm text-muted">
            {items.length} projets · {hiddenCount} masqués · glisse-dépose pour réordonner (les épinglés passent devant).
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong"
          >
            <Plus className="size-4" /> Projet manuel
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={() => startSync(async () => setSyncState(await syncNow()))}
            className="flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Synchronisation…" : "Synchroniser"}
          </button>
        </div>
        <div className="basis-full">
          <Feedback state={syncState} />
        </div>
      </div>

      {creating && (
        <form action={createAction} className="tile mb-6 grid gap-3 p-5 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <Field label="Nom">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="URL">
            <input name="url" type="url" className={inputCls} placeholder="https://" />
          </Field>
          <Field label="Description">
            <input name="description" className={inputCls} />
          </Field>
          <Submit>Créer</Submit>
          <div className="sm:col-span-4">
            <Feedback state={createState} />
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="tile p-10 text-center text-muted">
          Aucun projet pour l&apos;instant. Configure <code>VERCEL_TOKEN</code> / <code>GITHUB_TOKEN</code> puis lance une synchronisation.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="bento [grid-auto-rows:132px]! md:[grid-auto-rows:148px]!">
              {items.map((p) => (
                <SortableCard key={p.id} p={p} onPatch={patch} onEdit={() => setEditing(p.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-bg p-6 shadow-2xl animate-rise" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="title text-2xl text-ink">{editingProject.name}</h2>
              <button type="button" onClick={() => setEditing(null)} className="grid size-8 place-items-center rounded-full hover:bg-surface" aria-label="Fermer">
                <X className="size-4" />
              </button>
            </div>
            <ProjectEditor key={editingProject.id} p={editingProject} categories={categories} watchSites={watchSites} onDone={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function SortableCard({
  p,
  onPatch,
  onEdit,
}: {
  p: AdminProject;
  onPatch: (id: string, patch: Partial<Pick<AdminProject, "pinned" | "hidden" | "size">>) => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 30 : undefined };
  const nextSize = SIZES[(SIZES.indexOf(p.size) + 1) % SIZES.length];
  return (
    <div ref={setNodeRef} style={style} className={`tile cell-${p.size} group flex flex-col ${p.hidden ? "opacity-45" : ""} ${isDragging ? "shadow-2xl ring-2 ring-accent" : ""}`}>
      {p.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" className="absolute inset-0 size-full object-cover object-top opacity-25" />
      )}
      <div className="relative flex items-center gap-1 p-2">
        <button type="button" {...attributes} {...listeners} className="grid size-7 cursor-grab place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-ink active:cursor-grabbing" aria-label="Déplacer">
          <GripVertical className="size-4" />
        </button>
        <span className="ml-auto flex items-center gap-0.5 rounded-full bg-surface/90 p-0.5 opacity-80 backdrop-blur transition group-hover:opacity-100">
          <IconBtn title={p.pinned ? "Désépingler" : "Épingler"} onClick={() => onPatch(p.id, { pinned: !p.pinned })} active={p.pinned}>
            {p.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </IconBtn>
          <IconBtn title={p.hidden ? "Afficher" : "Masquer"} onClick={() => onPatch(p.id, { hidden: !p.hidden })} active={p.hidden}>
            {p.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </IconBtn>
          <IconBtn title={`Taille : ${SIZE_LABEL[p.size]} → ${SIZE_LABEL[nextSize]}`} onClick={() => onPatch(p.id, { size: nextSize })}>
            <Maximize2 className="size-3.5" />
          </IconBtn>
          <IconBtn title="Modifier" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </IconBtn>
        </span>
      </div>
      <div className="relative mt-auto p-3">
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted">
          <span className="rounded bg-surface-2 px-1 font-mono">{SIZE_LABEL[p.size]}</span>
          {p.pinned && <span className="rounded bg-accent-soft px-1 text-accent">épinglé</span>}
          {p.nda && (
            <span className="flex items-center gap-0.5 rounded bg-surface-2 px-1">
              <Lock className="size-2.5" /> NDA
            </span>
          )}
          {p.manual && <span className="rounded bg-surface-2 px-1">manuel</span>}
          {p.watchResolved && <span className="rounded bg-surface-2 px-1">watch:{p.watchResolved}</span>}
        </div>
        <button type="button" onClick={onEdit} className="mt-1 block text-left">
          <span className="line-clamp-1 title text-base text-ink">{p.name}</span>
          <span className="line-clamp-1 text-xs text-muted">{p.tagline ?? p.url ?? p.repoFullName}</span>
        </button>
      </div>
    </div>
  );
}

function IconBtn({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={`grid size-7 place-items-center rounded-full transition hover:bg-surface-2 ${active ? "text-accent" : "text-ink-2"}`}>
      {children}
    </button>
  );
}
