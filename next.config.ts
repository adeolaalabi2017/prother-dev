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
};

export default nextConfig;
