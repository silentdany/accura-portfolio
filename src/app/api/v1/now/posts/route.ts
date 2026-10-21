import type { NextRequest } from "next/server";
import { jsonBody, options, restTool } from "@/lib/rest";

export async function POST(req: NextRequest) {
  return restTool(req, "add_thread_post", await jsonBody(req));
}
export const OPTIONS = options;
