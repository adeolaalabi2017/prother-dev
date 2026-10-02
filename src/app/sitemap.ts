import type { MetadataRoute } from "next";
import { createServerConvexClient } from "@/lib/convex";
import { shadowSitemapData } from "@/lib/data";
import { CATEGORIES } from "@/components/prother/categories";
import { POPULAR_SHOWDOWNS } from "@/lib/showdowns";
import { TOPICS } from "@/lib/topics";

/**
 * Auto sitemap (PRD NFR: SEO - auto sitemaps). Metadata route, not a page.
 * Indexes: homepage, the dedicated routes (/tools, /forums, /journal, /about,
 * /submit), live tool deep-links (/tools/[slug] - Task 25),
 * category pages (/categories/[slug]), published journal posts (real
 * /journal/[slug] routes + legacy ?post=slug), and forum threads. Tools get
 * honest lastmod dates from their listing date; posts from
 * publishedAt/updatedAt.
 *
 * ORDER NOTE: the tool block follows the Convex index scan order, which
 * differs from the old SQLite rowid order - but the URL SET is identical
 * (verified during the cutover). Sitemap order is
 * non-contractual for crawlers, so this is whitelisted, not normalized.
 */
export const dynamic = "force-dynamic";

/**
 * Slugs that are seeded fixtures or QA placeholders rather than real
 * products. They may still be `status: "live"` in the database, so they must
 * be filtered here - a sitemap entry is an explicit "index this" signal and
 * the fastest way to get a junk page indexed.
 *
 * Delete a slug from this list once its database row is actually removed.
 */
const EXCLUDED_SLUGS = new Set(["vorflux-test-2"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

  // Convex-only (SEO cutover complete): ISO strings satisfy lastModified.
  // Order is non-contractual for crawlers (SQLite rowid vs Convex index).
  const data = await shadowSitemapData(createServerConvexClient()!);
  return buildSitemap(base, {
    tools: data.tools
      .filter((t) => !EXCLUDED_SLUGS.has(t.slug))
      .map((t) => ({ slug: t.slug, createdAt: new Date(t.createdAt) })),
    // CATEGORIES is the source of truth for which category routes exist; the
    // Convex list only confirms they are live. Merging keeps a category in the
    // sitemap even if its count query comes back short.
    categories: CATEGORIES.map(
      (c) => data.categories.find((d) => d.slug === c.slug) ?? { slug: c.slug },
    ),
    posts: data.posts.map((p) => ({
      slug: p.slug,
      updatedAt: new Date(p.updatedAt),
      publishedAt: p.publishedAt,
    })),
    threads: data.threads.map((t) => ({
      slug: t.slug,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  });
}

function buildSitemap(
  base: string,
  data: {
    tools: { slug: string; createdAt: Date }[];
    categories: { slug: string }[];
    posts: {
      slug: string;
      updatedAt: Date;
      publishedAt: Date | string | null;
    }[];
    threads: { slug: string; createdAt: Date; updatedAt: Date }[];
  },
): MetadataRoute.Sitemap {
  const statics: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/tools`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/compare`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Per-category comparison landings. These carry the actual comparison
    // table in server HTML; bare /compare is a picker with no content of its
    // own, so the deep pages are the ones worth indexing.
    ...data.categories.map((c) => ({
      url: `${base}/compare/${encodeURIComponent(c.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Popular pairwise "VS" comparisons
    ...POPULAR_SHOWDOWNS
      .filter(
        (s) =>
          data.tools.some((t) => t.slug === s.toolA) &&
          data.tools.some((t) => t.slug === s.toolB),
      )
      .map((s) => ({
        url: `${base}/compare/${s.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    // Curated topic & intent hubs (programmatic SEO)
    {
      url: `${base}/topics`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...TOPICS.map((topic) => ({
      url: `${base}/topics/${encodeURIComponent(topic.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${base}/forums`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/journal`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${base}/about#standards`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    { url: `${base}/about#faq`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Tools live at their real /tools/[slug] routes (Task 25) - the /?tool=
  // overlay serves homepage HTML and canonicalizes there.
  const toolUrls: MetadataRoute.Sitemap = data.tools.map((t) => ({
    url: `${base}/tools/${encodeURIComponent(t.slug)}`,
    lastModified: t.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Category browse pages (/categories/[slug] - Task 25).
  const categoryUrls: MetadataRoute.Sitemap = data.categories.map((c) => ({
    url: `${base}/categories/${encodeURIComponent(c.slug)}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Journal articles live at their real /journal/[slug] routes - the
  // /?post= overlay serves homepage HTML and canonicalizes there, so it
  // must NOT be listed as a separate URL.
  const postUrls: MetadataRoute.Sitemap = data.posts.map((p) => ({
    url: `${base}/journal/${encodeURIComponent(p.slug)}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const forumUrls: MetadataRoute.Sitemap = data.threads.map((t) => ({
    url: `${base}/forums/${encodeURIComponent(t.slug)}`,
    lastModified: t.updatedAt ?? t.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...statics, ...toolUrls, ...categoryUrls, ...postUrls, ...forumUrls];
}
