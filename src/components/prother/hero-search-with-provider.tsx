"use client";

import { ConvexClientProvider } from "./convex-provider";
import { HeroSearch } from "./hero-search";

/**
 * The search island needs Convex realtime context, but the provider must not
 * wrap the server-rendered hero or the root layout.
 */
export function HeroSearchWithProvider() {
  return (
    <ConvexClientProvider>
      <HeroSearch />
    </ConvexClientProvider>
  );
}
