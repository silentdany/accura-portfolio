import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** scrypt hash for NDA passwords: "scrypt$<salt>$<hash>". */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function hmac(value: string): string {
  return createHmac("sha256", env.authSecret()).update(value).digest("base64url");
}

/**
 * NDA unlock token: bound to the project slug and to the current password hash,
 * so changing the password revokes every issued token.
 */
export function ndaToken(slug: string, passwordHash: string, expiresAt: number): string {
  const payload = `${slug}.${expiresAt}`;
  return `${expiresAt}.${hmac(`${payload}.${passwordHash}`)}`;
}

export function verifyNdaToken(token: string | undefined, slug: string, passwordHash: string | null): boolean {
  if (!token || !passwordHash) return false;
  const [exp, sig] = token.split(".");
  const expiresAt = Number(exp);
  if (!sig || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(sig, hmac(`${slug}.${expiresAt}.${passwordHash}`));
}

export function shortHash(value: string): string {
  return createHmac("sha256", "portfolio").update(value).digest("hex").slice(0, 16);
}
