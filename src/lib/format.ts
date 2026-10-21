const nf = new Intl.NumberFormat("fr-FR");
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n >= 10000 ? compact.format(n) : nf.format(n);
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(digits).replace(".", ",").replace(/,0+$/, "")} %`;
}

export function delta(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return (cur - prev) / prev;
}

const df = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const dfShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatDate(d: Date | string | null | undefined, short = false): string {
  if (!d) return "—";
  return (short ? dfShort : df).format(new Date(d));
}

export function relativeTime(d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return "—";
  const diff = (new Date(d).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}
