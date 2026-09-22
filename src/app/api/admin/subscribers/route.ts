import { NextRequest, NextResponse } from "next/server";
import { db, EDITOR_KEY } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Subscriber management (PRD F-45).
 *  GET /api/admin/subscribers          — stats + latest 500 rows
 *  GET /api/admin/subscribers?format=csv — full CSV export
 *
 * CSV downloads happen via navigation (no custom headers), so the editor key
 * may be passed as ?key= — same secret, alternate transport.
 */
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied && req.nextUrl.searchParams.get("key") !== EDITOR_KEY) {
    return denied;
  }

  const format = req.nextUrl.searchParams.get("format");

  if (format === "csv") {
    const all = await db.subscriber.findMany({ orderBy: { createdAt: "asc" } });
    logAudit("subscribers.export", "subscriber", "", `${all.length} rows`);
    const rows = [
      "email,source,confirmed,createdAt",
      ...all.map(
        (s) =>
          `${s.email},${s.source},${s.confirmed},${s.createdAt.toISOString()}`
      ),
    ].join("\n");
    return new Response(rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prother-subscribers-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  const [total, confirmed, bySource, rows] = await Promise.all([
    db.subscriber.count(),
    db.subscriber.count({ where: { confirmed: true } }),
    db.subscriber.groupBy({ by: ["source"], _count: { source: true } }),
    db.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { email: true, source: true, confirmed: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    total,
    confirmed,
    bySource: bySource.map((s) => ({ source: s.source, count: s._count.source })),
    rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
}
