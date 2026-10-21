import { NextRequest, NextResponse } from "next/server";
import { handleMcpPayload, SERVER_INFO } from "@/lib/mcp/server";
import { hasWriteAccess } from "@/lib/api-auth";
import { CORS } from "@/lib/rest";

export const runtime = "nodejs";
export const maxDuration = 300;

/** MCP Streamable HTTP endpoint (stateless, JSON). Public read tools; write tools with the Bearer token. */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
  }
  const res = await handleMcpPayload(payload, hasWriteAccess(req));
  if (res === null) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(res, { headers: CORS });
}

/** No server-initiated SSE stream in stateless mode. */
export async function GET() {
  return NextResponse.json(
    { ...SERVER_INFO, transport: "streamable-http", hint: "POST JSON-RPC messages to this URL" },
    { status: 405, headers: { ...CORS, Allow: "POST" } },
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
