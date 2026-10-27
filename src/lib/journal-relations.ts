/**
 * Two-way Journal <-> Directory Relations Engine
 *
 * Connects directory tools, category guides, and journal articles into a cohesive ecosystem:
 * - On /journal/[slug]: Displays directory cards for all referenced tools, showdowns, and category guides.
 * - On /tools/[slug]: Displays related practical guides, evaluations, and architecture breakdowns from the Journal.
 *
 * Adheres strictly to AGENTS.md:
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - Authentic brand logos
 * - Honest pricing taxonomy
 */

import {
  ARTICLE_DIRECTORY_LINKS,
  CONTENT_PILLARS,
  classifyPillar,
  type ContentPillar,
} from "./journal-pillars";
import { CATEGORY_GUIDES } from "./category-guides";

export interface RelatedGuideSummary {
  slug: string;
  title: string;
  pillar: ContentPillar;
  excerpt: string;
  category: string;
  readingMinutes: number;
}

export interface ReferencedToolSummary {
  slug: string;
  name: string;
  tagline: string;
  categorySlug: string;
  categoryName: string;
  logoUrl?: string | null;
  pricingModel: string;
}

/**
 * Static registry of curated journal articles that connect directly to tools in the directory.
 * As new articles are published in Convex or D1, they can also be matched dynamically by markdown link analysis.
 */
export const CURATED_JOURNAL_ARTICLES = [
  {
    slug: "kimi-k3-1-pro",
    title: "Kimi K3.1 Pro: Inside Moonshot AI's 3T-Class Open-Weights Powerhouse",
    pillarId: "ecosystem-updates" as const,
    excerpt:
      "Moonshot AI's 2.8T MoE debuts with #1 Terminal-Bench 4.0 ranking, native 1M context window, and public weights.",
    category: "AI Models & Foundation Checkpoints",
    readingMinutes: 8,
    referencedTools: ["kimi-k3-1-pro", "claude", "deepseek-v3", "chatgpt", "step-5"],
  },
  {
    slug: "claude-haiku-5-5-benchmarks-and-pricing",
    title: "Claude Haiku 5.5: Benchmarks, Effort Scaling, and Pricing Analysis",
    pillarId: "comparisons-evaluations" as const,
    excerpt:
      "Benchmarking Anthropic's fastest model on OSWorld computer use, latency profiles, and 90% reduced per-token costs.",
    category: "AI Models & Foundation Checkpoints",
    readingMinutes: 6,
    referencedTools: ["haiku-5-5", "claude", "chatgpt"],
  },
];

/**
 * Returns all Journal guides, evaluations, and category guides relevant to a given tool.
 */
export function getGuidesForTool(toolSlug: string, categorySlug?: string): {
  articles: RelatedGuideSummary[];
  categoryGuide: { headline: string; href: string } | null;
} {
  const matchedArticles: RelatedGuideSummary[] = [];

  // 1. Check curated articles
  for (const art of CURATED_JOURNAL_ARTICLES) {
    if (art.referencedTools.includes(toolSlug)) {
      matchedArticles.push({
        slug: art.slug,
        title: art.title,
        pillar: CONTENT_PILLARS[art.pillarId],
        excerpt: art.excerpt,
        category: art.category,
        readingMinutes: art.readingMinutes,
      });
    }
  }

  // 2. Check editorial link registry
  for (const [slug, link] of Object.entries(ARTICLE_DIRECTORY_LINKS)) {
    if (
      link.toolSlugs.includes(toolSlug) &&
      !matchedArticles.some((a) => a.slug === slug)
    ) {
      const pillar = CONTENT_PILLARS[link.pillarId];
      matchedArticles.push({
        slug: link.slug,
        title: link.keyTakeaway,
        pillar,
        excerpt: link.keyTakeaway,
        category: link.primaryCategoryName,
        readingMinutes: 5,
      });
    }
  }

  // 3. Category Architectural Guide
  let categoryGuide: { headline: string; href: string } | null = null;
  if (categorySlug && CATEGORY_GUIDES[categorySlug]) {
    categoryGuide = {
      headline: CATEGORY_GUIDES[categorySlug].headline,
      href: `/categories/${categorySlug}#guide`,
    };
  }

  return {
    articles: matchedArticles,
    categoryGuide,
  };
}

/**
 * Parses markdown body and metadata to discover all tool slugs, comparison links,
 * and category links mentioned in an article.
 */
export function extractDirectoryConnections(
  postSlug: string,
  body: string,
  categoryName: string
): {
  pillar: ContentPillar;
  toolSlugs: string[];
  comparisonSlugs: string[];
  categorySlug: string | null;
} {
  const editorial = ARTICLE_DIRECTORY_LINKS[postSlug];
  const pillar = editorial
    ? CONTENT_PILLARS[editorial.pillarId]
    : classifyPillar(postSlug, categoryName);

  const toolSlugsSet = new Set<string>(editorial ? editorial.toolSlugs : []);
  const comparisonSlugsSet = new Set<string>(editorial?.comparisonSlugs ?? []);

  // Extract /tools/[slug] links from markdown
  const toolLinkMatches = body.matchAll(/\/tools\/([a-z0-9_-]+)/g);
  for (const match of toolLinkMatches) {
    if (match[1]) {
      toolSlugsSet.add(match[1]);
    }
  }

  // Extract /compare/[category-or-showdown] links from markdown
  const compareLinkMatches = body.matchAll(/\/compare\/([a-z0-9_-]+)/g);
  for (const match of compareLinkMatches) {
    if (match[1]) {
      comparisonSlugsSet.add(match[1]);
    }
  }

  // Extract category slug from name or body
  let categorySlug: string | null = editorial?.primaryCategorySlug ?? null;
  if (!categorySlug) {
    const catMatch = body.match(/\/categories\/([a-z0-9_-]+)/);
    if (catMatch?.[1]) {
      categorySlug = catMatch[1];
    }
  }

  return {
    pillar,
    toolSlugs: Array.from(toolSlugsSet),
    comparisonSlugs: Array.from(comparisonSlugsSet),
    categorySlug,
  };
}
