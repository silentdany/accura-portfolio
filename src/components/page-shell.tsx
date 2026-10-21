import { SiteFooter, SiteHeader, type PdfOption } from "@/components/site-header";
import { RawShell } from "@/components/raw/raw-shell";
import type { ViewId } from "@/lib/views";

/** Wraps a public page in the chrome of the selected display mode. */
export function PageShell({
  view,
  pdf,
  active,
  children,
}: {
  view: ViewId;
  pdf: PdfOption[];
  active?: string;
  children: React.ReactNode;
}) {
  if (view === "raw") return <RawShell pdf={pdf}>{children}</RawShell>;
  return (
    <div className="grain">
      <SiteHeader view={view} pdf={pdf} active={active} />
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">{children}</main>
      <SiteFooter />
    </div>
  );
}

export const PDF_ALL: PdfOption = { label: "Tout le portfolio", href: "/api/pdf?scope=all" };
