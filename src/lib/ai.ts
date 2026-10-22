import { env } from "@/lib/env";

/**
 * Optional enrichment through an OpenAI-compatible gateway (Vercel AI Gateway, OpenRouter, …).
 * On Vercel it is on by default (AI Gateway + the deployment's OIDC token). Elsewhere, set
 * AI_GATEWAY_URL (e.g. https://ai-gateway.vercel.sh/v1) and AI_GATEWAY_API_KEY. AI_MODEL is optional.
 */
export function aiEnabled(): boolean {
  return Boolean(env.aiBaseUrl() && env.aiKey());
}

export type EnrichInput = {
  name: string;
  url: string | null;
  description: string | null;
  topics: string[];
  languages: string[];
  readme: string | null;
  homepageText: string | null;
};

export type Enriched = { tagline: string; description: string };

const SYSTEM = `Tu écris les cartes d'un portfolio de développeur freelance (Accura).
Réponds en JSON strict {"tagline": string, "description": string}, en français.
- tagline: une phrase de 4 à 10 mots, concrète, qui dit ce que fait le produit (pas de superlatifs, pas de point final).
- description: 2 à 3 phrases (max 320 caractères) : le problème, ce que le produit fait, pour qui. Ton sobre, précis, zéro jargon marketing.
N'invente aucune fonctionnalité absente des données.`;

/** One JSON completion; null when the gateway is off or the answer is not a JSON object. */
export async function aiJson(system: string, user: string, maxTokens = 400): Promise<Record<string, unknown> | null> {
  const base = env.aiBaseUrl();
  const key = env.aiKey();
  if (!base || !key) return null;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: env.aiModel(),
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  try {
    const parsed: unknown = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function enrichProject(input: EnrichInput): Promise<Enriched | null> {
  const user = JSON.stringify({
    ...input,
    readme: input.readme?.slice(0, 4000) ?? null,
    homepageText: input.homepageText?.slice(0, 1500) ?? null,
  });
  const parsed = await aiJson(SYSTEM, user);
  if (typeof parsed?.tagline !== "string" || typeof parsed.description !== "string") return null;
  return { tagline: parsed.tagline.trim().replace(/\.$/, ""), description: parsed.description.trim() };
}
