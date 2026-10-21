"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { deleteProject, recapture, saveProject, type ActionState } from "@/app/admin/actions";
import { BrowserShot, PhoneShot } from "@/components/shots";
import type { AdminCategory, AdminProject } from "@/components/admin/project-board";
import { Feedback, Field, inputCls, Submit, Toggle } from "@/components/admin/ui";

export function ProjectEditor({
  p,
  categories,
  watchSites,
  onDone,
}: {
  p: AdminProject;
  categories: AdminCategory[];
  watchSites: { slug: string; domain: string }[];
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveProject, {});
  const [nda, setNda] = useState(p.nda);
  const [image, setImage] = useState(p.imageOverride ?? "");
  const [deleting, startDelete] = useTransition();
  const [capturing, startCapture] = useTransition();
  const [captureState, setCaptureState] = useState<ActionState>({});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  const images = [...new Set(p.screenshots)];

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={p.id} />

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="eyebrow">Captures live</h3>
          <button
            type="button"
            disabled={capturing}
            onClick={() => startCapture(async () => setCaptureState(await recapture(p.id)))}
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium text-ink hover:border-line-strong disabled:opacity-60"
          >
            {capturing ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {capturing ? "Capture en cours…" : "Recapturer"}
          </button>
        </div>
        {p.capture.desktop || p.capture.mobile ? (
          <div className="relative pr-[18%]">
            {p.capture.desktop && <BrowserShot src={p.capture.desktop} domain={p.url?.replace(/^https?:\/\//, "")} imgClassName="aspect-[16/10]" />}
            {p.capture.mobile && <PhoneShot src={p.capture.mobile} className="absolute right-0 bottom-[-8%] w-[20%]" />}
          </div>
        ) : (
          <p className="text-sm text-muted">Pas encore de capture : elles sont prises à la sync (desktop + mobile), ou avec « Recapturer ».</p>
        )}
        {(captureState.error || captureState.message) && (
          <p className={`text-sm whitespace-pre-line ${captureState.error ? "text-danger" : "text-live"}`}>{captureState.error ?? captureState.message}</p>
        )}
      </section>

      <section className="grid gap-4">
        <h3 className="eyebrow">Contenu (vide = donnée synchronisée)</h3>
        <Field label="Nom affiché" hint={`Sync : ${p.rawName}`}>
          <input name="nameOverride" defaultValue={p.nameOverride ?? ""} placeholder={p.rawName} className={inputCls} />
        </Field>
        <Field label="Accroche" hint={p.aiTagline ? `IA : ${p.aiTagline}` : undefined}>
          <input name="taglineOverride" defaultValue={p.taglineOverride ?? ""} placeholder={p.aiTagline ?? p.description ?? ""} className={inputCls} />
        </Field>
        <Field label="Description" hint={p.aiDescription ? "Une description IA existe ; elle est utilisée si ce champ est vide." : undefined}>
          <textarea name="descriptionOverride" rows={5} defaultValue={p.descriptionOverride ?? ""} placeholder={p.aiDescription ?? p.description ?? ""} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="URL" hint={p.url ? `Sync : ${p.url}` : undefined}>
            <input name="urlOverride" type="url" defaultValue={p.urlOverride ?? ""} placeholder={p.url ?? "https://"} className={inputCls} />
          </Field>
          <Field label="Slug" hint={`/projects/${p.slug}`}>
            <input name="slug" defaultValue={p.slug} pattern="[a-z0-9-]+" className={inputCls} />
          </Field>
        </div>
        <Field label="Image de la carte" hint="Vide = capture live. Sinon une URL libre ou une image du README.">
          <input name="imageOverride" value={image} onChange={(e) => setImage(e.target.value)} placeholder={p.image ?? "https://"} className={inputCls} />
        </Field>
        {images.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {images.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setImage(src === image ? "" : src)}
                className={`shrink-0 overflow-hidden rounded-lg border-2 ${src === image ? "border-ink" : "border-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-16 w-28 object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4">
        <h3 className="eyebrow">Affichage</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Taille de la carte">
            <select name="size" defaultValue={p.size} className={inputCls}>
              <option value="sm">Petite (1×1)</option>
              <option value="wide">Large (2×1)</option>
              <option value="tall">Haute (1×2)</option>
              <option value="lg">Grande (2×2)</option>
            </select>
          </Field>
          <Field label="Site Accura Watch" hint={p.watchResolved && !p.watchSlug ? `Auto : ${p.watchResolved}` : "Auto = correspondance par domaine."}>
            <select name="watchSlug" defaultValue={p.watchSlug ?? ""} className={inputCls}>
              <option value="">Auto (domaine)</option>
              {watchSites.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.slug} — {s.domain}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-5">
          <Toggle name="pinned" defaultChecked={p.pinned} label="Épinglé" />
          <Toggle name="hidden" defaultChecked={p.hidden} label="Masqué" />
          <Toggle name="manual" defaultChecked={p.manual} label="Verrouillé (ignoré par la sync)" />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">Catégories</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input type="checkbox" name="categories" value={c.id} defaultChecked={p.categoryIds.includes(c.id)} className="peer sr-only" />
                <span className="block rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2 transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg">
                  {c.emoji} {c.name}
                </span>
              </label>
            ))}
            {!categories.length && <span className="text-sm text-muted">Crée des catégories dans l&apos;onglet dédié.</span>}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" name="nda" checked={nda} onChange={(e) => setNda(e.target.checked)} className="size-4 accent-current" />
          Mode NDA (confidentiel)
        </label>
        {nda && (
          <>
            <Field label="Phrase de contexte (publique)">
              <input name="ndaContext" defaultValue={p.ndaContext ?? ""} placeholder="Plateforme B2B pour un acteur de la logistique" className={inputCls} />
            </Field>
            <Field label={p.hasPassword ? "Nouveau mot de passe (laisser vide pour garder l'actuel)" : "Mot de passe"}>
              <input name="ndaPassword" type="text" autoComplete="off" className={inputCls} />
            </Field>
            {p.hasPassword && <Toggle name="ndaClear" label="Supprimer le mot de passe" />}
          </>
        )}
        {!nda && <input type="hidden" name="ndaContext" value={p.ndaContext ?? ""} />}
      </section>

      <Feedback state={state} />
      <div className="flex items-center gap-2">
        <Submit>Enregistrer</Submit>
        <a href={`/projects/${p.slug}`} target="_blank" className="flex h-9 items-center rounded-full border border-line px-4 text-sm text-ink hover:border-line-strong">
          Voir la page
        </a>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (!confirm(`Supprimer ${p.name} ? (la sync le recréera s'il est toujours déployé — préfère « Masqué »)`)) return;
            startDelete(async () => {
              await deleteProject(p.id);
              onDone();
            });
          }}
          className="ml-auto grid size-9 place-items-center rounded-full text-danger hover:bg-danger/10"
          title="Supprimer"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </form>
  );
}
