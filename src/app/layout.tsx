import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { siteUrl } from "@/lib/env";
import { getProfile } from "@/lib/settings";
import { THEME_COOKIE, isTheme } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const title = `${profile.name} — Portfolio`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${profile.name}` },
    description: profile.headline,
    applicationName: "Accura Portfolio",
    authors: [{ name: profile.name, url: "https://accura.dev" }],
    alternates: { canonical: "/", types: { "application/json": "/api/v1/projects" } },
    openGraph: { type: "website", siteName: "Accura Portfolio", title, description: profile.headline, locale: "fr_FR", url: "/" },
    twitter: { card: "summary_large_image", title, description: profile.headline },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <html lang="fr" data-theme={isTheme(theme) && theme !== "system" ? theme : undefined} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} min-h-screen font-sans text-[15px] antialiased`}>
        {children}
      </body>
    </html>
  );
}
