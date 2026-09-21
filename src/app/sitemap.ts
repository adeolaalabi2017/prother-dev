import type { MetadataRoute } from "next";
import { db } from "@/lib/prother";

/**
 * Auto sitemap (PRD NFR: SEO — auto sitemaps). Metadata route, not a page.
 * Indexes: homepage, the dedicated routes (/tools, /forums, /journal, /about,
 * /submit, /advertise), live tool deep-links (?tool=slug), published journal
 * posts (real /journal/[slug] routes + legacy ?post=slug), forum threads,
 * and category anchors. Daily tools get honest lastmod dates from their
 * launch day; posts from publishedAt/updatedAt.
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
    { url: `${base}/forums`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/journal`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/advertise`, changeFrequency: "monthly", priority: 0.5 },
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

  // Forum threads are read through the raw-SQL access layer (src/lib/forum.ts)
  // because the long-running dev server caches the pre-forums Prisma client.
  // Wrapped in try/catch — the sitemap must survive an empty/missing table.
  let forumUrls: MetadataRoute.Sitemap = [];
  try {
    const threads = await db.$queryRaw<
      { slug: string; createdAt: Date; updatedAt: Date }[]
    >`
      SELECT slug, createdAt, updatedAt FROM ForumThread ORDER BY createdAt DESC LIMIT 500`;
    forumUrls = threads.map((t) => ({
      url: `${base}/forums/${encodeURIComponent(t.slug)}`,
      lastModified: t.updatedAt ?? t.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    forumUrls = [];
  }

  return [...statics, ...toolUrls, ...postUrls, ...forumUrls];
}
