import { z } from "zod";
import { getProfile } from "@/lib/settings";
import { getActiveThread, getProjectRow, getStory, listCategories, listProjects, listStories, presentProject } from "@/lib/portfolio";
import { getWatchIndex } from "@/lib/watch";
import { recentCommits } from "@/lib/now";
import { addPost, archiveInput, archiveThread, briefInput, postInput, setBrief, startThread, startThreadInput } from "@/lib/threads";
import { runSync } from "@/lib/sync";

/**
 * MCP tools = REST endpoints: same services, same data. Read tools are public;
 * write tools need `Authorization: Bearer $PORTFOLIO_API_TOKEN`.
 */

type Tool<S extends z.ZodType = z.ZodType> = {
  name: string;
  title: string;
  description: string;
  input: S;
  write?: boolean;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
  handler: (args: z.infer<S>) => Promise<unknown>;
};

function tool<S extends z.ZodType>(t: Tool<S>): Tool {
  return t as unknown as Tool;
}

const read = { readOnlyHint: true, openWorldHint: false };

export const TOOLS: Tool[] = [
  tool({
    name: "get_profile",
    title: "Profile",
    description: "Who the portfolio owner is: name, headline, bio, availability for freelance work and links.",
    input: z.object({}),
    annotations: read,
    handler: () => getProfile(),
  }),
  tool({
    name: "list_projects",
    title: "List projects",
    description:
      "Public projects in display order (pinned first), with tagline, URL, stack, categories and live Accura Watch stats (visitors, Search Console clicks, Sentry errors, uptime) when mapped. NDA projects only expose their name and context.",
    input: z.object({
      category: z.string().optional().describe("Category slug (see list_categories)"),
      query: z.string().optional().describe("Free-text filter on name/description/topics"),
      with_stats: z.boolean().optional().describe("Include Accura Watch stats. Default true."),
    }),
    annotations: read,
    async handler({ category, query, with_stats }) {
      const watch = with_stats === false ? null : await getWatchIndex();
      return { projects: await listProjects({ category, query, watch, absolute: true }) };
    },
  }),
  tool({
    name: "get_project",
    title: "Project detail",
    description: "One project by slug: full description, screenshots, links, stack, categories and Watch stats.",
    input: z.object({ slug: z.string() }),
    annotations: read,
    async handler({ slug }) {
      const row = await getProjectRow(slug);
      if (!row || row.hidden) throw new Error(`Projet introuvable : ${slug}`);
      return presentProject(row, { watch: await getWatchIndex(), absolute: true });
    },
  }),
  tool({
    name: "list_categories",
    title: "Categories",
    description: "Project categories (e.g. sérieux, fun, jeux, clients, perso) with project counts.",
    input: z.object({}),
    annotations: read,
    handler: async () => ({ categories: await listCategories() }),
  }),
  tool({
    name: "get_now",
    title: "What I'm doing now",
    description: "The single active thread (/now): daily brief, timeline posts, and the GitHub commits of the last 7 days grouped by repo.",
    input: z.object({ days: z.number().int().min(1).max(30).optional().describe("Commit window in days. Default 7.") }),
    annotations: read,
    async handler({ days }) {
      const thread = await getActiveThread();
      return { thread, commits: await recentCommits(thread?.repos ?? [], days ?? 7) };
    },
  }),
  tool({
    name: "list_stories",
    title: "Stories",
    description: "Archived threads (finished build-in-public stories) with their timelines.",
    input: z.object({}),
    annotations: read,
    handler: async () => ({ stories: (await listStories()).map(({ posts, ...s }) => ({ ...s, postCount: posts.length })) }),
  }),
  tool({
    name: "get_story",
    title: "Story",
    description: "One archived thread with its full narrative timeline.",
    input: z.object({ slug: z.string() }),
    annotations: read,
    async handler({ slug }) {
      const s = await getStory(slug);
      if (!s) throw new Error(`Story introuvable : ${slug}`);
      return s;
    },
  }),
  tool({
    name: "set_now_brief",
    title: "Set the daily brief",
    description: "Replace the daily brief (≈2 lines) of the active thread — what the Grok bots post every day.",
    input: briefInput,
    write: true,
    annotations: { idempotentHint: true },
    handler: (args) => setBrief(args),
  }),
  tool({
    name: "add_thread_post",
    title: "Add a timeline post",
    description: "Append a post (e.g. an X thread post, with optional screenshots) to the active thread's timeline.",
    input: postInput,
    write: true,
    handler: (args) => addPost(args),
  }),
  tool({
    name: "start_thread",
    title: "Start a new thread",
    description: "Start a new active thread for /now. The current active thread is archived and becomes a story at /stories/<slug>.",
    input: startThreadInput,
    write: true,
    handler: (args) => startThread(args),
  }),
  tool({
    name: "archive_thread",
    title: "Archive a thread",
    description: "Archive a thread (default: the active one) into a standalone story, with an optional summary.",
    input: archiveInput,
    write: true,
    handler: (args) => archiveThread(args),
  }),
  tool({
    name: "sync_projects",
    title: "Sync projects",
    description: "Run the Vercel + GitHub sync now (normally weekly). Returns counts and errors.",
    input: z.object({}),
    write: true,
    annotations: { idempotentHint: true, openWorldHint: true },
    handler: () => runSync("api"),
  }),
];

export function findTool(name: string) {
  return TOOLS.find((t) => t.name === name);
}

export function toolJsonSchema(t: Tool) {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(t.input, { io: "input" }) as Record<string, unknown>;
  void _ignored;
  return schema;
}

export class ToolAuthError extends Error {}

export async function callTool(name: string, args: unknown, canWrite: boolean) {
  const t = findTool(name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  if (t.write && !canWrite) throw new ToolAuthError(`${name} requires Authorization: Bearer <PORTFOLIO_API_TOKEN>`);
  const parsed = t.input.safeParse(args ?? {});
  if (!parsed.success) throw new Error(`Invalid arguments: ${z.prettifyError(parsed.error)}`);
  return t.handler(parsed.data);
}
