"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VIEW_COOKIE, VIEWS, type ViewId } from "@/lib/views";
import { setPrefCookie } from "@/lib/client-cookie";

export function ViewSwitcher({ current }: { current: ViewId }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  function pick(id: ViewId) {
    setPrefCookie(VIEW_COOKIE, id);
    const sp = new URLSearchParams(params.toString());
    sp.delete("view");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }
  return (
    <div role="radiogroup" aria-label="Affichage" className="flex items-center rounded-full border border-line bg-surface/70 p-0.5 text-xs">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={current === v.id}
          title={v.description}
          onClick={() => pick(v.id)}
          className={`rounded-full px-2.5 py-1 font-medium transition ${
            current === v.id ? "bg-ink text-bg shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
