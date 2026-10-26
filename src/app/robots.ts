import type { MetadataRoute } from "next";

/** robots.txt — metadata route (not a page). */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
  const disallowList = [
    "/admin", // console shell (also noindexed)
    "/api/admin",
    "/api/editor",
    // Test/QA fixtures must never be indexed. vorflux-test-2 is a
    // seeded placeholder row that is still "live" in the database;
    // it is excluded from the sitemap (see sitemap.ts) and blocked
    // here so crawlers cannot reach it via the URL bar either.
    "/tools/vorflux-test-2",
  ];

  return {
    rules: [
      // Explicit permissions for AI Search & Answer Engine citation crawlers
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
          "Claude-Web",
          "GoogleOther",
        ],
        allow: "/",
        disallow: disallowList,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowList,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
