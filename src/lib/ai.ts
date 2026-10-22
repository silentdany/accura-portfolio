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

const SYSTEM = `Tu écris les fiches d'un portfolio de développeur freelance (Accura).
Réponds en JSON strict {"tagline": string, "description": string}, en français.

- tagline: une phrase de 6 à 12 mots, concrète, qui dit ce que fait le produit. Pas de superlatifs, pas de point final.

- description: OBLIGATOIREMENT entre 500 et 1000 caractères. Écris 2 à 3 paragraphes courts séparés par une ligne vide.
  Structure obligatoire :
  1. Le problème ou le besoin de départ (1–2 phrases)
  2. Ce qui a été construit : fonctionnalités principales, parcours utilisateur, contraintes métier (2–3 phrases)
  3. Pour qui / dans quel contexte, et ce qui a été livré (1–2 phrases)
  Utilise TOUT le texte de la homepage et le README s'ils sont présents. Développe, ne résume pas en une phrase.
  Ton sobre, précis, zéro jargon marketing. N'invente aucune fonctionnalité absente des données fournies.
  Si les données sont courtes, reste factuel mais écris quand même 2 paragraphes minimum en développant ce qui est là.`;

/** One JSON completion; null when the gateway is off or the answer is not a JSON object. */
export async function aiJson(system: string, user: string, maxTokens = 900): Promise<Record<string, unknown> | null> {
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
  const parsed = await aiJson(SYSTEM, user, 900);
  if (typeof parsed?.tagline !== "string" || typeof parsed.description !== "string") return null;
  return { tagline: parsed.tagline.trim().replace(/\.$/, ""), description: parsed.description.trim() };
}
