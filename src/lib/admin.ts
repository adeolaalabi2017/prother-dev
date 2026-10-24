import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { editorKey } from "@/lib/prother";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api.js";

/**
 * Admin auth + audit helpers for the Admin Console APIs.
 * Two gates, both fail-closed in production:
 *  1. `x-editor-key` header equals ADMIN_KEY (constant-time compare), or
 *  2. a valid NextAuth session whose user has role `admin` (P2 admin
 *     accounts). The shared key stays as the fallback path.
 */

/**
 * NextAuth P2: the signed-in admin for this request, or null. Looks the
 * role up by email (by_email index) so role changes apply immediately.
 */
export async function sessionAdmin(
  req?: Request
): Promise<{ handle: string; email: string } | null> {
  try {
    const { getAuthUser } = await import("@/lib/auth");
    const user = await getAuthUser();
    if (!user) return null;
    const client = createServerConvexClient();
    if (!client) return null;
    const st = await client.query(api.users.roleByEmail, { email: user.email });
    if (!st || st.status !== "active" || st.role !== "admin") return null;
    return { handle: st.handle ?? user.handle, email: user.email };
  } catch {
    return null;
  }
}

/** Audit actor label: the signed-in admin's handle, else the shared key. */
export async function adminActor(req?: Request): Promise<string> {
  const admin = await sessionAdmin(req);
  return admin ? `@${admin.handle}` : "key";
}

/** Editor/admin authorization (shared key OR active admin session). */
export async function editorAuthorized(req: Request): Promise<boolean> {
  if (isAdmin(req)) return true;
  return (await sessionAdmin(req)) !== null;
}

export function isAdmin(req: Request): boolean {
  const key = editorKey();
  const supplied = req.headers.get("x-editor-key");
  if (key == null || supplied == null) return false;
  const a = new TextEncoder().encode(key);
  const b = new TextEncoder().encode(supplied);
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Wrap a handler with the admin gate: returns the 401 response or null. */
export async function guard(req: Request): Promise<NextResponse | null> {
  return (await editorAuthorized(req)) ? null : unauthorized();
}

/** Fire-and-forget audit trail write (PRD §16 — moderation_decisions analog).
 *  Convex-only: the admin overview reads the trail from there. Failures
 *  never break the request path. entityId carries the legacy cuid; actor
 *  labels the operator ("key" by default, or @handle for session admins). */
export function logAudit(
  action: string,
  entity: string,
  entityId = "",
  meta = "",
  actor = "key"
): void {
  void (async () => {
    try {
      const client = createServerConvexClient();
      if (client) {
        await client.mutation(api.admin.appendAudit, {
          action,
          entity,
          entityId,
          meta,
          actor: actor || undefined,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("[audit] append failed:", action, entity, err);
    }
  })();
}
