/**
 * Convex client plumbing.
 *
 * - Server components / route handlers: `createServerConvexClient()` returns
 *   a fetch-based `ConvexHttpClient` (Workers-safe, no Node APIs). Returns
 *   null when `NEXT_PUBLIC_CONVEX_URL` is unset.
 * - Client components: `<ConvexClientProvider>` (in
 *   components/prother/convex-provider.tsx) mounts the realtime
 *   `ConvexReactClient` behind a no-op until components opt into `useQuery`.
 *
 * Convex is the source of truth for reads and writes (cutover complete);
 * micro-SQLite auth.db remains for NextAuth sessions only (Auth phase).
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
