"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";

export function LoginForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const res =
      mode === "signin"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: String(f.get("name") || email.split("@")[0]) });
    setPending(false);
    if (res.error) setError(res.error.message ?? "Échec de la connexion.");
    else {
      router.push(next);
      router.refresh();
    }
  }

  const input = "h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-ink outline-none transition focus:border-ink";
  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
      {mode === "signup" && <input name="name" placeholder="Nom" className={input} autoComplete="name" />}
      <input name="email" type="email" required placeholder="E-mail" className={input} autoComplete="email" />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Mot de passe"
        className={input}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
      />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-bg disabled:opacity-60">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {mode === "signin" ? "Se connecter" : "Créer le compte"}
      </button>
    </form>
  );
}
