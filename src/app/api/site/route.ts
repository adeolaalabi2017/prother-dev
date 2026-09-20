import { NextResponse } from "next/server";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

/**
 * GET /api/site — public site settings (Admin Console → site copy).
 * The hero/announcement/footer consume this with in-code defaults as
 * fallback, so a missing/empty store never breaks the page.
 */
export async function GET() {
  const rows = await db.siteSetting.findMany();
  return NextResponse.json(
    { settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
