import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isView, type ViewId } from "@/lib/views";

export const linkSchema = z.object({ label: z.string().min(1).max(40), url: z.string().url() });

export const profileSchema = z.object({
  name: z.string().min(1).max(60),
  headline: z.string().max(140),
  bio: z.string().max(600),
  location: z.string().max(60).optional().default(""),
  email: z.string().max(120).optional().default(""),
  avatar: z.string().max(500).optional().default(""),
  available: z.boolean().default(true),
  availability: z.string().max(80).optional().default(""),
  links: z.array(linkSchema).max(12).default([]),
});

export type Profile = z.infer<typeof profileSchema>;

export const DEFAULT_PROFILE: Profile = {
  name: "Dany",
  headline: "Je conçois et je code des produits web — SaaS, outils MCP et sites qui tiennent la route.",
  bio: "Fondateur d'Accura. Next.js, TypeScript, Postgres et beaucoup d'automatisation. Ce portfolio se met à jour tout seul depuis Vercel et GitHub.",
  location: "France",
  email: "dany@accura.dev",
  avatar: "",
  available: true,
  availability: "Disponible pour des missions",
  links: [
    { label: "accura.dev", url: "https://accura.dev" },
    { label: "GitHub", url: "https://github.com/silentdany" },
    { label: "X", url: "https://x.com" },
  ],
};

async function getSetting<T>(key: string): Promise<T | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return (row?.value as T) ?? null;
  } catch {
    return null; // DB unreachable (e.g. build without DATABASE_URL): fall back to defaults
  }
}

async function setSetting(key: string, value: unknown) {
  const json = value as Prisma.InputJsonValue;
  await prisma.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

export async function getProfile(): Promise<Profile> {
  const stored = await getSetting<unknown>("profile");
  const parsed = profileSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : DEFAULT_PROFILE;
}

export async function saveProfile(profile: Profile) {
  await setSetting("profile", profileSchema.parse(profile));
}

export async function getDefaultView(): Promise<ViewId> {
  const v = await getSetting<string>("defaultView");
  return isView(v) ? v : "accura";
}

export async function saveDefaultView(view: ViewId) {
  await setSetting("defaultView", view);
}
