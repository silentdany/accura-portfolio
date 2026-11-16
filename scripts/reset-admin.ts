/**
 * Reset the single owner admin account so signup can reopen (limited to OWNER_EMAIL).
 * Curation tables are never written. Dry-run by default; pass --apply to delete auth rows.
 *
 *   pnpm tsx scripts/reset-admin.ts --backup /path/outside/repo
 *   pnpm tsx scripts/reset-admin.ts --apply --backup /path/outside/repo
 *
 * Requires DATABASE_URL and OWNER_EMAIL. Never prints connection strings, emails, or passwords.
 * Use a direct (non-pooled) Postgres URL so the delete-and-verify work can run in one session.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

export const AUTH_TABLES = ["verification", "session", "account", "user"] as const;
export const CURATION_TABLES = [
  "project",
  "capture",
  "category",
  "thread",
  "threadPost",
  "setting",
  "syncRun",
  "categoryToProject",
] as const;

export type Counts = Record<(typeof AUTH_TABLES)[number] | (typeof CURATION_TABLES)[number], number>;

export type ResetDb = {
  user: { count: () => Promise<number>; findMany: () => Promise<unknown[]>; deleteMany: () => Promise<unknown> };
  session: { count: () => Promise<number>; findMany: () => Promise<unknown[]>; deleteMany: () => Promise<unknown> };
  account: { count: () => Promise<number>; findMany: () => Promise<unknown[]>; deleteMany: () => Promise<unknown> };
  verification: { count: () => Promise<number>; findMany: () => Promise<unknown[]>; deleteMany: () => Promise<unknown> };
  project: { count: () => Promise<number>; findMany: () => Promise<unknown[]> };
  capture: { count: () => Promise<number>; findMany: () => Promise<unknown[]> };
  category: { count: () => Promise<number>; findMany: () => Promise<unknown[]> };
  thread: { count: () => Promise<number>; findMany: () => Promise<unknown[]> };
  threadPost: { count: () => Promise<number>; findMany: () => Promise<unknown[]> };
  setting: { count: () => Promise<number>; findMany: () => Promise<unknown[]> };
  syncRun: { count: () => Promise<number>; findMany: () => Promise<unknown[]> };
  $queryRaw: PrismaClient["$queryRaw"];
};

export type TransactionalDb = ResetDb & {
  $transaction: <T>(fn: (tx: ResetDb) => Promise<T>) => Promise<T>;
};

export class GuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardError";
  }
}

const AUTH_SET = new Set<string>(AUTH_TABLES);
const CURATION_SET = new Set<string>(CURATION_TABLES);

export function parseOwnerEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function redact(text: string): string {
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "postgresql://[redacted]")
    .replace(/\b(DATABASE_URL|DIRECT_URL)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

export type CliOptions = { apply: boolean; backupDir: string };

export function parseArgs(argv: string[]): CliOptions {
  let sawApply = false;
  let sawDryRun = false;
  let backupDir: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") sawApply = true;
    else if (a === "--dry-run") sawDryRun = true;
    else if (a === "--backup") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("--backup requires a path outside the repository");
      backupDir = value;
    } else if (a === "--help" || a === "-h") {
      throw new Error("HELP");
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  if (sawApply && sawDryRun) throw new Error("pass only one of --dry-run or --apply");
  if (!backupDir) throw new Error("--backup <path> is required and must be outside the repository");
  return { apply: sawApply, backupDir };
}

export function helpText(): string {
  return [
    "Reset the single owner admin account. Curation data is not modified.",
    "Dry-run is the default. Pass --apply to delete auth rows.",
    "",
    "  pnpm tsx scripts/reset-admin.ts --backup /path/outside/repo",
    "  pnpm tsx scripts/reset-admin.ts --apply --backup /path/outside/repo",
    "",
    "Requires DATABASE_URL (prefer a direct, non-pooled URL) and OWNER_EMAIL.",
  ].join("\n");
}

export function resolveBackupDir(input: string, repoRoot: string): string {
  const resolved = path.resolve(input);
  const root = path.resolve(repoRoot);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved === root || resolved.startsWith(prefix)) {
    throw new Error("backup path must be outside the repository");
  }
  return resolved;
}

export function assertResetGuards(users: { email: string }[], ownerEmails: string[]): void {
  if (!ownerEmails.length) throw new GuardError("OWNER_EMAIL is not set");
  if (users.length === 0) throw new GuardError("no admin user found; signup is already open");
  if (users.length > 1) throw new GuardError("refusing to run: more than one user exists");
  const email = users[0]!.email.trim().toLowerCase();
  if (!ownerEmails.includes(email)) {
    throw new GuardError("refusing to run: the existing user email does not match OWNER_EMAIL");
  }
}

async function countJoin(db: Pick<ResetDb, "$queryRaw">): Promise<number> {
  const rows = await db.$queryRaw<Array<{ count: number | bigint }>>`SELECT COUNT(*)::int AS count FROM "_CategoryToProject"`;
  return Number(rows[0]?.count ?? 0);
}

export async function countAll(db: ResetDb): Promise<Counts> {
  const [
    verification,
    session,
    account,
    user,
    project,
    capture,
    category,
    thread,
    threadPost,
    setting,
    syncRun,
    categoryToProject,
  ] = await Promise.all([
    db.verification.count(),
    db.session.count(),
    db.account.count(),
    db.user.count(),
    db.project.count(),
    db.capture.count(),
    db.category.count(),
    db.thread.count(),
    db.threadPost.count(),
    db.setting.count(),
    db.syncRun.count(),
    countJoin(db),
  ]);
  return {
    verification,
    session,
    account,
    user,
    project,
    capture,
    category,
    thread,
    threadPost,
    setting,
    syncRun,
    categoryToProject,
  };
}

export function formatCounts(counts: Counts): string {
  const keys = [...AUTH_TABLES, ...CURATION_TABLES];
  const width = Math.max(...keys.map((k) => k.length));
  return keys.map((k) => `  ${k.padEnd(width)}  ${counts[k]}`).join("\n");
}

export function curationEqual(before: Counts, after: Counts): boolean {
  return CURATION_TABLES.every((k) => before[k] === after[k]);
}

export function authEmpty(counts: Counts): boolean {
  return AUTH_TABLES.every((k) => counts[k] === 0);
}

export function countsEqual(a: Counts, b: Counts): boolean {
  const keys = [...AUTH_TABLES, ...CURATION_TABLES];
  return keys.every((k) => a[k] === b[k]);
}

function toJsonSafe(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { __bytes: Buffer.from(value).toString("base64") };
  }
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toJsonSafe(v);
    return out;
  }
  return value;
}

async function readJoinRows(db: Pick<ResetDb, "$queryRaw">): Promise<unknown[]> {
  return db.$queryRaw<unknown[]>`SELECT "A", "B" FROM "_CategoryToProject" ORDER BY "A", "B"`;
}

export async function writeBackups(db: ResetDb, backupDir: string, before: Counts): Promise<string[]> {
  const [verification, session, account, user, project, capture, category, thread, threadPost, setting, syncRun, categoryToProject] =
    await Promise.all([
      db.verification.findMany(),
      db.session.findMany(),
      db.account.findMany(),
      db.user.findMany(),
      db.project.findMany(),
      db.capture.findMany(),
      db.category.findMany(),
      db.thread.findMany(),
      db.threadPost.findMany(),
      db.setting.findMany(),
      db.syncRun.findMany(),
      readJoinRows(db),
    ]);

  await mkdir(backupDir, { recursive: true });
  const authPath = path.join(backupDir, "auth.json");
  const curationPath = path.join(backupDir, "curation.json");
  const countsPath = path.join(backupDir, "counts-before.json");
  const writtenAt = new Date().toISOString();
  await writeFile(
    authPath,
    JSON.stringify(toJsonSafe({ writtenAt, counts: pickCounts(before, AUTH_SET), verification, session, account, user }), null, 2) +
      "\n",
    { mode: 0o600 },
  );
  await writeFile(
    curationPath,
    JSON.stringify(
      toJsonSafe({
        writtenAt,
        counts: pickCounts(before, CURATION_SET),
        project,
        capture,
        category,
        thread,
        threadPost,
        setting,
        syncRun,
        categoryToProject,
      }),
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  await writeFile(countsPath, JSON.stringify({ writtenAt, counts: before }, null, 2) + "\n", { mode: 0o600 });
  return [authPath, curationPath, countsPath];
}

function pickCounts(counts: Counts, keys: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = counts[k as keyof Counts];
  return out;
}

export async function deleteAuthInTransaction(db: TransactionalDb, before: Counts): Promise<Counts> {
  return db.$transaction(async (tx) => {
    await tx.verification.deleteMany();
    await tx.session.deleteMany();
    await tx.account.deleteMany();
    await tx.user.deleteMany();
    const after = await countAll(tx);
    if (!curationEqual(before, after) || !authEmpty(after)) {
      throw new Error("post-delete verification failed; rolling back (curation counts changed or auth rows remain)");
    }
    return after;
  });
}

export type RunOptions = {
  prisma: TransactionalDb;
  ownerEmails: string[];
  apply: boolean;
  backupDir: string;
  repoRoot: string;
  log?: (line: string) => void;
};

export type RunResult = {
  applied: boolean;
  before: Counts;
  after: Counts;
  backupPaths: string[];
};

export async function runResetAdmin(opts: RunOptions): Promise<RunResult> {
  const log = opts.log ?? ((line: string) => console.log(line));
  const backupDir = resolveBackupDir(opts.backupDir, opts.repoRoot);

  const before = await countAll(opts.prisma);
  log("counts before:");
  log(formatCounts(before));

  const users = (await opts.prisma.user.findMany()) as Array<{ email: string }>;
  assertResetGuards(users, opts.ownerEmails);
  log("guards ok: single user matches OWNER_EMAIL");

  if (!opts.apply) {
    const after = await countAll(opts.prisma);
    if (!countsEqual(before, after)) throw new Error("dry-run unexpectedly changed the database");
    log("dry-run: no files written, no rows deleted.");
    log(`would write backups under ${backupDir}`);
    log(
      `would delete auth rows (user ${before.user}, session ${before.session}, account ${before.account}, verification ${before.verification}) and leave curation unchanged.`,
    );
    log("re-run with --apply to write the backups and delete the auth rows.");
    return { applied: false, before, after, backupPaths: [] };
  }

  const backupPaths = await writeBackups(opts.prisma, backupDir, before);
  log(`backups written (${backupPaths.length} files). auth backup contains credentials; keep the directory private.`);
  const after = await deleteAuthInTransaction(opts.prisma, before);
  log("counts after:");
  log(formatCounts(after));
  log("apply ok: auth rows removed, curation counts unchanged.");
  return { applied: true, before, after, backupPaths };
}

export function createPrismaFromEnv(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!process.env.DIRECT_URL) process.env.DIRECT_URL = process.env.DATABASE_URL;
  return new PrismaClient();
}

export function repoRootFromScript(scriptUrl = import.meta.url): string {
  return path.resolve(path.dirname(fileURLToPath(scriptUrl)), "..");
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    if (argv.includes("--help") || argv.includes("-h")) {
      console.log(helpText());
      return 0;
    }
    const args = parseArgs(argv);
    const ownerEmails = parseOwnerEmails(process.env.OWNER_EMAIL);
    const prisma = createPrismaFromEnv();
    try {
      await runResetAdmin({
        prisma,
        ownerEmails,
        apply: args.apply,
        backupDir: args.backupDir,
        repoRoot: repoRootFromScript(),
      });
    } finally {
      await prisma.$disconnect();
    }
    return 0;
  } catch (err) {
    if (err instanceof Error && err.message === "HELP") {
      console.log(helpText());
      return 0;
    }
    const raw = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(redact(raw));
    return 1;
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().then((code) => process.exit(code));
}
