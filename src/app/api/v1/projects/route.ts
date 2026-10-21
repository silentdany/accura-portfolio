import type { NextRequest } from "next/server";
import { options, restTool } from "@/lib/rest";

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return restTool(req, "list_projects", {
    category: sp.get("category") ?? undefined,
    query: sp.get("q") ?? undefined,
    with_stats: sp.get("stats") !== "false",
  });
}
export const OPTIONS = options;
