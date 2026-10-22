import { PrismaClient } from "@prisma/client";

/**
 * Serverless isolates were each opening a Prisma pool (cpus*2+1) and the module was
 * duplicated across chunks, so Neon hit its 200-connection cap and the homepage 500'd.
 * One client per isolate, one connection. The pooler URL (Neon "-pooler") is still required.
 */
function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const join = raw.includes("connection_limit=") ? raw : `${raw}${raw.includes("?") ? "&" : "?"}connection_limit=1&pool_timeout=10`;
  return join;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = databaseUrl();
  return new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
}

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
