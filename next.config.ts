import type { NextConfig } from "next";

/**
 * Browser CSP for the portfolio.
 *
 * Next.js App Router inlines scripts for hydration and the raw view inlines a
 * <style> block, so script-src and style-src keep 'unsafe-inline'. A nonce
 * would be tighter, but it has to be threaded through middleware and every
 * Next runtime script; getting that wrong would blank the site. img-src
 * allows https: because project shots and avatars can be remote URLs.
 * frame-ancestors and X-Frame-Options block clickjacking. upgrade-insecure-requests
 * is omitted: production already sends HSTS, and on a local HTTP `next start` the
 * directive would upgrade prefetches to https:// and log a console SSL error.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Classic caching model: pages render per request (cookies: theme, view, NDA), external
  // fetches (Watch, GitHub) are cached with `next.revalidate`.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  // @sparticuz/chromium reads its compressed binary from disk at runtime, and playwright-core
  // reads browsers.json: ship both with every function that can launch a browser.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@sparticuz/chromium/bin/**", "./node_modules/playwright-core/**"],
    "/admin/**": ["./node_modules/@sparticuz/chromium/bin/**", "./node_modules/playwright-core/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
