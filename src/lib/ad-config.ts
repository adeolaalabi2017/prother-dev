/**
 * Ad serving config (Task 27) — kill switches backed by the SiteSetting KV
 * (the same channel /api/admin/settings manages), so the admin console can
 * pause any placement without a deploy.
 *
 * Keys (absent = enabled — defaults are on):
 *   ads.master              "0" disables ALL ad serving site-wide
 *   ads.placement.<key>     "0" disables one placement (5 placements)
 *
 * Read server-side by pages (they skip mounting <AdSlot> entirely when a
 * placement is off — zero client JS) and again inside /api/ads/serve before
 * an impression is counted.
 *
 * Convex-only (cutover): settings resolve from the Convex site bundle.
 * A failed read fails OPEN (all placements on) — an unhealthy backend
 * must degrade to house creatives, never to 500s.
 */
import { createServerConvexClient } from "@/lib/convex";
import { shadowSite } from "@/lib/data";
import { AD_PLACEMENTS, type AdPlacement } from "@/lib/ads";

export type ServingConfig = {
  master: boolean;
  placements: Record<AdPlacement, boolean>;
};

export async function getServingConfig(): Promise<ServingConfig> {
  let map = new Map<string, string>();
  try {
    const res = await shadowSite(createServerConvexClient()!);
    map = new Map(Object.entries(res.settings));
  } catch {
    // Fail open (see header): house creatives, never 500s.
  }

  const placements = Object.fromEntries(
    AD_PLACEMENTS.map((p) => [p, map.get(`ads.placement.${p}`) !== "0"])
  ) as ServingConfig["placements"];

  return { master: map.get("ads.master") !== "0", placements };
}

/** Single-question helper for server pages: may this placement render? */
export async function placementEnabled(p: AdPlacement): Promise<boolean> {
  const cfg = await getServingConfig();
  return cfg.master && cfg.placements[p];
}
