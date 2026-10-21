"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/admin/actions";

export const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-ink";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-subtle">{hint}</span>}
    </label>
  );
}

export function Toggle({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-5 w-9 rounded-full bg-line-strong transition peer-checked:bg-ink after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-surface after:transition peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

export function Submit({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "ghost" | "danger" }) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "bg-ink text-bg hover:opacity-90"
      : variant === "danger"
        ? "border border-danger/40 text-danger hover:bg-danger/10"
        : "border border-line bg-surface text-ink hover:border-line-strong";
  return (
    <button type="submit" disabled={pending} className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition disabled:opacity-60 ${cls}`}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm whitespace-pre-line text-danger" role="alert">{state.error}</p>;
  if (state.message) return <p className="text-sm text-live" role="status">{state.message}</p>;
  return null;
}

export function Card({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="tile p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
