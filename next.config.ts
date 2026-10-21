import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic caching model: pages render per request (cookies: theme, view, NDA), external
  // fetches (Watch, GitHub) are cached with `next.revalidate`.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  // @sparticuz/chromium reads its compressed binary from disk at runtime: ship it with every
  // function that can launch a browser (sync, captures, PDF, admin actions).
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/admin/**": ["./node_modules/@sparticuz/chromium/bin/**"],
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
        ],
      },
    ];
  },
};

export default nextConfig;
