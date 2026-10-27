/**
 * Content Strategy Pillars & Directory Interlinking Architecture
 *
 * Defines the 3 core content pillars for Prother's Journal and Guides:
 * 1. Practical AI Guides (Task-oriented)
 * 2. Comparisons & Evaluations (Decision-oriented)
 * 3. Important AI Updates (Ecosystem-oriented)
 *
 * Adheres strictly to AGENTS.md:
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - Honest pricing taxonomy
 * - Real authentic brand assets
 */

export type ContentPillarId =
  | "practical-guides"
  | "comparisons-evaluations"
  | "ecosystem-updates";

export interface ContentPillar {
  id: ContentPillarId;
  title: string;
  shortLabel: string;
  goal: string;
  description: string;
  editorialRules: string[];
}

export const CONTENT_PILLARS: Record<ContentPillarId, ContentPillar> = {
  "practical-guides": {
    id: "practical-guides",
    title: "Pillar 1: Practical AI Guides",
    shortLabel: "Practical Guide",
    goal: "Attract developers and teams trying to accomplish a specific task.",
    description:
      "Step-by-step engineering tutorials, local deployment walkthroughs, and hands-on agent integration blueprints.",
    editorialRules: [
      "Every guide must feature verified CLI commands, working code, or reproducible configurations.",
      "Must explicitly reference required compute hardware (RAM, VRAM, disk) for local workflows.",
      "Directly links to listed tools in the Prother directory for each component in the pipeline.",
    ],
  },
  "comparisons-evaluations": {
    id: "comparisons-evaluations",
    title: "Pillar 2: Comparisons & Evaluations",
    shortLabel: "Comparison & Evaluation",
    goal: "Help technical decision-makers and engineers make informed tool choices.",
    description:
      "Head-to-head showdowns, API workload cost models, latency benchmarks, and feature trade-off matrices.",
    editorialRules: [
      "Must test competing tools on identical workloads or standard benchmarks (e.g. SWE-bench, Terminal-Bench).",
      "Calculates realistic monthly operational costs rather than nominal per-token sticker prices.",
      "Directly links to Prother's /compare/[category] matrices and tool showdown pages.",
    ],
  },
  "ecosystem-updates": {
    id: "ecosystem-updates",
    title: "Pillar 3: Important AI Updates",
    shortLabel: "AI Update",
    goal: "Earn repeat visits and keep directory listings strictly synchronized with the frontier.",
    description:
      "High-signal briefings on major model releases, architectural breakthroughs, API price drops, and open-weights drops.",
    editorialRules: [
      "No generic speculative AI hype. Focus strictly on measurable changes in capability, licensing, or pricing.",
      "Every news item must update or reference existing directory listings with fresh verified specs.",
      "Provides verified download weights, context limits, and hardware requirement tiers.",
    ],
  },
};

/**
 * Editorial Relations Mapping between Journal articles and Directory entities.
 * Creates a two-way connected content ecosystem:
 * - Articles link to tools, comparisons, and categories.
 * - Tool pages link to relevant guides and evaluations.
 */
export interface ArticleDirectoryLink {
  slug: string;
  pillarId: ContentPillarId;
  primaryCategorySlug: string;
  primaryCategoryName: string;
  toolSlugs: string[];
  comparisonSlugs?: string[];
  keyTakeaway: string;
}

export const ARTICLE_DIRECTORY_LINKS: Record<string, ArticleDirectoryLink> = {
  "kimi-k3-1-pro": {
    slug: "kimi-k3-1-pro",
    pillarId: "ecosystem-updates",
    primaryCategorySlug: "ai-models",
    primaryCategoryName: "AI Models & Foundation Checkpoints",
    toolSlugs: ["kimi-k3-1-pro", "claude", "deepseek-v3", "chatgpt", "step-5"],
    comparisonSlugs: ["kimi-k3-1-pro-vs-deepseek-v3", "kimi-k3-1-pro-vs-claude"],
    keyTakeaway:
      "Moonshot AI's 3T-class Sparse MoE captures #1 on Terminal-Bench 4.0 (67.2%) with open-weights and 1M token context.",
  },
  "claude-haiku-5-5-benchmarks-and-pricing": {
    slug: "claude-haiku-5-5-benchmarks-and-pricing",
    pillarId: "comparisons-evaluations",
    primaryCategorySlug: "ai-models",
    primaryCategoryName: "AI Models & Foundation Checkpoints",
    toolSlugs: ["haiku-5-5", "claude", "chatgpt"],
    comparisonSlugs: ["claude-vs-chatgpt"],
    keyTakeaway:
      "Haiku 5.5 scores 72.4% on OSWorld computer use while reducing input token prices by 90% down to $0.10 per million tokens.",
  },
};

/**
 * Fallback topic & keyword classifier to assign any post to one of the 3 pillars.
 */
export function classifyPillar(
  slug: string,
  category: string,
  tags: string[] = [],
  title = ""
): ContentPillar {
  if (ARTICLE_DIRECTORY_LINKS[slug]) {
    return CONTENT_PILLARS[ARTICLE_DIRECTORY_LINKS[slug].pillarId];
  }

  const combined = `${slug} ${category} ${tags.join(" ")} ${title}`.toLowerCase();

  if (
    combined.includes("how-to") ||
    combined.includes("guide") ||
    combined.includes("tutorial") ||
    combined.includes("run-locally") ||
    combined.includes("setup") ||
    combined.includes("build")
  ) {
    return CONTENT_PILLARS["practical-guides"];
  }

  if (
    combined.includes("vs") ||
    combined.includes("compare") ||
    combined.includes("benchmark") ||
    combined.includes("evaluation") ||
    combined.includes("pricing") ||
    combined.includes("cost") ||
    combined.includes("best-")
  ) {
    return CONTENT_PILLARS["comparisons-evaluations"];
  }

  return CONTENT_PILLARS["ecosystem-updates"];
}
