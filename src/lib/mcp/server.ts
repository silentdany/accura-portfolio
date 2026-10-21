import { callTool, TOOLS, toolJsonSchema } from "./tools";
import { errorMessage } from "@/lib/http";

/**
 * Minimal MCP server (Streamable HTTP, stateless, JSON responses) — same design as Accura Watch.
 * Implements initialize, ping, tools/*, prompts/*, resources/* (empty).
 */

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const SERVER_INFO = { name: "accura-portfolio", title: "Accura Portfolio", version: "0.1.0" };

const INSTRUCTIONS = `Accura Portfolio is the live portfolio of Dany (Accura): every deployed project, what it does, its stack and real traffic (from Accura Watch), plus what he is working on right now.
Start with get_profile and get_now for "what is he doing", list_projects for the catalogue (filter by category via list_categories), get_project for details, list_stories/get_story for finished build-in-public threads.
Write tools (set_now_brief, add_thread_post, start_thread, archive_thread, sync_projects) need the owner's Bearer token.`;

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
type JsonRpcResponse = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

const PROMPTS = [
  {
    name: "introduce_me",
    title: "Introduce the owner",
    description: "Write a short, factual introduction of the portfolio owner and their active work.",
    arguments: [],
    text: "Call get_profile, get_now and list_projects (pinned first). Write a 5-line introduction: who he is, what he is building right now (cite the brief and the most active repos), and the 3 most notable live projects with their real traffic when available.",
  },
  {
    name: "match_project",
    title: "Find a relevant reference",
    description: "Find the projects most relevant to a client need.",
    arguments: [{ name: "need", description: "What the client wants to build", required: true }],
    text: "The client need is: {{need}}. Call list_projects (with_stats true), then get_project on the 3 best matches. Explain in a few bullets why each is a relevant reference (stack, similar problem, traction). Skip NDA projects' details.",
  },
];

function ok(id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function fail(id: JsonRpcRequest["id"], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handle(msg: JsonRpcRequest, canWrite: boolean): Promise<JsonRpcResponse | null> {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return fail(msg?.id ?? null, -32600, "Invalid Request");
  }
  const isNotification = msg.id === undefined || msg.id === null;
  const p = msg.params ?? {};

  switch (msg.method) {
    case "initialize": {
      const requested = String(p.protocolVersion ?? "");
      return ok(msg.id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false }, resources: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, {
        tools: TOOLS.filter((t) => canWrite || !t.write).map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: toolJsonSchema(t),
          annotations: { title: t.title, ...(t.write ? { readOnlyHint: false } : {}), ...t.annotations },
        })),
      });
    case "tools/call": {
      const name = String(p.name ?? "");
      try {
        const result = await callTool(name, p.arguments ?? {}, canWrite);
        const text = JSON.stringify(result, null, 2);
        const structured = result && typeof result === "object" && !Array.isArray(result) ? result : { result };
        return ok(msg.id, { content: [{ type: "text", text }], structuredContent: structured, isError: false });
      } catch (err) {
        return ok(msg.id, { content: [{ type: "text", text: errorMessage(err) }], isError: true });
      }
    }
    case "prompts/list":
      return ok(msg.id, {
        prompts: PROMPTS.map(({ name, title, description, arguments: args }) => ({ name, title, description, arguments: args })),
      });
    case "prompts/get": {
      const prompt = PROMPTS.find((x) => x.name === p.name);
      if (!prompt) return fail(msg.id, -32602, `Unknown prompt: ${String(p.name)}`);
      const args = (p.arguments ?? {}) as Record<string, string>;
      const text = prompt.text.replace(/\{\{(\w+)\}\}/g, (_, k) => args[k] ?? `<${k}>`);
      return ok(msg.id, { description: prompt.description, messages: [{ role: "user", content: { type: "text", text } }] });
    }
    case "resources/list":
      return ok(msg.id, { resources: [] });
    case "resources/templates/list":
      return ok(msg.id, { resourceTemplates: [] });
    default:
      if (isNotification) return null;
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function handleMcpPayload(payload: unknown, canWrite: boolean): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    const out = (await Promise.all(payload.map((m) => handle(m as JsonRpcRequest, canWrite)))).filter(
      (r): r is JsonRpcResponse => r !== null,
    );
    return out.length ? out : null;
  }
  return handle(payload as JsonRpcRequest, canWrite);
}
