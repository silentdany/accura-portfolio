"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { saveSettings } from "@/app/admin/actions";
import type { Profile } from "@/lib/settings";
import { VIEWS, type ViewId } from "@/lib/views";
import { Feedback, Field, inputCls, Submit, Toggle } from "@/components/admin/ui";

export function SettingsForm({ profile, defaultView }: { profile: Profile; defaultView: ViewId }) {
  const [state, action] = useActionState(saveSettings, {});
  const [links, setLinks] = useState(profile.links.length ? profile.links : [{ label: "", url: "" }]);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <input name="name" defaultValue={profile.name} required className={inputCls} />
        </Field>
        <Field label="E-mail public">
          <input name="email" defaultValue={profile.email} className={inputCls} />
        </Field>
      </div>
      <Field label="Titre — ligne 1">
        <input name="headline" defaultValue={profile.headline} maxLength={140} className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre — ligne 2 (grisée)">
          <input name="headlineTail" defaultValue={profile.headlineTail} maxLength={80} className={inputCls} />
        </Field>
        <Field label="Mot d'accent (rouge, italique)">
          <input name="headlineAccent" defaultValue={profile.headlineAccent} maxLength={40} className={inputCls} />
        </Field>
      </div>
      <Field label="Bio">
        <textarea name="bio" defaultValue={profile.bio} rows={3} maxLength={600} className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Lieu">
          <input name="location" defaultValue={profile.location} className={inputCls} />
        </Field>
        <Field label="Avatar (URL)">
          <input name="avatar" defaultValue={profile.avatar} className={inputCls} />
        </Field>
        <Field label="Disponibilité">
          <input name="availability" defaultValue={profile.availability} className={inputCls} />
        </Field>
      </div>
      <Toggle name="available" defaultChecked={profile.available} label="Afficher la pastille « disponible »" />

      <div>
        <p className="mb-2 text-xs font-medium text-ink-2">Liens (les 4 premiers vont dans la tuile Liens)</p>
        <div className="flex flex-col gap-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input name="linkLabel" defaultValue={l.label} placeholder="Libellé" className={`${inputCls} w-40`} />
              <input name="linkUrl" defaultValue={l.url} placeholder="https://" type="url" className={`${inputCls} flex-1`} />
              <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-label="Retirer">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setLinks([...links, { label: "", url: "" }])} className="flex w-fit items-center gap-1 text-sm text-muted hover:text-ink">
            <Plus className="size-4" /> Ajouter un lien
          </button>
        </div>
      </div>

      <Field label="Affichage par défaut" hint="Les visiteurs peuvent changer d'affichage ; leur choix est mémorisé.">
        <select name="defaultView" defaultValue={defaultView} className={inputCls}>
          {VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} — {v.description}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center gap-3">
        <Submit>Enregistrer</Submit>
        <Feedback state={state} />
      </div>
    </form>
  );
}
