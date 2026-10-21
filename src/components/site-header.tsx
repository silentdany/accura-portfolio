import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewSwitcher } from "@/components/view-switcher";
import { PdfButton } from "@/components/pdf-button";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import type { ViewId } from "@/lib/views";

export type PdfOption = { label: string; href: string };

const NAV = [
  { href: "/", label: "Projets" },
  { href: "/now", label: "Now" },
  { href: "/stories", label: "Stories" },
];

export async function SiteHeader({ view, pdf, active }: { view: ViewId; pdf: PdfOption[]; active?: string }) {
  const t = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <header className="no-print sticky top-0 z-40 border-b border-transparent bg-bg/75 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2 font-medium tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-ink text-[11px] font-semibold text-bg transition group-hover:rotate-[-6deg]">A</span>
          <span className="text-ink">accura</span>
          <span className="text-subtle">/ portfolio</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                active === n.href ? "bg-surface text-ink shadow-[var(--card-shadow)]" : "text-muted hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Suspense>
            <ViewSwitcher current={view} />
          </Suspense>
          <PdfButton options={pdf} compact />
          <ThemeToggle initial={isTheme(t) ? t : "system"} />
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 sm:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`rounded-full px-3 py-1 text-sm ${active === n.href ? "bg-surface text-ink" : "text-muted"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mx-auto mt-24 flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-4 py-8 text-xs text-muted sm:px-6">
      <span>
        Mis à jour automatiquement depuis Vercel & GitHub · chiffres{" "}
        <a href="https://github.com/silentdany/accura-watch" className="underline decoration-line-strong underline-offset-4 hover:text-ink">
          Accura Watch
        </a>
      </span>
      <span className="ml-auto flex gap-4">
        <a href="/api/v1" className="hover:text-ink">API</a>
        <a href="/llms.txt" className="hover:text-ink">llms.txt</a>
        <a href="https://accura.dev" className="hover:text-ink">accura.dev</a>
        <Link href="/admin" className="hover:text-ink">Admin</Link>
      </span>
    </footer>
  );
}
