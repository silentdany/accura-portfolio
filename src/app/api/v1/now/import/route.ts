import type { NextRequest } from "next/server";
import { jsonBody, options, restTool } from "@/lib/rest";

/** Import or refresh a public X thread as the active /now thread: POST {"url": "https://x.com/…/status/…"}. */
export async function POST(req: NextRequest) {
  return restTool(req, "import_x_thread", await jsonBody(req));
}
export const OPTIONS = options;
