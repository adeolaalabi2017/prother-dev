import type { MetadataRoute } from "next";

/** robots.txt — metadata route (not a page). */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin", // console shell (also noindexed)
          "/api/admin",
          "/api/editor",
          "/api/auth/dev-inbox", // sandbox magic-link inbox — never crawl
          // Test/QA fixtures must never be indexed. vorflux-test-2 is a
          // seeded placeholder row that is still "live" in the database;
          // it is excluded from the sitemap (see sitemap.ts) and blocked
          // here so crawlers cannot reach it via the URL bar either.
          "/tools/vorflux-test-2",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
