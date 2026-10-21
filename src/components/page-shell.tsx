import { SiteFooter, SiteHeader, type PdfOption } from "@/components/site-header";
import { RawShell } from "@/components/raw/raw-shell";
import type { ViewId } from "@/lib/views";

/** Wraps a public page in the chrome of the selected display mode. */
export function PageShell({
  view,
  pdf,
  active,
  children,
  bleed = false,
}: {
  view: ViewId;
  pdf: PdfOption[];
  active?: string;
  children: React.ReactNode;
  /** Page draws its own full-width sections (hero with backdrop). */
  bleed?: boolean;
}) {
  if (view === "raw") return <RawShell pdf={pdf}>{children}</RawShell>;
  return (
    <>
      <SiteHeader view={view} pdf={pdf} active={active} />
      <main className={bleed ? "" : "px-5 pt-12 sm:px-8 sm:pt-16"}>{bleed ? children : <div className="shell">{children}</div>}</main>
      <SiteFooter />
    </>
  );
}

export const PDF_ALL: PdfOption = { label: "Tout le portfolio", href: "/api/pdf?scope=all" };
