/**
 * Reads a public X thread through the FxTwitter API (https://github.com/FxEmbed/FxEmbed), which
 * needs no X API key: GET api.fxtwitter.com/2/thread/<status id> returns the author's chain of
 * self-replies, each with its text, media and quoted post.
 *
 * A "build in public" recap thread usually quotes the original post on every step ("day 3 : … <quote>").
 * The quoted post is the real event, so when it is the author's own, its date, media and URL win.
 */

type FxMedia = { type: string; url: string; thumbnail_url?: string };
type FxAuthor = { screen_name: string; name: string };
type FxStatus = {
  id: string;
  url: string;
  text: string;
  created_timestamp: number;
  author?: FxAuthor;
  media?: { all?: FxMedia[] } | null;
  quote?: FxStatus | null;
};
type FxThreadResponse = { code: number; status: FxStatus | null; thread: FxStatus[] | null; author: FxAuthor | null; message?: string };

export type XPost = { id: string; url: string; date: Date; title: string | null; body: string; images: string[] };
export type XThread = { rootId: string; url: string; author: { handle: string; name: string }; posts: XPost[] };

const HOSTS = /^(?:www\.|mobile\.)?(?:x|twitter|fxtwitter|fixupx|vxtwitter|fixvx)\.com$/i;

/** The status id of an X post URL (x.com, twitter.com and the fx/vx mirrors), or null. */
export function xStatusId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (!HOSTS.test(u.hostname)) return null;
    return u.pathname.match(/\/status(?:es)?\/(\d{5,25})/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** "day 3 : …", "Bonus, day 2 : …", "J12 - …" become the post title. */
const STEP = /^((?:bonus,?\s*)?(?:day|jour|week|semaine|j|d|w)\s*\d+)\s*[:\-–—]\s*/i;

function images(s: FxStatus | null | undefined): string[] {
  return (s?.media?.all ?? []).map((m) => (m.type === "photo" ? m.url : m.thumbnail_url ?? "")).filter(Boolean);
}

function toPost(s: FxStatus, handle: string): XPost {
  const own = s.quote && s.quote.author?.screen_name.toLowerCase() === handle.toLowerCase() ? s.quote : null;
  let text = s.text;
  // The link to the author's own quoted post is noise once the quote is folded in; so are trailing t.co links.
  if (own) text = text.replace(new RegExp(`\\s*https?://(?:x|twitter)\\.com/\\w+/status/${own.id}\\S*`, "g"), "");
  text = text.replace(/\s*https:\/\/t\.co\/\w+\s*$/g, "").trim();
  const step = text.match(STEP);
  return {
    id: s.id,
    url: own?.url ?? s.url,
    date: new Date((own?.created_timestamp ?? s.created_timestamp) * 1000),
    title: step ? step[1].replace(/\s+/g, " ") : null,
    body: (step ? text.slice(step[0].length) : text).trim() || text,
    images: [...new Set([...images(s), ...images(own)])].slice(0, 4),
  };
}

export async function fetchXThread(url: string): Promise<XThread> {
  const id = xStatusId(url);
  if (!id) throw new Error("Colle l'URL d'un post X (x.com/…/status/…).");
  const res = await fetch(`https://api.fxtwitter.com/2/thread/${id}`, {
    cache: "no-store",
    headers: { "User-Agent": "AccuraPortfolio/1.0 (+https://portfolio.accura.dev)" },
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json().catch(() => null)) as FxThreadResponse | null;
  const chain = body?.thread?.length ? body.thread : body?.status ? [body.status] : [];
  if (!res.ok || !chain.length) {
    throw new Error(`Thread X illisible (${res.status}${body?.message ? ` : ${body.message}` : ""}). Il doit être public.`);
  }
  const author = body?.author ?? chain[0].author;
  const handle = author?.screen_name ?? "";
  const posts = chain.filter((s) => !handle || s.author?.screen_name === handle).map((s) => toPost(s, handle));
  return {
    rootId: chain[0].id,
    url: chain[0].url,
    author: { handle, name: author?.name ?? handle },
    posts,
  };
}
