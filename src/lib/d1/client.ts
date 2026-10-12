/**
 * D1 client for Workers (Cloudflare target of the Convex migration).
 *
 * - On Workers (OpenNext): binds via getCloudflareContext().env.DB.
 * - Local `bun run dev` / preview without bindings: returns null so callers
 *   fall back to the Convex path in src/lib/data.ts (dual-run period).
 */
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

let cached: DrizzleD1Database<typeof schema> | null = null;

export async function getD1(): Promise<DrizzleD1Database<typeof schema> | null> {
  if (cached) return cached;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const db = (ctx.env as Record<string, unknown>).DB as
      | import("@cloudflare/workers-types").D1Database
      | undefined;
    if (!db) return null;
    cached = drizzle(db, { schema });
    return cached;
  } catch {
    return null;
  }
}

/** True when running with a D1 binding (Workers prod/preview). */
export async function hasD1(): Promise<boolean> {
  return (await getD1()) !== null;
}

/** Observability label for API responses: which store actually served reads. */
export async function dataBackendLabel(): Promise<"d1" | "convex"> {
  return (await getD1()) !== null ? "d1" : "convex";
}
