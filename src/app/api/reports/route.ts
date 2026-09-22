import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { REPORT_REASONS, REPORT_TARGET_TYPES, createReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

/**
 * Community reports (Task 23).
 *  POST /api/reports { targetType, targetId, reason, details?, visitorKey? }
 * Reporter may be signed-in (email) or anonymous (visitorKey). One OPEN
 * report per owner per target — duplicates return { already: true }.
 */
const postSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().trim().min(1).max(120),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
  visitorKey: z.string().min(8).max(64).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const user = await getAuthUser();
  if (!user && !parsed.data.visitorKey) {
    return NextResponse.json({ error: "owner_required" }, { status: 400 });
  }

  try {
    const res = await createReport({
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details,
      reporterEmail: user?.email ?? null,
      reporterKey: user ? null : parsed.data.visitorKey ?? null,
    });
    if (!res.ok) {
      return NextResponse.json({ error: "invalid_target" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, already: res.already },
      { status: res.already ? 200 : 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api:reports] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
