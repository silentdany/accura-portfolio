"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ndaToken, verifyPassword } from "@/lib/crypto";

export type UnlockState = { error?: string; ok?: boolean };

const TTL = 30 * 86400_000;

/** NDA unlock: checks the project password and sets a signed, httpOnly cookie for 30 days. */
export async function unlockProject(_: UnlockState, form: FormData): Promise<UnlockState> {
  const slug = String(form.get("slug") ?? "");
  const password = String(form.get("password") ?? "");
  const p = await prisma.project.findUnique({ where: { slug }, select: { nda: true, ndaPasswordHash: true } });
  if (!p?.nda || !p.ndaPasswordHash) return { error: "Ce projet n'a pas de mot de passe défini." };
  if (!verifyPassword(password, p.ndaPasswordHash)) return { error: "Mot de passe incorrect." };
  const expiresAt = Date.now() + TTL;
  (await cookies()).set(`nda_${slug}`, ndaToken(slug, p.ndaPasswordHash, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/`,
    expires: new Date(expiresAt),
  });
  return { ok: true };
}
