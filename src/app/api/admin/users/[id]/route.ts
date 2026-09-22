import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { updateUserModeration } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * Admin — single-user moderation (Task 23).
 *  PATCH /api/admin/users/[id] { role?: member|moderator|admin,
 *                                status?: active|banned }
 * Banning also revokes the user's live sessions immediately.
 */
const patchSchema = z.object({
  role: z.enum(["member", "moderator", "admin"]).optional(),
  status: z.enum(["active", "banned"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

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
  const { role, status } = parsed.data;
  if (!role && !status) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const res = await updateUserModeration(id, { role, status });
    if (!res.ok) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    logAudit(
      "user.moderate",
      "user",
      id,
      [role ? `role→${role}` : null, status ? `status→${status}` : null]
        .filter(Boolean)
        .join(", ")
    );
    return NextResponse.json({ ok: true, role, status });
  } catch (err) {
    console.error("[api:admin/users] PATCH failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
