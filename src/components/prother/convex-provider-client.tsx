"use client";

import { useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

/**
 * Realtime Convex context client implementation.
 *
 * Split from ./convex-provider (which loads this with ssr:false): the
 * `convex/react` module pulls the `ws` Node WebSocket client at module
 * evaluation time, which throws on the Workers runtime. Nothing in the
 * server-render graph may statically import this file.
 *
 * The provider ALWAYS mounts so `useQuery` never throws: without a
 * configured URL it holds an inert placeholder client that never connects
 * (every query passes "skip" in that mode — see CONVEX_LIVE in the search
 * components, which keep their /api fetch fallback). With a URL, subscribed
 * components update live over websocket.
 */
export function ConvexClientProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useMemo(() => {
    const url =
      process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || "https://convex.invalid";
    return new ConvexReactClient(url);
  }, []);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
