import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import {
  convexAuthSessionsDeleteByUser,
  convexUserModerate,
  shadowAdminUserDetail,
  shadowUserBanSweep,
} from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/** Media library URLs only — avatar must be an uploaded media URL. */
const MEDIA_URL = z
  .string()
  .regex(/^\/api\/media\/[A-Za-z0-9_-]+$/, "must be an uploaded media URL")
  .max(200);

/**
 * Admin — single-user moderation (Task 23).
 *  PATCH /api/admin/users/[id] { role?: member|moderator|admin,
 *                                status?: active|banned }
 * Banning also revokes the user's live sessions immediately.
 */
const patchSchema = z.object({
  role: z.enum(["member", "moderator", "admin"]).optional(),
  status: z.enum(["active", "banned"]).optional(),
  /** Uploaded avatar (User.image is a pre-boot column → ORM handles it). */
  image: MEDIA_URL.nullable().optional(),
  /** Moderation reason, recorded in the audit trail only. */
  note: z.string().trim().max(200).optional(),
  /** Ban: also hide the user's existing threads/replies/reviews. */
  hideContent: z.boolean().optional(),
  /** Unban: restore previously hidden content. */
  restoreContent: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** Detail drawer payload: the user's content with links + moderation audit. */
export async function GET(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;

  const { id } = await params;
  try {
    const res = await shadowAdminUserDetail(createServerConvexClient()!, id);
    if (!res || !("user" in (res as Record<string, unknown>))) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("[api:admin/users/[id]] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = guard(req);
  if (denied) return denied;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.slice(0, 3) },
      { status: 400 }
    );
  }
  const { role, status, image, note, hideContent, restoreContent } = parsed.data;
  if (!role && !status && image === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Convex-only (Auth phase): the shared users row is moderated here;
  // banning revokes live Convex sessions immediately.
  const client = createServerConvexClient()!;
  try {
    await convexUserModerate(client, {
      userLegacyId: id,
      role,
      status,
      image,
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (m.includes("admin_protected")) {
      return NextResponse.json(
        { error: "Admin accounts can't be banned from the panel. Demote the account first, then ban it if needed." },
        { status: 400 }
      );
    }
    if (m.includes("last_admin")) {
      return NextResponse.json(
        { error: "Can't demote the last active admin. Promote another account to admin first." },
        { status: 400 }
      );
    }
    console.error("[api:admin/users] PATCH failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (status === "banned") {
    try {
      await convexAuthSessionsDeleteByUser(client, id);
    } catch (err) {
      console.error("[api:admin/users] session revocation failed:", id, err);
    }
  }
  let sweep: { threads: number; replies: number; reviews: number } | undefined;
  if (status === "banned" && hideContent) {
    try {
      const res = await shadowUserBanSweep(client, { userLegacyId: id, hide: true });
      if (res) sweep = { threads: res.threads, replies: res.replies, reviews: res.reviews };
    } catch (err) {
      console.error("[api:admin/users] content sweep (hide) failed:", id, err);
    }
  }
  if (status === "active" && restoreContent) {
    try {
      const res = await shadowUserBanSweep(client, { userLegacyId: id, hide: false });
      if (res) sweep = { threads: res.threads, replies: res.replies, reviews: res.reviews };
    } catch (err) {
      console.error("[api:admin/users] content sweep (restore) failed:", id, err);
    }
  }
  logAudit(
    "user.moderate",
    "user",
    id,
    [
      role ? `role→${role}` : null,
      status ? `status→${status}` : null,
      image !== undefined ? "avatar" : null,
      sweep
        ? `content ${status === "banned" ? "hidden" : "restored"} (${sweep.threads} threads, ${sweep.replies} replies, ${sweep.reviews} reviews)`
        : null,
      note ? `note="${note.replace(/"/g, "'")}"` : null,
    ]
      .filter(Boolean)
      .join(", ")
  );
  return NextResponse.json({ ok: true, role, status, image, sweep });
}
