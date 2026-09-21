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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
