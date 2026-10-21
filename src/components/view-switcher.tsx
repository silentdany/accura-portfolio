"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VIEWS, type ViewId } from "@/lib/views";

export function ViewSwitcher({ current }: { current: ViewId }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  function pick(id: ViewId) {
    const sp = new URLSearchParams(params.toString());
    sp.set("view", id);
    router.push(`${pathname}?${sp.toString()}`);
  }
  return (
    <div role="radiogroup" aria-label="Affichage" className="hidden items-center rounded-full border border-line bg-ink/[0.035] p-0.5 text-xs sm:flex">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={current === v.id}
          title={v.description}
          onClick={() => pick(v.id)}
          className={`rounded-full px-2.5 py-1 font-medium transition ${
            current === v.id ? "bg-surface text-ink shadow-sm ring-1 ring-line dark:bg-ink/10" : "text-muted hover:text-ink"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
