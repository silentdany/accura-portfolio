/**
 * Tests for scripts/reset-admin.ts against a disposable in-memory Postgres (PGlite).
 * These tests never touch a production or preview database.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PrismaClient } from "@prisma/client";
import { PrismaPGlite } from "pglite-prisma-adapter";
import {
  assertResetGuards,
  authEmpty,
  countsEqual,
  curationEqual,
  formatCounts,
  GuardError,
  helpText,
  parseArgs,
  parseOwnerEmails,
  redact,
  resolveBackupDir,
  runResetAdmin,
  type Counts,
  type TransactionalDb,
} from "./reset-admin";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER_EMAIL = "owner@example.com";
const OTHER_EMAIL = "other@example.com";

function schemaSql(): string {
  return execFileSync(
    "pnpm",
    ["exec", "prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    { cwd: REPO_ROOT, encoding: "utf8", env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://unused:unused@127.0.0.1:5432/unused", PRISMA_HIDE_UPDATE_MESSAGE: "1" } },
  );
}

async function openDb(): Promise<{ prisma: PrismaClient; close: () => Promise<void> }> {
  const pg = new PGlite();
  await pg.exec(schemaSql());
  // pglite-prisma-adapter@0.6.1 is runtime-compatible with Prisma 6.19; its typings pin an older adapter utils package.
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) as never });
  return {
    prisma,
    close: async () => {
      await prisma.$disconnect();
      await pg.close();
    },
  };
}

async function seedCuration(prisma: PrismaClient) {
  const category = await prisma.category.create({ data: { slug: "tools", name: "Tools", position: 1 } });
  const project = await prisma.project.create({
    data: {
      slug: "demo",
      name: "Demo",
      description: "A sample project",
      url: "https://example.com",
      screenshots: ["https://example.com/shot.png"],
      categories: { connect: { id: category.id } },
    },
  });
  await prisma.capture.create({
    data: {
      projectId: project.id,
      kind: "desktop",
      url: "https://example.com",
      hash: "abc123",
      width: 10,
      height: 10,
      mime: "image/png",
      data: Buffer.from("fake-png"),
    },
  });
  const thread = await prisma.thread.create({
    data: { slug: "build", title: "Build log", repos: ["example/demo"], projectId: project.id },
  });
  await prisma.threadPost.create({ data: { threadId: thread.id, body: "Started the build.", title: "Day 1" } });
  await prisma.setting.create({ data: { key: "profile", value: { name: "Example" } } });
  await prisma.syncRun.create({ data: { trigger: "admin", ok: true, stats: { projects: 1 } } });
}

async function seedOwner(prisma: PrismaClient, email = OWNER_EMAIL) {
  const user = await prisma.user.create({
    data: { id: "user_1", name: "Owner", email, emailVerified: true },
  });
  await prisma.account.create({
    data: {
      id: "acc_1",
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: "hash-not-a-real-password",
    },
  });
  await prisma.session.create({
    data: {
      id: "sess_1",
      token: "token-1",
      userId: user.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  await prisma.verification.create({
    data: {
      id: "ver_1",
      identifier: email,
      value: "verify-token",
      expiresAt: new Date(Date.now() + 3_600_000),
    },
  });
  return user;
}

async function tmpBackupDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "accura-reset-admin-"));
}

const logs: string[] = [];
function captureLog(line: string) {
  logs.push(line);
}

describe("reset-admin helpers", () => {
  it("parses OWNER_EMAIL lists the same way as auth.ts", () => {
    assert.deepEqual(parseOwnerEmails("  Owner@example.com, other@example.com "), [OWNER_EMAIL, OTHER_EMAIL]);
    assert.deepEqual(parseOwnerEmails(undefined), []);
  });

  it("defaults to dry-run and requires a backup path", () => {
    const opts = parseArgs(["--backup", "/tmp/accura-reset"]);
    assert.equal(opts.apply, false);
    assert.equal(opts.backupDir, "/tmp/accura-reset");
    assert.equal(parseArgs(["--apply", "--backup", "/tmp/accura-reset"]).apply, true);
    assert.throws(() => parseArgs([]), /--backup/);
    assert.throws(() => parseArgs(["--apply", "--dry-run", "--backup", "/tmp/x"]), /only one/);
    assert.throws(() => parseArgs(["--oops"]), /unknown argument/);
  });

  it("rejects a backup path inside the repository", () => {
    assert.throws(() => resolveBackupDir("scripts", REPO_ROOT), /outside the repository/);
    assert.throws(() => resolveBackupDir(REPO_ROOT, REPO_ROOT), /outside the repository/);
    const outside = resolveBackupDir(path.join(os.tmpdir(), "accura-reset"), REPO_ROOT);
    assert.ok(outside.startsWith(os.tmpdir()));
  });

  it("redacts connection strings and never keeps the secret fragment", () => {
    const leaked = "error postgresql://user:super-secret@db.example.com/portfolio?sslmode=require boom DATABASE_URL=postgresql://x";
    const cleaned = redact(leaked);
    assert.equal(cleaned.includes("super-secret"), false);
    assert.equal(cleaned.includes("db.example.com"), false);
    assert.match(cleaned, /postgresql:\/\/\[redacted\]/);
    assert.match(cleaned, /DATABASE_URL=\[redacted\]/);
  });

  it("refuses when the user count or email guard fails, without putting the email in the error", () => {
    assert.throws(() => assertResetGuards([], [OWNER_EMAIL]), GuardError);
    assert.throws(() => assertResetGuards([{ email: OWNER_EMAIL }, { email: OTHER_EMAIL }], [OWNER_EMAIL]), /more than one user/);
    const mismatch = () => assertResetGuards([{ email: OTHER_EMAIL }], [OWNER_EMAIL]);
    assert.throws(mismatch, /does not match OWNER_EMAIL/);
    try {
      mismatch();
    } catch (err) {
      assert.ok(err instanceof GuardError);
      assert.equal(err.message.includes(OTHER_EMAIL), false);
      assert.equal(err.message.includes(OWNER_EMAIL), false);
    }
    assert.throws(() => assertResetGuards([{ email: OWNER_EMAIL }], []), /OWNER_EMAIL is not set/);
    assert.doesNotThrow(() => assertResetGuards([{ email: "  Owner@example.com " }], [OWNER_EMAIL]));
  });

  it("formats counts without leaking row contents", () => {
    const counts = {
      user: 1,
      session: 1,
      account: 1,
      verification: 0,
      project: 4,
      capture: 2,
      category: 1,
      thread: 1,
      threadPost: 3,
      setting: 2,
      syncRun: 1,
      categoryToProject: 1,
    } satisfies Counts;
    const text = formatCounts(counts);
    assert.match(text, /project\s+4/);
    assert.equal(text.includes("@"), false);
    assert.ok(helpText().includes("--apply"));
  });
});

describe("reset-admin against PGlite", () => {
  let prisma: PrismaClient;
  let close: () => Promise<void>;
  let backupDir: string;

  before(async () => {
    const db = await openDb();
    prisma = db.prisma;
    close = db.close;
    await seedCuration(prisma);
    await seedOwner(prisma);
    backupDir = await tmpBackupDir();
  });

  after(async () => {
    await close?.();
    if (backupDir) await rm(backupDir, { recursive: true, force: true });
  });

  it("dry-run does not modify rows or write backups", async () => {
    logs.length = 0;
    const before = await runResetAdmin({
      prisma: prisma as unknown as TransactionalDb,
      ownerEmails: [OWNER_EMAIL],
      apply: false,
      backupDir,
      repoRoot: REPO_ROOT,
      log: captureLog,
    });
    assert.equal(before.applied, false);
    assert.equal(before.backupPaths.length, 0);
    assert.equal(await prisma.user.count(), 1);
    assert.equal(await prisma.session.count(), 1);
    assert.equal(await prisma.account.count(), 1);
    assert.equal(await prisma.verification.count(), 1);
    assert.equal(await prisma.project.count(), 1);
    assert.ok(countsEqual(before.before, before.after));
    const entries = await readdir(backupDir).catch(() => []);
    assert.equal(entries.length, 0);
    assert.ok(logs.some((l) => l.includes("dry-run")));
  });

  it("apply deletes auth, leaves curation intact, and writes backups", async () => {
    logs.length = 0;
    const result = await runResetAdmin({
      prisma: prisma as unknown as TransactionalDb,
      ownerEmails: [OWNER_EMAIL],
      apply: true,
      backupDir,
      repoRoot: REPO_ROOT,
      log: captureLog,
    });
    assert.equal(result.applied, true);
    assert.ok(authEmpty(result.after));
    assert.ok(curationEqual(result.before, result.after));
    assert.equal(result.after.project, 1);
    assert.equal(result.after.capture, 1);
    assert.equal(result.after.category, 1);
    assert.equal(result.after.thread, 1);
    assert.equal(result.after.threadPost, 1);
    assert.equal(result.after.setting, 1);
    assert.equal(result.after.syncRun, 1);
    assert.equal(result.after.categoryToProject, 1);
    assert.equal(await prisma.user.count(), 0);
    assert.equal(await prisma.project.count(), 1);
    const project = await prisma.project.findFirstOrThrow({ include: { categories: true, captures: true } });
    assert.equal(project.name, "Demo");
    assert.equal(project.categories.length, 1);
    assert.equal(project.captures.length, 1);
    assert.deepEqual(project.screenshots, ["https://example.com/shot.png"]);

    const auth = JSON.parse(await readFile(path.join(backupDir, "auth.json"), "utf8")) as { user: Array<{ email: string }>; account: Array<{ password: string }> };
    assert.equal(auth.user[0]?.email, OWNER_EMAIL);
    assert.equal(auth.account[0]?.password, "hash-not-a-real-password");
    const joined = JSON.parse(await readFile(path.join(backupDir, "curation.json"), "utf8")) as { project: Array<{ name: string }>; categoryToProject: unknown[] };
    assert.equal(joined.project[0]?.name, "Demo");
    assert.equal(joined.categoryToProject.length, 1);
    const logText = logs.join("\n");
    assert.equal(logText.includes(OWNER_EMAIL), false);
    assert.equal(logText.includes("hash-not-a-real-password"), false);
  });

  it("apply refuses when no user remains, and leaves curation untouched", async () => {
    const emptyDir = await tmpBackupDir();
    try {
      await assert.rejects(
        () =>
          runResetAdmin({
            prisma: prisma as unknown as TransactionalDb,
            ownerEmails: [OWNER_EMAIL],
            apply: true,
            backupDir: emptyDir,
            repoRoot: REPO_ROOT,
            log: captureLog,
          }),
        /signup is already open/,
      );
      assert.equal(await prisma.project.count(), 1);
      assert.deepEqual(await readdir(emptyDir), []);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});

describe("reset-admin guards against PGlite", () => {
  it("refuses when more than one user exists and does not delete", async () => {
    const { prisma, close } = await openDb();
    const backupDir = await tmpBackupDir();
    try {
      await seedCuration(prisma);
      await seedOwner(prisma, OWNER_EMAIL);
      await prisma.user.create({ data: { id: "user_2", name: "Other", email: OTHER_EMAIL } });
      await assert.rejects(
        () =>
          runResetAdmin({
            prisma: prisma as unknown as TransactionalDb,
            ownerEmails: [OWNER_EMAIL],
            apply: true,
            backupDir,
            repoRoot: REPO_ROOT,
            log() {},
          }),
        /more than one user/,
      );
      assert.equal(await prisma.user.count(), 2);
      assert.equal(await prisma.project.count(), 1);
      assert.deepEqual(await readdir(backupDir), []);
    } finally {
      await close();
      await rm(backupDir, { recursive: true, force: true });
    }
  });

  it("refuses when the user email does not match OWNER_EMAIL and does not leak the email", async () => {
    const { prisma, close } = await openDb();
    const backupDir = await tmpBackupDir();
    try {
      await seedCuration(prisma);
      await seedOwner(prisma, OTHER_EMAIL);
      await assert.rejects(
        () =>
          runResetAdmin({
            prisma: prisma as unknown as TransactionalDb,
            ownerEmails: [OWNER_EMAIL],
            apply: true,
            backupDir,
            repoRoot: REPO_ROOT,
            log() {},
          }),
        (err: unknown) => {
          assert.ok(err instanceof GuardError);
          assert.equal(err.message.includes(OTHER_EMAIL), false);
          assert.equal(err.message.includes(OWNER_EMAIL), false);
          assert.match(err.message, /does not match OWNER_EMAIL/);
          return true;
        },
      );
      assert.equal(await prisma.user.count(), 1);
      assert.equal(await prisma.account.count(), 1);
      assert.equal(await prisma.project.count(), 1);
    } finally {
      await close();
      await rm(backupDir, { recursive: true, force: true });
    }
  });

  it("refuses a backup path inside the repo before writing", async () => {
    const { prisma, close } = await openDb();
    try {
      await seedCuration(prisma);
      await seedOwner(prisma);
      const inside = path.join(REPO_ROOT, "scripts", "should-not-be-written");
      await assert.rejects(
        () =>
          runResetAdmin({
            prisma: prisma as unknown as TransactionalDb,
            ownerEmails: [OWNER_EMAIL],
            apply: true,
            backupDir: inside,
            repoRoot: REPO_ROOT,
            log() {},
          }),
        /outside the repository/,
      );
      assert.equal(await prisma.user.count(), 1);
    } finally {
      await close();
    }
  });
});

describe("rollback inside the transaction", () => {
  it("rolls back auth deletes when post-delete verification fails", async () => {
    const { prisma, close } = await openDb();
    const backupDir = await tmpBackupDir();
    try {
      await seedCuration(prisma);
      await seedOwner(prisma);
      const wrapped: TransactionalDb = {
        ...(prisma as unknown as TransactionalDb),
        $transaction: async (fn) =>
          prisma.$transaction(async (tx) => {
            const hooked = new Proxy(tx, {
              get(target, prop, receiver) {
                if (prop === "project") {
                  return { count: async () => 999, findMany: () => target.project.findMany() };
                }
                return Reflect.get(target, prop, receiver);
              },
            });
            return fn(hooked as unknown as TransactionalDb);
          }),
      };
      await assert.rejects(
        () =>
          runResetAdmin({
            prisma: wrapped,
            ownerEmails: [OWNER_EMAIL],
            apply: true,
            backupDir,
            repoRoot: REPO_ROOT,
            log() {},
          }),
        /rolling back/,
      );
      assert.equal(await prisma.user.count(), 1);
      assert.equal(await prisma.session.count(), 1);
      assert.equal(await prisma.account.count(), 1);
      assert.equal(await prisma.verification.count(), 1);
      assert.equal(await prisma.project.count(), 1);
    } finally {
      await close();
      await rm(backupDir, { recursive: true, force: true });
    }
  });
});
