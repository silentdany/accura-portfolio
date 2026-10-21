"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Option = { label: string; href: string };

/** One-click PDF export with a scope picker (whole portfolio, current category, current project). */
export function PdfButton({ options, compact = false }: { options: Option[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function download(o: Option) {
    setBusy(o.href);
    try {
      const res = await fetch(o.href);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "portfolio.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: the print page, printable from the browser.
      window.open(o.href.replace("/api/pdf", "/print"), "_blank");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (options.length === 1 ? download(options[0]) : setOpen((v) => !v))}
        className={`flex items-center gap-1.5 rounded-full border border-line bg-surface/70 text-xs font-medium text-ink-2 transition hover:border-line-strong hover:text-ink ${
          compact ? "size-8 justify-center" : "px-3 py-1.5"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Exporter en PDF"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" strokeWidth={2} />}
        {!compact && <span>PDF</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-xl animate-rise">
          <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-[0.14em] text-subtle">Exporter en PDF</p>
          {options.map((o) => (
            <button
              key={o.href}
              role="menuitem"
              type="button"
              onClick={() => download(o)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {busy === o.href ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4 text-muted" strokeWidth={1.75} />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
