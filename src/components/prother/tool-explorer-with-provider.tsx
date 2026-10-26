"use client";

import { ConvexClientProvider } from "./convex-provider";
import { ToolExplorer } from "./tool-explorer";

/**
 * The command palette needs Convex realtime context. Keep that client-only
 * dependency inside the palette island rather than around the whole app.
 */
export function ToolExplorerWithProvider() {
  return (
    <ConvexClientProvider>
      <ToolExplorer />
    </ConvexClientProvider>
  );
}
