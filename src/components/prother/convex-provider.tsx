"use client";

import { ConvexClientProviderInner } from "./convex-provider-client";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexClientProviderInner>{children}</ConvexClientProviderInner>;
}

