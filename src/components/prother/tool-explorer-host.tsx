"use client";

import dynamic from "next/dynamic";

/**
 * Client-only mount for the ToolExplorer overlay.
 *
 * next/dynamic with ssr:false cannot live in a Server Component, so the
 * layout imports this host instead. tool-explorer subscribes via
 * convex/react, whose module evaluation pulls the `ws` Node client and
 * throws on Workers (see convex-provider.tsx).
 */
export const ToolExplorerHost = dynamic(
  () =>
    import("./tool-explorer").then((m) => ({ default: m.ToolExplorer })),
  { ssr: false },
);
