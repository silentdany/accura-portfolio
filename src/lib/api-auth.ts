import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

/** Write access for REST/MCP: `Authorization: Bearer $PORTFOLIO_API_TOKEN`. Reads are public. */
export function hasWriteAccess(req: NextRequest | Request): boolean {
  const token = env.apiToken();
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return Boolean(m && safeEqual(m[1].trim(), token));
}

export function bearerOrSecret(req: NextRequest | Request, secret: string | null): boolean {
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return Boolean(m && safeEqual(m[1].trim(), secret));
}
