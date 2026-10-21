import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic caching model: pages render per request (cookies: theme, view, NDA), external
  // fetches (Watch, GitHub) are cached with `next.revalidate`.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
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
