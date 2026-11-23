import type { NextConfig } from "next";

// ── Cloudflare Workers (OpenNext) ───────────────────────────────────────
// Opt-in dev-bindings proxy so the default dev server stays lean.
// Enable locally with:  NEXT_CF_DEV=1 bun run dev   (see DEPLOY.md)
if (process.env.NEXT_CF_DEV === "1") {
  void import("@opennextjs/cloudflare").then((m) =>
    m.initOpenNextCloudflareForDev(),
  );
}

const nextConfig: NextConfig = {
  // `standalone` serves the self-hosted/Node runtime path (bun run build/start).
  // OpenNext's Cloudflare build needs the regular .next output, so it is dropped
  // when building for Workers (cf:* scripts set NEXT_OUTPUT=cloudflare).
  output: process.env.NEXT_OUTPUT === "cloudflare" ? undefined : "standalone",
  typescript: {
    // Build type errors now fail the build. `tsc --noEmit` is clean, so the
    // gate costs nothing; keep it on so regressions cannot ship silently.
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // The `convex` package ships a Node variant of its browser entry
  // (`index-node.js` → `simple_client-node.js`, which inlines the `ws`
  // Node WebSocket client + native addon shims) selected via the `node`
  // export condition. That graph throws at module evaluation on workerd,
  // and our server paths only ever need the fetch-based ConvexHttpClient
  // — so resolve `convex/browser` straight at the browser entry, whose
  // transitive imports are all Workers-safe.
  turbopack: {
    resolveAlias: {
      "convex/browser": "./node_modules/convex/dist/esm/browser/index.js",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "convex/browser": "./node_modules/convex/dist/esm/browser/index.js",
    };
    return config;
  },
  // Every page route is `force-dynamic`, so Next stamps HTML with
  // `private, no-cache, no-store, max-age=0, must-revalidate` and nothing is
  // cacheable at the edge. That is a dev-grade policy on a read-mostly
  // directory: it forces a fresh origin render + Convex round trip on every
  // crawler hit and every page view.
  //
  // A Worker runs before Cloudflare's CDN cache, so these headers are enforced
  // by the edge cache in worker.ts (Cache API), not by the CDN itself.
  //
  // These overrides let the CDN serve a stale copy while it revalidates in the
  // background (stale-while-revalidate), so the user gets a fast TTFB and
  // crawlers stop hitting the origin on every request. The window is short
  // (60s fresh / 300s stale) to bound how long an edit or a newly-submitted
  // tool can take to appear.
  //
  // NOT applied to /api/* (per-user, bookmark, analytics, admin) or to
  // /admin - those stay no-store. Static assets under /_next and /logos keep
  // Next's own immutable handling.
  // /tools renders from two internal routes. Requests carrying a filter, search
  // or page param need searchParams, so they go to the per-request /tools-live.
  // Plain /tools goes to /tools-default/all, an ISR page. The URL the visitor
  // sees never changes; query strings are forwarded to the destination.
  async rewrites() {
    return {
      beforeFiles: [
        ...["q", "tag", "pricing", "sort", "page"].map((key) => ({
          source: "/tools",
          has: [{ type: "query" as const, key }],
          destination: "/tools-live",
        })),
        { source: "/tools", destination: "/tools-default/all" },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: "/categories",
        destination: "/tools",
        permanent: true,
      },
      {
        // There is no /search page; search lives at /tools?q= (the
        // SearchAction target). Bots and guessed URLs hit /search ~35x/day.
        // Next forwards the query string, so /search?q=x lands on /tools?q=x.
        source: "/search",
        destination: "/tools",
        permanent: true,
      },
      {
        // Crawlers (PerplexityBot, Baidu, Meta) probe the WordPress/Yoast
        // sitemap index name; the real sitemap is /sitemap.xml.
        source: "/sitemap_index.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Global defense-in-depth security headers applied to all routes
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms https://scripts.clarity.ms https://*.clarity.ms https://challenges.cloudflare.com",
              "frame-src 'self' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://www.clarity.ms https://*.clarity.ms https://api.github.com",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
      {
        source:
          "/:path((?!api|admin|_next|logos|favicon.ico|robots.txt|sitemap.xml).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // /admin is an authenticated console. Strictly forbid framing and caching.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
