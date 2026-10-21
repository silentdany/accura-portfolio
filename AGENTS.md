<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Accura Portfolio — conventions

- **One service layer**: pages, REST (`/api/v1`) and MCP (`/api/mcp`) all go through `src/lib/portfolio.ts`, `src/lib/threads.ts` and the tools in `src/lib/mcp/tools.ts`. A REST endpoint is a thin wrapper over a tool (`restTool`). Never put business logic in a page or route.
- **Public data goes through `presentProject`**: it applies admin overrides (`*Override` > AI > synced data) and NDA redaction. Never return a raw `Project` row publicly.
- **Sync never touches curation**: `src/lib/sync.ts` only writes raw fields; overrides, order, size, categories, NDA, hidden are admin-owned. `manual: true` skips a project entirely.
- **Caching**: Cache Components are off (classic model). Pages are dynamic (cookies: theme, view, NDA); external fetches (Watch, GitHub) are cached with `next.revalidate`. Don't add `export const dynamic = "force-dynamic"` to pages or to routes that call Watch/GitHub: it disables that fetch cache.
- **Display modes** live in `src/lib/views.ts` + `src/components/raw/*` (raw) / `src/components/bento/*` (accura). Every public page handles each mode.
- **Theme = accura.dev design system** (`silentdany/accura`, `app/globals.css`): blue-black ink on white, one red accent (`primary`), night tone for dark. Geist semibold with tight tracking for headings (`.headline`, `.headline-sm`, `.title`), mono `.eyebrow` with a red rule, Instrument Serif italic only for one `.accent-word`. Hero sections use `<Backdrop />` (grid, blooms, grain). Buttons: `.btn .btn-primary|.btn-outline`. Colors are tokens in `globals.css`; `dark:` follows `data-theme` or the OS. Custom component classes go in `@layer components` so utilities can override them.
- **Live captures**: `src/lib/capture.ts` screenshots each production URL (desktop 1440×900 + mobile 390×844) during the sync and stores them in the `Capture` table; `/api/captures/[slug]/[kind]` serves them (NDA-gated). Always render them through `components/shots.tsx` (browser / phone frames). The site icon is stored the same way (Capture kind `icon`, `src/lib/icon.ts`) and rendered with `ProjectIcon`; never hotlink a third-party favicon service.
- Layout: full-bleed sections are `px-5 sm:px-8` wrappers around a `.shell` — never put the padding on the `.shell` itself, or edges stop lining up.
- UI copy is French.
