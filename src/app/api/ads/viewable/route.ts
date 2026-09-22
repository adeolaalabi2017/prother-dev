import { NextRequest, NextResponse } from "next/server";
import { campaignIdOk, recordViewable } from "@/lib/ad-measure";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/viewable  { id: <campaign uuid> }   (Task 28, P4)
 * One ping per creative mount when MRC viewability is met (≥50% of the box
 * on screen for ≥1s — see hooks/use-viewable.ts). Fire-and-forget client
 * side, fire-and-forget server side: a failed ping must never surface.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (!body || !campaignIdOk(body.id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }
  recordViewable(body.id);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
