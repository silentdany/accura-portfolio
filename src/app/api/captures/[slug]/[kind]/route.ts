import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUnlocked } from "@/lib/nda";

/**
 * Live capture of a project's production site. Hidden projects 404; NDA projects
 * only serve their capture to a visitor who unlocked them (or the owner).
 * `?v=<hash>` URLs are immutable.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/captures/[slug]/[kind]">) {
  const { slug, kind } = await ctx.params;
  if (kind !== "desktop" && kind !== "mobile" && kind !== "icon") return NextResponse.json({ error: "kind: desktop | mobile | icon" }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, slug: true, hidden: true, nda: true, ndaPasswordHash: true } });
  if (!project || project.hidden) return new NextResponse(null, { status: 404 });
  if (project.nda && !(await isUnlocked(project))) return new NextResponse(null, { status: 404 });
  const c = await prisma.capture.findUnique({ where: { projectId_kind: { projectId: project.id, kind } } });
  if (!c) return new NextResponse(null, { status: 404 });
  const versioned = req.nextUrl.searchParams.get("v") === c.hash;
  return new NextResponse(new Uint8Array(c.data), {
    headers: {
      "Content-Type": c.mime,
      "Cache-Control": project.nda
        ? "private, max-age=3600"
        : versioned
          ? "public, max-age=31536000, immutable"
          : "public, s-maxage=3600, stale-while-revalidate=86400",
      ETag: `"${c.hash}"`,
      // An SVG icon is a document: never let it run script in our origin.
      ...(c.mime === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
