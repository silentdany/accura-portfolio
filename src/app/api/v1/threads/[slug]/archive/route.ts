import type { NextRequest } from "next/server";
import { jsonBody, options, restTool } from "@/lib/rest";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/threads/[slug]/archive">) {
  const body = (await jsonBody(req)) as Record<string, unknown>;
  return restTool(req, "archive_thread", { ...body, thread: (await ctx.params).slug });
}
export const OPTIONS = options;
