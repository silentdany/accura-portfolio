import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ViewSwitcher } from "@/components/view-switcher";
import { PdfButton } from "@/components/pdf-button";
import { Logo } from "@/components/logo";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import type { ViewId } from "@/lib/views";

export type PdfOption = { label: string; href: string };

const NAV = [
  { href: "/", label: "Projets" },
  { href: "/now", label: "Now" },
  { href: "/stories", label: "Stories" },
];

export const CONTACT_URL = "https://accura.dev/contact";

/** Same header grammar as accura.dev: logo, one segmented switch, one red CTA. */
export async function SiteHeader({ view, pdf, active }: { view: ViewId; pdf: PdfOption[]; active?: string }) {
  const t = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="px-5 sm:px-8">
        <div className="shell flex h-16 items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-70" aria-label="Portfolio — accueil">
            <Logo size={24} />
            <span className="text-[15px] font-semibold tracking-tight">
              Accura<span className="text-muted">.dev</span>
              <span className="ml-2 font-normal text-subtle">/ portfolio</span>
            </span>
          </Link>

          <nav aria-label="Navigation" className="ml-4 hidden items-center gap-0.5 rounded-full border border-line bg-ink/[0.035] p-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active === n.href ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active === n.href ? "bg-surface text-ink shadow-sm ring-1 ring-line dark:bg-ink/10" : "text-muted hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Suspense>
              <ViewSwitcher current={view} />
            </Suspense>
            <PdfButton options={pdf} compact />
            <ThemeToggle initial={isTheme(t) ? t : "system"} />
            <a href={CONTACT_URL} className="btn btn-primary ml-1.5 hidden h-9 sm:inline-flex">
              Parlons-en
            </a>
          </div>
        </div>
      </div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-5 pb-2.5 md:hidden" aria-label="Navigation">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-full px-3 py-1 text-sm font-medium ${active === n.href ? "bg-ink/[0.06] text-ink" : "text-muted"}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-28 border-t border-line px-5 py-12 sm:px-8">
      <div className="shell grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="font-semibold tracking-tight">Accura.dev</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Portfolio mis à jour automatiquement depuis Vercel et GitHub. Chiffres réels fournis par{" "}
            <a href="https://github.com/silentdany/accura-watch" className="link-underline text-ink">
              Accura Watch
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2 text-sm text-muted md:justify-end">
          <a href="/api/v1" className="hover:text-ink">
            API
          </a>
          <a href="/api/mcp" className="hover:text-ink">
            MCP
          </a>
          <a href="/llms.txt" className="hover:text-ink">
            llms.txt
          </a>
          <a href="https://accura.dev" className="inline-flex items-center gap-1 hover:text-ink">
            accura.dev <ArrowUpRight className="size-3.5" />
          </a>
          <Link href="/admin" className="hover:text-ink">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
