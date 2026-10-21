import { ogCard, OG_SIZE } from "@/lib/og";
import { getProfile } from "@/lib/settings";
import { siteUrl } from "@/lib/env";

export const alt = "Portfolio";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image() {
  const profile = await getProfile();
  return ogCard({ eyebrow: "accura / portfolio", title: profile.name, subtitle: profile.headline, footer: siteUrl().replace(/^https?:\/\//, "") });
}
