import type { MetadataRoute } from "next";
import { db } from "@/lib/prother";

/**
 * Auto sitemap (PRD NFR: SEO — auto sitemaps). Metadata route, not a page.
 * Indexes: homepage, the dedicated routes (/tools, /forums, /journal, /about,
 * /submit, /advertise), live tool deep-links (/tools/[slug] — Task 25),
 * category pages (/categories/[slug]), published journal posts (real
 * /journal/[slug] routes + legacy ?post=slug), and forum threads. Tools get
 * honest lastmod dates from their listing date; posts from
 * publishedAt/updatedAt.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

  const [tools, categories, posts] = await Promise.all([
    db.tool.findMany({
      where: { status: "live" },
      select: { slug: true, createdAt: true },
      take: 5000,
    }),
    db.category.findMany({ select: { slug: true } }),
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

  // Tools live at their real /tools/[slug] routes (Task 25) — the /?tool=
  // overlay serves homepage HTML and canonicalizes there.
  const toolUrls: MetadataRoute.Sitemap = tools.map((t) => ({
    url: `${base}/tools/${encodeURIComponent(t.slug)}`,
    lastModified: t.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Category browse pages (/categories/[slug] — Task 25).
  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/categories/${encodeURIComponent(c.slug)}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Journal articles live at their real /journal/[slug] routes — the
  // /?post= overlay serves homepage HTML and canonicalizes there, so it
  // must NOT be listed as a separate URL.
  const postUrls: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/journal/${encodeURIComponent(p.slug)}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Forum threads are read through the raw-SQL access layer (src/lib/forum.ts)
  // because the long-running dev server caches the pre-forums Prisma client.
  // Wrapped in try/catch — the sitemap must survive an empty/missing table.
  let forumUrls: MetadataRoute.Sitemap = [];
  try {
    const threads = await db.$queryRaw<
      { slug: string; createdAt: Date; updatedAt: Date }[]
    >`
      SELECT slug, createdAt, updatedAt FROM ForumThread
      WHERE hidden = 0
      ORDER BY createdAt DESC LIMIT 500`;
    forumUrls = threads.map((t) => ({
      url: `${base}/forums/${encodeURIComponent(t.slug)}`,
      lastModified: t.updatedAt ?? t.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    forumUrls = [];
  }

  return [...statics, ...toolUrls, ...categoryUrls, ...postUrls, ...forumUrls];
}
