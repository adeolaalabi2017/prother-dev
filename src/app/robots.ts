import type { MetadataRoute } from "next";

/** robots.txt — metadata route (not a page). */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/admin", "/api/editor"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
