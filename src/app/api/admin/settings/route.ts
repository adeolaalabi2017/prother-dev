import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";
import { convexSettingsPut, shadowAdminSettings } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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
  const res = await shadowAdminSettings(createServerConvexClient()!);
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

  for (const [key, value] of entries) {
    await db.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  // Dual-write stays until the flag reader migrates (plan §5): Prisma is
  // authoritative for backend.* flags (backend-flags.ts queries SQLite
  // directly), Convex is mirrored best-effort and unconditionally so the
  // mirror never goes stale.
  try {
    await convexSettingsPut(createServerConvexClient()!, {
      entries: entries.map(([key, value]) => ({ key, value })),
    });
  } catch (err) {
    console.error("[dual-write] convex settingsPut failed:", entries.map(([k]) => k).join(","), err);
  }
  logAudit("settings.update", "settings", "", entries.map(([k]) => k).join(", "));
  return NextResponse.json({ ok: true, updated: entries.length });
}
