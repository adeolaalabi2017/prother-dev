import { NextRequest, NextResponse } from "next/server";
import { recordPageView, trackablePath } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * POST /api/analytics/pv  { p: "/path" }   (Task 28)
 * Cookieless, first-party pageview counter. Aggregated into PageViewDaily
 * (path × UTC day). No cookies, no IPs, no UA storage — nothing personal,
 * which is the whole point: privacy-friendly by construction, no consent
 * banner required, and enough to prove traffic to networks / advertisers.
 *
 * Admin/api/editor paths are rejected so internal traffic never skews the
 * public numbers.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { p?: unknown } | null;
  if (!body || !trackablePath(body.p)) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }
  recordPageView(body.p);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
