import type { NextRequest } from "next/server";
import { jsonBody, options, restTool } from "@/lib/rest";

export const runtime = "nodejs";
export const maxDuration = 300;

/** REST mirror of every MCP tool: POST /api/v1/tools/<name> with the arguments as JSON body. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/tools/[name]">) {
  const { name } = await ctx.params;
  return restTool(req, name, await jsonBody(req));
}

export const OPTIONS = options;
