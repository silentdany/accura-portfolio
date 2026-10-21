/**
 * Display modes for the public pages. Add one here, then render it in components/views.
 * Selected with ?view=<id> (remembered in a cookie); the admin sets the default.
 */
export const VIEWS = [
  { id: "accura", label: "Accura", description: "Bento cream & encre, la version de base." },
  { id: "raw", label: "Raw", description: "HTML pur, ultra-minimaliste, façon bellard.org." },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export function isView(v: unknown): v is ViewId {
  return VIEWS.some((x) => x.id === v);
}

export const VIEW_COOKIE = "pf_view";
