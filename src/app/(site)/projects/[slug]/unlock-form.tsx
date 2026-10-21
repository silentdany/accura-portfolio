"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { unlockProject, type UnlockState } from "./actions";

export function UnlockForm({ slug, raw = false }: { slug: string; raw?: boolean }) {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockProject, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (raw) {
    return (
      <form action={action}>
        <input type="hidden" name="slug" value={slug} />
        Mot de passe : <input type="password" name="password" required autoComplete="off" /> <button type="submit">Déverrouiller</button>
        {state.error && <p style={{ color: "#c00" }}>{state.error}</p>}
      </form>
    );
  }
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
      <input type="hidden" name="slug" value={slug} />
      <label className="relative flex-1">
        <span className="sr-only">Mot de passe</span>
        <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <input
          type="password"
          name="password"
          required
          autoComplete="off"
          placeholder="Mot de passe"
          className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-9 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-bg transition hover:opacity-90 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Déverrouiller
      </button>
      {state.error && <p className="text-sm text-danger sm:basis-full" role="alert">{state.error}</p>}
    </form>
  );
}
