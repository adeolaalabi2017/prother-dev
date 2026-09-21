import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { resolveReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

/**
 * Admin — resolve/dismiss a report (Task 23).
 *  PATCH /api/admin/reports/[id]
 *    { status: "resolved" | "dismissed", note?, hideTarget?: boolean }
 *  hideTarget=true additionally soft-hides the reported content:
 *    thread/reply → hidden flag · tool → status removed · post → draft.
 */
const patchSchema = z.object({
  status: z.enum(["resolved", "dismissed"]).optional(),
  note: z.string().max(300).optional(),
  hideTarget: z.boolean().optional(),
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
  const { status, note, hideTarget } = parsed.data;
  if (!status && !hideTarget) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (status && hideTarget === undefined) {
    return NextResponse.json(
      { error: "hideTarget must be explicit (true hides the content)" },
      { status: 400 }
    );
  }

  try {
    const res = await resolveReport(id, {
      status: status ?? "resolved",
      note,
      hideTarget,
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    logAudit(
      "report.resolve",
      res.targetType,
      res.targetId,
      [status ?? "resolved", hideTarget ? "content hidden" : null]
        .filter(Boolean)
        .join(", ")
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api:admin/reports] PATCH failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
