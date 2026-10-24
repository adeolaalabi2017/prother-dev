import { NextRequest, NextResponse } from "next/server";
import { shadowSearchLog } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * POST /api/analytics/search  { q, n }   (search demand readout)
 * Logs one normalized on-site search: query × UTC day, plus whether it
 * returned zero results (feeds the admin "what visitors can't find" card).
 * Cookieless: no cookies, IPs or UA storage; queries are trimmed,
 * lowercased, capped at 60 chars and aggregated — never stored raw per
 * user. Internal surfaces (admin searches) are excluded.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { q?: unknown; n?: unknown }
    | null;
  const q = typeof body?.q === "string" ? body.q.trim().toLowerCase().slice(0, 60) : "";
  if (!q || q.length < 2) {
    return NextResponse.json({ ok: false, error: "invalid_query" }, { status: 400 });
  }
  // Never count the operator's own console traffic.
  const ref = (req.headers.get("referer") ?? "").toLowerCase();
  if (ref.includes("/admin") || ref.includes("/api/")) {
    return NextResponse.json({ ok: true, skipped: "internal" });
  }
  const zero = Number(body?.n) === 0;
  const now = new Date();
  try {
    await shadowSearchLog(createServerConvexClient()!, {
      query: q,
      zero,
      day: now.toISOString().slice(0, 10),
      nowMs: now.getTime(),
    });
  } catch {
    // analytics never blocks
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
