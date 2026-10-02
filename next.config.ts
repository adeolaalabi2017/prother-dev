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
    ignoreBuildErrors: true,
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
  // Every page route is `force-dynamic`, so Next stamps HTML with
  // `private, no-cache, no-store, max-age=0, must-revalidate` and nothing is
  // cacheable at the edge. That is a dev-grade policy on a read-mostly
  // directory: it forces a fresh origin render + Convex round trip on every
  // crawler hit and every page view.
  //
  // These overrides let the CDN serve a stale copy while it revalidates in the
  // background (stale-while-revalidate), so the user gets a fast TTFB and
  // crawlers stop hitting the origin on every request. The window is short
  // (60s fresh / 300s stale) to bound how long an edit or a newly-submitted
  // tool can take to appear.
  //
  // NOT applied to /api/* (per-user, bookmark, analytics, admin) or to
  // /admin — those stay no-store. Static assets under /_next and /logos keep
  // Next's own immutable handling.
  async headers() {
    return [
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
        // /admin is an authenticated console. Next's static-asset default
        // (s-maxage=31536000) would otherwise pin a stale shell for a year,
        // so force it back to no-store alongside the /api/* routes above.
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
