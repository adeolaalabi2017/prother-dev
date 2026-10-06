import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { convexSettingsPut, shadowAdminSettings } from "@/lib/data";
import { requireServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * Site settings — the "manage the frontend" channel.
 *  GET /api/admin/settings — all key/values
 *  PUT /api/admin/settings — write one { key, value } or a { settings: map }
 */

const putSchema = z.union([
  z.object({ key: z.string().min(1).max(60), value: z.string().max(600) }),
  z.object({
    settings: z.record(z.string().min(1).max(60), z.string().max(600)),
  }),
]);

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  // Convex-only read (admin cutover).
  const res = await shadowAdminSettings(requireServerConvexClient());
  return NextResponse.json(res, {
    headers: { "x-data-backend": "convex" },
  });
}

export async function PUT(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const entries =
    "settings" in parsed.data
      ? Object.entries(parsed.data.settings)
      : [[parsed.data.key, parsed.data.value] as const];

  // Convex is the only store (Phase A 2026-10-06: Prisma backup path retired).
  await convexSettingsPut(requireServerConvexClient(), {
    entries: entries.map(([key, value]) => ({ key, value })),
  });
  logAudit("settings.update", "settings", "", entries.map(([k]) => k).join(", "));
  return NextResponse.json({ ok: true, updated: entries.length });
}
