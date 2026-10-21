import { cookies } from "next/headers";
import type { Project } from "@prisma/client";
import { verifyNdaToken } from "@/lib/crypto";
import { isAdmin } from "@/lib/require-session";

/** Unlocked if not NDA, if the visitor holds a valid unlock cookie, or if the owner is signed in. */
export async function isUnlocked(p: Pick<Project, "slug" | "nda" | "ndaPasswordHash">): Promise<boolean> {
  if (!p.nda) return true;
  const token = (await cookies()).get(`nda_${p.slug}`)?.value;
  if (verifyNdaToken(token, p.slug, p.ndaPasswordHash)) return true;
  return isAdmin();
}
