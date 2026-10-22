import { NextResponse } from "next/server";
import { TOOLS, toolJsonSchema } from "@/lib/mcp/tools";
import { siteUrl } from "@/lib/env";
import { CORS } from "@/lib/rest";

export const dynamic = "force-dynamic";

/** API index: REST resources + the tool mirror, all backed by the same services as the MCP server. */
export function GET() {
  const base = `${siteUrl()}/api/v1`;
  return NextResponse.json(
    {
      name: "Accura Portfolio API",
      version: 1,
      auth: "Reads are public. Writes: Authorization: Bearer <PORTFOLIO_API_TOKEN>.",
      mcp: `${siteUrl()}/api/mcp`,
      resources: {
        "GET /profile": `${base}/profile`,
        "GET /projects?category=&q=": `${base}/projects`,
        "GET /projects/:slug": `${base}/projects/{slug}`,
        "GET /categories": `${base}/categories`,
        "GET /now?days=7": `${base}/now`,
        "GET /stories": `${base}/stories`,
        "GET /stories/:slug": `${base}/stories/{slug}`,
        "POST /now/brief {text}": `${base}/now/brief`,
        "POST /now/posts {body, title?, url?, images?, date?, milestone?}": `${base}/now/posts`,
        "POST /now/import {url}": `${base}/now/import`,
        "POST /threads {title, repos?, threadUrl?, project?}": `${base}/threads`,
        "POST /threads/:slug/archive {summary?}": `${base}/threads/{slug}/archive`,
        "POST /sync": `${base}/sync`,
      },
      tools: TOOLS.map((t) => ({ name: t.name, write: Boolean(t.write), description: t.description, endpoint: `${base}/tools/${t.name}`, input: toolJsonSchema(t) })),
    },
    { headers: CORS },
  );
}
