import { NextRequest, NextResponse } from "next/server";
import { trackablePath } from "@/lib/analytics";
import { convexPageView } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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
  // I/O HOTFIX: skip bot/crawler pings (they caused the Oct 8 I/O spike).
  // Mutations cost reads + writes; bots must never increment counters.
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  if (
    ua.includes("bot") ||
    ua.includes("crawl") ||
    ua.includes("spider") ||
    ua.includes("mediapartners") ||
    ua.includes("headless") ||
    ua.length === 0
  ) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }
  // D1-primary (wave 3): awaited, not fire-and-forget. Workers isolates may
  // suspend after the response, killing void promises and losing the async
  // context getCloudflareContext needs. D1 is local (single-digit ms).
  const now = new Date();
  try {
    await convexPageView(createServerConvexClient()!, {
      path: body.p,
      day: now.toISOString().slice(0, 10),
      nowMs: now.getTime(),
    });
  } catch {
    // analytics never blocks
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
