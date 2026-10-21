import type { NextRequest } from "next/server";
import { options, restTool } from "@/lib/rest";

export function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days"));
  return restTool(req, "get_now", Number.isFinite(days) && days > 0 ? { days } : {}, "public, s-maxage=120, stale-while-revalidate=600");
}
export const OPTIONS = options;
