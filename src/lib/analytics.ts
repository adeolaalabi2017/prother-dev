/**
 * First-party analytics (Task 28) — the privacy-friendly traffic proof the
 * ad plan needs before any network or direct-sold pitch ("prove the traffic").
 *
 * Design (Plausible-style, minimal):
 *   · one pre-aggregated counter row per path per UTC day — PageViewDaily
 *   · cookieless: no cookies, no localStorage, no IPs, no user agents stored
 *   · client pings POST /api/analytics/pv once per path view (see
 *     components/prother/analytics-ping.tsx, mounted in the root layout)
 *   · admin reads /api/admin/analytics for the 14-day trend + top paths
 *
 * Raw SQL only (stale-PrismaClient rule — see lib/forum.ts). The writer is
 * fire-and-forget: analytics must never slow or break a page render.
 */
import { db } from "@/lib/db";

/** Paths that never count: API traffic, admin console, editor tools. */
export function trackablePath(p: unknown): p is string {
  return (
    typeof p === "string" &&
    p.length > 0 &&
    p.length <= 200 &&
    p.startsWith("/") &&
    !p.startsWith("/api/") &&
    !p.startsWith("/admin") &&
    !p.startsWith("/_next") &&
    !p.startsWith("/editor")
  );
}

export function recordPageView(path: string): void {
  const day = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  db.$executeRawUnsafe(
    `INSERT INTO PageViewDaily (id, path, day, views, "updatedAt")
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT("path", "day") DO UPDATE SET
       views = views + 1,
       "updatedAt" = ?`,
    crypto.randomUUID(),
    path,
    day,
    now,
    now
  ).catch(() => {});
}

export type TrafficResponse = {
  days: { day: string; views: number }[];
  total: number;
  top: { path: string; views: number }[];
};

/** 14-day traffic window for the admin Overview Traffic card. */
export async function getTrafficReadout(): Promise<TrafficResponse> {
  const today = new Date();
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }

  let byDay: { day: string; views: number }[] = [];
  let top: { path: string; views: number }[] = [];
  try {
    byDay = await db.$queryRaw`
      SELECT day, SUM(views) AS views
      FROM PageViewDaily
      WHERE day >= ${days[0]}
      GROUP BY day
      ORDER BY day ASC`;

    top = await db.$queryRaw`
      SELECT path, SUM(views) AS views
      FROM PageViewDaily
      WHERE day >= ${days[0]}
      GROUP BY path
      ORDER BY views DESC
      LIMIT 8`;
  } catch {
    byDay = [];
    top = [];
  }

  const dayMap = new Map(byDay.map((r) => [r.day, Number(r.views)]));
  return {
    days: days.map((d) => ({ day: d, views: dayMap.get(d) ?? 0 })),
    total: byDay.reduce((s, r) => s + Number(r.views), 0),
    top: top.map((r) => ({ path: r.path, views: Number(r.views) })),
  };
}
