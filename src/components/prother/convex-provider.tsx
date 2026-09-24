"use client";

import { useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

/**
 * Realtime Convex context (Phase 4 step 2: live for search surfaces).
 *
 * The provider ALWAYS mounts so `useQuery` never throws: without a
 * configured URL it holds an inert placeholder client that never connects
 * (every query passes "skip" in that mode — see CONVEX_LIVE in the search
 * components, which keep their /api fetch fallback). With a URL, subscribed
 * components update live over websocket.
 */
export function ConvexClientProvider({
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
