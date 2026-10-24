import { NextRequest, NextResponse } from "next/server";
import { shadowErrorLog } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * POST /api/analytics/error  { m, p }
 * Client-side runtime error counter (window error + unhandled rejection).
 * Aggregated into ErrorDaily (signature × UTC day): the signature is the
 * message type + first ~120 chars plus the path — no stacks, no cookies,
 * no IPs. Bots and internal surfaces are skipped.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { m?: unknown; p?: unknown }
    | null;
  const m = typeof body?.m === "string" ? body.m.trim().slice(0, 120) : "";
  if (!m) {
    return NextResponse.json({ ok: false, error: "invalid_sig" }, { status: 400 });
  }
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  if (
    ua.includes("bot") ||
    ua.includes("crawl") ||
    ua.includes("headless") ||
    ua.length === 0
  ) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }
  const ref = (req.headers.get("referer") ?? "").toLowerCase();
  if (ref.includes("/admin") || ref.includes("/api/")) {
    return NextResponse.json({ ok: true, skipped: "internal" });
  }
  const p = typeof body?.p === "string" && body.p.startsWith("/") ? body.p.split("?")[0]!.slice(0, 60) : "";
  const sig = p ? `${m} @ ${p}` : m;
  const now = new Date();
  try {
    await shadowErrorLog(createServerConvexClient()!, {
      sig,
      day: now.toISOString().slice(0, 10),
      nowMs: now.getTime(),
    });
  } catch {
    // analytics never blocks
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
