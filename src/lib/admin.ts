import { NextResponse } from "next/server";
import { editorKey } from "@/lib/prother";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api.js";

/**
 * Admin auth + audit helpers for the Admin Console APIs.
 * Single gate everywhere: the `x-editor-key` header must equal the
 * server-side admin key (ADMIN_KEY env; fail-closed in production).
 */
export function isAdmin(req: Request): boolean {
  const key = editorKey();
  return key != null && req.headers.get("x-editor-key") === key;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Wrap a handler with the admin gate: returns the 401 response or null. */
export function guard(req: Request): NextResponse | null {
  return isAdmin(req) ? null : unauthorized();
}

/** Fire-and-forget audit trail write (PRD §16 — moderation_decisions analog).
 *  Convex-only: the admin overview reads the trail from there. Failures
 *  never break the request path. entityId carries the legacy cuid. */
export function logAudit(
  action: string,
  entity: string,
  entityId = "",
  meta = ""
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
          actor: undefined,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("[audit] append failed:", action, entity, err);
    }
  })();
}
