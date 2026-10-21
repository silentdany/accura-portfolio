import { NextResponse, type NextRequest } from "next/server";
import { callTool, ToolAuthError } from "@/lib/mcp/tools";
import { hasWriteAccess } from "@/lib/api-auth";
import { errorMessage } from "@/lib/http";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
};

/** REST endpoints are thin wrappers over the MCP tools: one schema, one service layer. */
export async function restTool(req: NextRequest, name: string, args: unknown, cache = "public, s-maxage=300, stale-while-revalidate=600") {
  try {
    const result = await callTool(name, args, hasWriteAccess(req));
    return NextResponse.json(result, { headers: { ...CORS, "Cache-Control": req.method === "GET" ? cache : "no-store" } });
  } catch (err) {
    const status = err instanceof ToolAuthError ? 401 : /introuvable|unknown tool/i.test(errorMessage(err)) ? 404 : 400;
    return NextResponse.json({ error: errorMessage(err) }, { status, headers: CORS });
  }
}

export async function jsonBody(req: NextRequest): Promise<unknown> {
  return req.json().catch(() => ({}));
}

export function options() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
