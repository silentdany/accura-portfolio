import type { NextRequest } from "next/server";
import { options, restTool } from "@/lib/rest";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/projects/[slug]">) {
  return restTool(req, "get_project", { slug: (await ctx.params).slug });
}
export const OPTIONS = options;
