"use client";

import dynamic from "next/dynamic";

/**
 * Client-only mount for the Convex realtime provider.
 *
 * `convex/react` evaluates the `ws` Node WebSocket client at module load,
 * which throws on the Workers runtime — so the implementation
 * (./convex-provider-client) must never be statically imported from the
 * server-render graph. This wrapper is the only export the layout uses.
 */
export const ConvexClientProvider = dynamic(
  () =>
    import("./convex-provider-client").then((m) => ({
      default: m.ConvexClientProviderInner,
    })),
  { ssr: false },
);
