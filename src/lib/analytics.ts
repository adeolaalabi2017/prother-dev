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
 * Store-independent path filter only — counting lives in Convex
 * (convex/ads.ts recordPageView); the Prisma writer was retired.
 */
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
