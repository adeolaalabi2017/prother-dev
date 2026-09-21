import type { MetadataRoute } from "next";
import { db } from "@/lib/prother";

/**
 * Auto sitemap (PRD NFR: SEO — auto sitemaps). Metadata route, not a page.
 * Indexes: homepage, the dedicated routes (/tools, /journal, /about,
 * /submit), live tool deep-links (?tool=slug), published journal posts
 * (real /journal/[slug] routes + legacy ?post=slug), and category anchors.
 * Daily tools get honest lastmod dates from their launch day; posts from
 * publishedAt/updatedAt.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

  const [tools, posts] = await Promise.all([
    db.tool.findMany({
      where: { status: "live" },
      select: { slug: true, createdAt: true, launch: { select: { launchDate: true } } },
      take: 5000,
    }),
    db.post.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true, publishedAt: true },
      take: 1000,
    }),
  ]);

  const statics: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/tools`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/journal`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about#standards`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about#faq`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const toolUrls: MetadataRoute.Sitemap = tools.map((t) => ({
    url: `${base}/?tool=${encodeURIComponent(t.slug)}`,
    lastModified: t.launch?.launchDate ?? t.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Real journal article routes (crawlable) + the legacy ?post= deep link.
  const postUrls: MetadataRoute.Sitemap = posts.flatMap((p) => [
    {
      url: `${base}/journal/${encodeURIComponent(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${base}/?post=${encodeURIComponent(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ]);

  return [...statics, ...toolUrls, ...postUrls];
}
