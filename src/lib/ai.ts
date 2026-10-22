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
Réponds UNIQUEMENT avec un objet JSON {"tagline": string, "description": string}, en français. Pas de markdown.

- tagline: 6 à 12 mots, concret, ce que fait le produit. Pas de superlatif, pas de point final.

- description: 2 ou 3 paragraphes courts séparés par une ligne vide, vise 500 à 900 caractères.
  1. Le besoin de départ
  2. Ce qui a été construit (fonctions, parcours, contraintes)
  3. Pour qui, et ce qui a été livré
  Utilise la homepage et le README s'ils sont là. N'invente aucune fonctionnalité absente des données.
  Ton sobre. Si les données sont courtes, reste factuel et développe ce qui est là, sans inventer.`;

function parseObject(content: string): Record<string, unknown> | null {
  const cleaned = content.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** One completion. No response_format (free-tier models reject it) and no retry loop (the caller paces). */
export async function aiJson(system: string, user: string, maxTokens = 1400): Promise<Record<string, unknown> | null> {
  const base = env.aiBaseUrl();
  const key = env.aiKey();
  if (!base || !key) return null;
  const model = env.aiModel();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 240);
    const hint =
      res.status === 403 || res.status === 402
        ? " Modèle hors free tier : retire AI_MODEL ou mets AI_MODEL=google/gemini-2.5-flash."
        : "";
    throw new Error(`AI ${model} ${res.status}: ${body}${hint}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseObject(data.choices?.[0]?.message?.content ?? "");
}

export async function enrichProject(input: EnrichInput): Promise<Enriched | null> {
  const user = JSON.stringify({
    ...input,
    readme: input.readme?.slice(0, 4000) ?? null,
    homepageText: input.homepageText?.slice(0, 1500) ?? null,
  });
  const parsed = await aiJson(SYSTEM, user, 1400);
  if (typeof parsed?.tagline !== "string" || typeof parsed.description !== "string") return null;
  const tagline = parsed.tagline.trim().replace(/\.$/, "");
  const description = parsed.description.trim();
  if (tagline.length < 3 || description.length < 40) return null;
  return { tagline, description };
}
