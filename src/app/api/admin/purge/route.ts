import { NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { convexAdminPurge } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/purge { confirm?, execute? } — one-time launch purge.
 * Deletes every account except the owner's plus all user-attributable
 * content and demo campaigns. Dry-run by default (execute falsy).
 *
 * The protected address is pinned server-side: even a valid key cannot
 * widen the blast radius to the owner's account, and the mutation
 * fail-closes when the account is missing.
 */
const PROTECTED_EMAIL = "alabiadeolamikel@gmail.com";

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as {
    confirm?: unknown;
    execute?: unknown;
  } | null;
  try {
    const res = await convexAdminPurge(createServerConvexClient()!, {
      protectedEmail: PROTECTED_EMAIL,
      confirm: typeof body?.confirm === "string" ? body.confirm : "",
      execute: body?.execute === true,
    });
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api:admin/purge] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
