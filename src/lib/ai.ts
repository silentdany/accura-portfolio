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
Réponds UNIQUEMENT avec un objet JSON {"tagline": string, "description": string}, en français. Pas de markdown, pas de balise think.

- tagline: 6 à 12 mots, concret, ce que fait le produit. Pas de superlatif, pas de point final.

- description: 2 ou 3 paragraphes courts séparés par une ligne vide, vise 500 à 900 caractères.
  1. Le besoin de départ
  2. Ce qui a été construit (fonctions, parcours, contraintes)
  3. Pour qui, et ce qui a été livré
  Le README GitHub est la source principale quand il est fourni : sers-t'en. La homepage complète.
  N'invente aucune fonctionnalité absente des données.
  Ton sobre. Si les données sont courtes, reste factuel et développe uniquement ce qui est là.`;

/** Drop badges, images and huge code blocks so the model reads the project, not the shields. */
export function usefulReadme(raw: string | null): string | null {
  if (!raw) return null;
  let text = raw.replace(/\r\n/g, "\n");
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  text = text.replace(/<img[^>]*>/gi, "");
  text = text.replace(/^\s*\[?\s*!\[[^\]]*\]\([^)]*\)[^\n]*$/gm, "");
  text = text.replace(/```[\s\S]*?```/g, (block) => (block.length > 600 ? "" : block));
  const lines = text.split("\n").filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (/shields\.io|badgen\.net|badge\.|travis-ci|codecov|github\.com\/.*actions|vercel\.com\/button/i.test(t)) return false;
    if (/^\[\!\[/.test(t)) return false;
    return true;
  });
  text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 80) return null;
  return text.slice(0, 5000);
}

function usefulHome(raw: string | null): string | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length >= 40 ? text.slice(0, 1800) : null;
}

function parseObject(content: string): Record<string, unknown> | null {
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "").trim();
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

type GatewayMessage = {
  content?: string | null;
  reasoning_content?: string | null;
};

/** One completion. Reasoning stays low: MiniMax M3.1 defaults to max and then returns an empty fiche. */
export async function aiJson(system: string, user: string, maxTokens = 1800): Promise<Record<string, unknown> | null> {
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
      temperature: 0.3,
      max_tokens: maxTokens,
      reasoning_effort: "low",
      reasoning: { effort: "low" },
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
        ? " Modèle refusé. Retire AI_MODEL pour revenir à minimax/minimax-m3.1-flash, ou mets un modèle du free tier."
        : "";
    throw new Error(`AI ${model} ${res.status}: ${body}${hint}`);
  }
  const data = (await res.json()) as { choices?: { message?: GatewayMessage }[] };
  const message = data.choices?.[0]?.message;
  const content = (message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  if (!content) {
    const thought = message?.reasoning_content?.trim();
    throw new Error(
      thought
        ? "Le modèle n'a renvoyé que sa réflexion, pas de fiche."
        : "Réponse du modèle vide.",
    );
  }
  const parsed = parseObject(content);
  if (!parsed) throw new Error(`JSON illisible : ${content.slice(0, 160).replace(/\s+/g, " ")}`);
  return parsed;
}

export async function enrichProject(input: EnrichInput): Promise<Enriched | null> {
  const readme = usefulReadme(input.readme);
  const home = usefulHome(input.homepageText);
  const user = [
    `Projet: ${input.name}`,
    input.url ? `URL: ${input.url}` : null,
    input.description ? `Description du dépôt: ${input.description}` : null,
    input.languages.length ? `Langages: ${input.languages.join(", ")}` : null,
    input.topics.length ? `Topics: ${input.topics.join(", ")}` : null,
    readme
      ? `README GitHub, source principale. Décris le projet à partir de ce texte, sans inventer:\n\n${readme}`
      : "Pas de README exploitable. Reste sur la description et la homepage, sans inventer.",
    home ? `Texte visible de la homepage:\n\n${home}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const parsed = await aiJson(SYSTEM, user, 1800);
  const tagline = typeof parsed?.tagline === "string" ? parsed.tagline.trim().replace(/\.$/, "") : "";
  let description = typeof parsed?.description === "string" ? parsed.description.trim() : "";
  if (description.includes("\\n")) description = description.replace(/\\n/g, "\n").trim();
  if (tagline.length < 3 || description.length < 80) {
    throw new Error(
      `Fiche trop courte (${description.length} car., README ${readme ? `${readme.length} car.` : "absent"}).`,
    );
  }
  return { tagline, description };
}
