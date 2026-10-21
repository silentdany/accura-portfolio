import { NextRequest, NextResponse } from "next/server";
import { renderPdf } from "@/lib/pdf";
import { siteUrl } from "@/lib/env";
import { errorMessage } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-click PDF: GET /api/pdf?scope=all | category&slug=<cat> | project&slug=<project>
 * Renders /print with the same query in headless Chromium. NDA projects print in their public (locked) form.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") ?? "all";
  const slug = sp.get("slug")?.replace(/[^a-z0-9-]/gi, "") ?? "";
  if (!["all", "category", "project"].includes(scope) || (scope !== "all" && !slug)) {
    return NextResponse.json({ error: "scope must be all, category or project (with slug)" }, { status: 400 });
  }
  const qs = new URLSearchParams({ scope, ...(slug ? { slug } : {}) });
  const origin = process.env.PDF_RENDER_ORIGIN || (process.env.VERCEL ? siteUrl() : req.nextUrl.origin);
  try {
    const pdf = await renderPdf(`${origin}/print?${qs}`);
    const name = `accura-portfolio${scope === "all" ? "" : `-${slug}`}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${sp.get("download") === "0" ? "inline" : "attachment"}; filename="${name}"`,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `PDF rendering failed: ${errorMessage(err)}` }, { status: 500 });
  }
}
