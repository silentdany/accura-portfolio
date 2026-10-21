import type { NextRequest } from "next/server";
import { jsonBody, options, restTool } from "@/lib/rest";

/** Start a new thread (the active one is archived into a story). */
export async function POST(req: NextRequest) {
  return restTool(req, "start_thread", await jsonBody(req));
}
export const OPTIONS = options;
