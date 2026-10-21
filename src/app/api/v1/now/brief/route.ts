import type { NextRequest } from "next/server";
import { jsonBody, options, restTool } from "@/lib/rest";

/** Daily brief from the Grok bots: POST {"text": "..."} with the Bearer token. */
export async function POST(req: NextRequest) {
  return restTool(req, "set_now_brief", await jsonBody(req));
}
export const OPTIONS = options;
