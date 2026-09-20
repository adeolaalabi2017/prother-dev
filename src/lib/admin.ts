import { NextResponse } from "next/server";
import { db, EDITOR_KEY } from "@/lib/prother";

/**
 * Admin auth + audit helpers for the Admin Console APIs.
 * Same demo-key scheme as the editor desk (EDITOR_KEY + `x-editor-key`
 * header) until NextAuth lands in Phase 2 — one gate, one key, everywhere.
 */
export function isAdmin(req: Request): boolean {
  return req.headers.get("x-editor-key") === EDITOR_KEY;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Wrap a handler with the admin gate: returns the 401 response or null. */
export function guard(req: Request): NextResponse | null {
  return isAdmin(req) ? null : unauthorized();
}

/** Fire-and-forget audit trail write (PRD §16 — moderation_decisions analog). */
export function logAudit(
  action: string,
  entity: string,
  entityId = "",
  meta = ""
): void {
  db.auditLog
    .create({ data: { action, entity, entityId, meta } })
    .catch(() => {
      /* audit must never break the request path */
    });
}
