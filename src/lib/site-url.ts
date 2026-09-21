/**
 * Canonical site origin, shared by everything that needs an absolute URL.
 *
 * Set NEXT_PUBLIC_SITE_URL to the production origin at deploy time —
 * sitemap/canonicals/OG/JSON-LD all derive from it.
 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
}
