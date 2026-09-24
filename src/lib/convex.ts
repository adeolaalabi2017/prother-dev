/**
 * Convex client plumbing (Phase 1 of the Convex migration).
 *
 * - Server components / route handlers: `createServerConvexClient()` returns
 *   a fetch-based `ConvexHttpClient` (Workers-safe, no Node APIs). Returns
 *   null when `NEXT_PUBLIC_CONVEX_URL` is unset so call sites can fall back
 *   to the Prisma path during the dual-run phases.
 * - Client components: `<ConvexClientProvider>` (in
 *   components/prother/convex-provider.tsx) mounts the realtime
 *   `ConvexReactClient` behind a no-op until components opt into `useQuery`.
 *
 * Nothing reads Convex yet — Prisma remains the source of truth until
 * the Phase 4 route-by-route cutover. See docs/convex-migration-plan.md.
 */
import { ConvexHttpClient } from "convex/browser";

/** Convex deployment URL, or null when not configured (Prisma-only mode). */
export function getConvexUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return url ? url : null;
}

/** True when a Convex backend is configured for this environment. */
export function isConvexConfigured(): boolean {
  return getConvexUrl() !== null;
}

/**
 * Server-side Convex client for server components and route handlers.
 * Null when unconfigured — callers must fall back to the Prisma path.
 */
export function createServerConvexClient(): ConvexHttpClient | null {
  const url = getConvexUrl();
  if (!url) return null;
  return new ConvexHttpClient(url);
}
