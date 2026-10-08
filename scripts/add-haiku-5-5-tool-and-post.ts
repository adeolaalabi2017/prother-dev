/**
 * Script to add Claude Haiku 5.5 to the tools directory and publish
 * the comprehensive analysis blog post with image carousel.
 *
 * Adheres strictly to AGENTS.md guidelines:
 * - Authentic vector logo committed to public/logos/haiku-5-5.svg
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - Convex is the single source of truth
 * - Verified via Convex queries
 */
import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";

const NOW = Date.now();

// ── Tool Definition ──
const HAIKU_TOOL = {
  id: "cmucrh2haiku5500000000001",
  slug: "haiku-5-5",
  name: "Claude Haiku 5.5",
  tagline: "High-speed frontier model for agentic computer use, coding, and scalable knowledge work",
  description: "Claude Haiku 5.5 delivers frontier-class intelligence at a fraction of standard API costs, featuring 72.4% computer use on OSWorld 2.1, 90% cheaper token pricing, and flexible effort-level scaling.",
  websiteUrl: "https://www.anthropic.com/claude",
  docsUrl: "https://docs.anthropic.com",
  categoryLegacyId: "cmucrh2nz0007kji8aimodels0", // AI Models
  pricingModel: "paid",
  startingPrice: "$0.10 per million tokens",
  pricingNote: "API rates: $0.10 input / $0.50 output per million tokens (prompts <=100k); $0.50 input / $2.50 output (prompts >100k). Prompt caching: $0.01 read, $0.125 write.",
  hasApi: true,
  logoEmoji: "⚡",
  logoGradient: "from-rose-500 to-amber-700",
  logoUrl: "/logos/haiku-5-5.svg",
  tagsPipe: "ai-models|claude|agentic-coding|computer-use|foundation-models",
  makerHandle: "@anthropic",
  status: "live",
  editorsPick: true,
  curated: true,
  editorial: {
    longDescription:
      "Claude Haiku 5.5 is Anthropic's next-generation lightweight foundation model, engineered specifically for high-speed agentic loops, autonomous desktop computer use, and cost-efficient enterprise knowledge pipelines. Built to overcome the speed and cost bottlenecks of large frontier models, Haiku 5.5 delivers performance comparable to larger foundation models at up to 90% lower token cost.\n\nKey highlights include a 72.4% score on the OSWorld 2.1 agentic computer use benchmark, 1620 Elo on GDPval-AA knowledge tasks, and 46.4% on FrontierCode. With token pricing starting at $0.10 per million input tokens and prompt cache reads at just $0.01 per million, Haiku 5.5 enables continuous background agent execution at production scale.",
    useCases: [
      {
        title: "Autonomous agentic computer use and browser workflows",
        body: "Drive OSWorld and browser agents across multi-step desktop workflows, scoring 72.4% on OSWorld 2.1 with sub-dollar cost per attempt.",
      },
      {
        title: "High-throughput developer loops and CLI coding",
        body: "Power coding assistants and automated test fixing on Terminal-Bench 4.0 and FrontierCode with ultra-low latency.",
      },
      {
        title: "Massive scale knowledge extraction and document synthesis",
        body: "Analyze extensive document archives with 1620 Elo GDPval performance at 90% lower cost than prior generation models.",
      },
    ],
    pros: [
      "Dramatic 90% price reduction over Haiku 4.5 ($0.10 vs $1.00 per million input tokens)",
      "Industry-leading agentic computer use score of 72.4% on OSWorld 2.1",
      "Granular effort-level tuning (Low, Med, High, Xhigh, Max) to balance latency and quality",
      "Fast prompt caching with read costs at only $0.01 per million tokens",
    ],
    cons: [
      "Higher rate tier ($0.50 input / $2.50 output) applies when context windows exceed 100k tokens",
      "Complex deep architectural refactoring still favors larger frontier models like Sonnet 5.5 and Opus 5.5",
    ],
    alternatives: ["claude-opus-5-5", "minimax-m3-1-flash", "deepseek"],
    pricingChecked: true,
  },
};

// ── Blog Post Definition ──
const BLOG_POST = {
  id: "cmucrh2posthaiku55000000001",
  slug: "claude-haiku-5-5-benchmarks-and-pricing",
  title: "Claude Haiku 5.5: Benchmarks, Effort Scaling, and Pricing Analysis",
  excerpt: "Anthropic unveils Claude Haiku 5.5, pairing a 90% token price cut with frontier computer use and granular effort-level scaling. Here is our comprehensive benchmark breakdown.",
  category: "Ecosystem",
  tagsPipe: "claude|haiku-5-5|anthropic|benchmarks|pricing|ai-models",
  coverEmoji: "⚡",
  coverGradient: "from-rose-500 to-amber-700",
  coverUrl: null,
  author: "Prother Editorial",
  status: "published",
  readingMinutes: 5,
  seoTitle: "Claude Haiku 5.5: Benchmarks, Effort Scaling, and Pricing Analysis",
  seoDescription: "Comprehensive analysis of Claude Haiku 5.5: 72.4% OSWorld computer use, $0.10/M input token pricing, effort scaling curves, and comparison with GPT-6 Luna and Sonnet 5.5.",
  keywords: "Claude Haiku 5.5, Anthropic, Haiku 5.5, OSWorld 2.1, Agentic Computer Use, FrontierCode, AI Models, LLM Benchmarks, Prompt Caching, AI Pricing",
  publishedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  body: `Anthropic has officially released [Claude Haiku 5.5](/tools/haiku-5-5), marking one of the most substantial leaps in intelligence, agentic capability, and cost efficiency in foundation model history.

Historically, lightweight models like Haiku were relegated to basic categorization, quick summarization, and lightweight parsing tasks. Haiku 5.5 shatters that ceiling: it posts a **72.4% score on OSWorld 2.1 (computer use)**, outpaces GPT-6 Luna across multiple knowledge and coding benchmarks, and slashes input token pricing by 90% down to **$0.10 per million tokens**.

Below is our complete visual breakdown, evaluation analysis, and cost architecture review.

## Visual Evaluations and Performance Curves

The following carousel details the official benchmark scorecard, effort-level scaling trajectories across computer use, knowledge tasks, and multidisciplinary reasoning, alongside the token pricing matrix:

\`\`\`carousel
![Claude Haiku 5.5 Benchmark Overview](/journal/haiku-5-5/haiku-5-5-benchmarks.png)
![Agentic Computer Use Performance by Effort Level](/journal/haiku-5-5/haiku-5-5-computer-use-effort.png)
![Real-World Knowledge Tasks by Effort Level](/journal/haiku-5-5/haiku-5-5-knowledge-tasks-effort.png)
![Multidisciplinary Reasoning by Effort Level](/journal/haiku-5-5/haiku-5-5-reasoning-effort.png)
![Token and Prompt Caching Pricing Comparison](/journal/haiku-5-5/haiku-5-5-pricing.png)
\`\`\`

## Direct Benchmark Comparisons

Comparing Haiku 5.5 against its predecessor Haiku 4.5, competitor model GPT-6 Luna, and frontier reference Sonnet 5.5 reveals extraordinary gains across all critical domains:

| Evaluation Domain | Haiku 5.5 | Haiku 4.5 | GPT-6 Luna | Sonnet 5.5 (Ref) |
| Knowledge Work (GDPval-AA v2.1) | 1620 | 735 | 1437 | 1840 |
| Knowledge Work (AA-Briefcase v1.1) | 1578 | 614 | 1336 | 1824 |
| Computer Use (OSWorld 2.1 Offline) | 72.4% | 15.7% | 48.9% | 83.9% |
| Reasoning (Humanity's Last Exam, no tools) | 45.9% | 10.2% | - | 56.9% |
| Reasoning (Humanity's Last Exam, with tools) | 57.4% | 18.7% | - | 64.5% |
| Agentic Coding (Terminal-Bench 4.0) | 39.2% | 0.0% | 16.4% | 70.6% |
| Agentic Coding (FrontierCode 1.1) | 46.4% | - | 42.4% | 52.1% (Xhigh) |
| Visual Reasoning (Chartography, no tools) | 46.4% | 6.4% | 29.1% | 61.6% |

Several figures stand out immediately:

1. **OSWorld Computer Use (72.4% vs 15.7%)**: Haiku 4.5 achieved only 15.7% on OSWorld 2.1. Haiku 5.5 nearly quintuples that performance to 72.4%, dramatically beating GPT-6 Luna (48.9%) and approaching Sonnet 5.5 (83.9%).
2. **Terminal-Bench Agentic Coding (39.2% vs 0.0%)**: Haiku 4.5 was completely unable to complete Terminal-Bench 4.0 challenges. Haiku 5.5 hits 39.2%, demonstrating capable multi-step bash and CLI navigation.
3. **GDPval Knowledge Work (1620 vs 735 Elo)**: Haiku 5.5 gains more than 880 Elo points over Haiku 4.5, comfortably overtaking GPT-6 Luna (1437).

## Dynamic Effort-Level Scaling

A defining feature of Haiku 5.5 is test-time effort scaling. Rather than running a monolithic fixed-compute inference path, developers can configure effort levels across five distinct presets: **Low**, **Med**, **High**, **Xhigh**, and **Max**.

- **Agentic Computer Use**: At Low effort, Haiku 5.5 scores ~42% at roughly $0.07 per attempt. Dialing compute to Max boosts the success rate to 72.4% at approximately $0.60 per attempt, remaining vastly cheaper than Sonnet 5.5 attempts.
- **Knowledge Tasks (GDPval-AA)**: Scaling effort from Low (~1130 Elo at $0.012/task) to Max (1620 Elo at $0.85/task) allows applications to trade milliseconds and pennies for deep analytical rigor.
- **Humanity's Last Exam**: Multidisciplinary reasoning without external tools climbs smoothly from 31% (Low) to 45.9% (Max), providing predictable scaling characteristics for complex domain queries.

## Radical Price Efficiency

While capabilities have surged, token pricing has plunged:

| Token Category | Haiku 5.5 (prompts <=100k) | Haiku 5.5 (prompts >100k) | Haiku 4.5 | Sonnet 5.5 |
| Cache reads | $0.01 / 1M | $0.05 / 1M | $0.10 / 1M | $0.10 / 1M |
| Cache writes | $0.125 / 1M | $0.625 / 1M | $1.25 / 1M | $2.50 / 1M |
| Input tokens | $0.10 / 1M | $0.50 / 1M | $1.00 / 1M | $2.00 / 1M |
| Output tokens | $0.50 / 1M | $2.50 / 1M | $5.00 / 1M | $10.00 / 1M |

For standard prompts up to 100k tokens, Haiku 5.5 costs **$0.10 per million input tokens** and **$0.50 per million output tokens**. Compared to Haiku 4.5 ($1.00 input / $5.00 output), this represents an immediate **90% reduction in API operational expense**.

Prompt caching makes high-context agent execution even more compelling: cache reads cost a mere **$0.01 per million tokens**, meaning continuous state inspection during multi-step agent runs incurs negligible cost.

## Summary and Availability

Claude Haiku 5.5 reshapes the design space for autonomous AI agents. Workflows that previously required costly frontier models can now execute reliably on Haiku 5.5 at a fraction of the budget.

To explore full specifications, pricing tiers, and alternative models, visit the listing on Prother:

- Explore the [Claude Haiku 5.5 Tool Page](/tools/haiku-5-5)
- Compare with [Claude Opus 5.5](/tools/claude-opus-5-5)
- Browse all models in the [AI Models Directory](/categories/ai-models)
`,
};

// ── Invariant Check ──
function checkInvariants(text: string, label: string) {
  if (text.includes("\u2014")) {
    throw new Error(`Invariant violation: em-dash found in ${label}`);
  }
  if (text.includes("\u2013")) {
    throw new Error(`Invariant violation: en-dash found in ${label}`);
  }
}

async function main() {
  console.log("Checking typography invariants...");
  checkInvariants(HAIKU_TOOL.tagline, "HAIKU_TOOL.tagline");
  checkInvariants(HAIKU_TOOL.description, "HAIKU_TOOL.description");
  checkInvariants(HAIKU_TOOL.pricingNote, "HAIKU_TOOL.pricingNote");
  checkInvariants(HAIKU_TOOL.editorial.longDescription, "HAIKU_TOOL.editorial.longDescription");
  HAIKU_TOOL.editorial.useCases.forEach((u, idx) => {
    checkInvariants(u.title, `useCase[${idx}].title`);
    checkInvariants(u.body, `useCase[${idx}].body`);
  });
  HAIKU_TOOL.editorial.pros.forEach((p, idx) => checkInvariants(p, `pro[${idx}]`));
  HAIKU_TOOL.editorial.cons.forEach((c, idx) => checkInvariants(c, `con[${idx}]`));

  checkInvariants(BLOG_POST.title, "BLOG_POST.title");
  checkInvariants(BLOG_POST.excerpt, "BLOG_POST.excerpt");
  checkInvariants(BLOG_POST.seoTitle, "BLOG_POST.seoTitle");
  checkInvariants(BLOG_POST.seoDescription, "BLOG_POST.seoDescription");
  checkInvariants(BLOG_POST.body, "BLOG_POST.body");
  console.log("✓ Invariants passed: zero em-dashes or en-dashes found.");

  const convex = createServerConvexClient();
  if (!convex) {
    throw new Error("Convex client could not be created. Ensure NEXT_PUBLIC_CONVEX_URL is set.");
  }

  // ── 1. Seed or Patch Tool ──
  console.log("\nSyncing Claude Haiku 5.5 tool to Convex...");
  const existingTool = await convex.query(api.tools.pageData, { slug: HAIKU_TOOL.slug });

  if (existingTool && !("error" in existingTool) && existingTool.tool?.id) {
    console.log(`Tool ${HAIKU_TOOL.slug} exists, updating...`);
    await convex.mutation(api.adminCrud.toolPatch, {
      toolLegacyId: existingTool.tool.id,
      data: {
        name: HAIKU_TOOL.name,
        tagline: HAIKU_TOOL.tagline,
        description: HAIKU_TOOL.description,
        websiteUrl: HAIKU_TOOL.websiteUrl,
        docsUrl: HAIKU_TOOL.docsUrl,
        categoryLegacyId: HAIKU_TOOL.categoryLegacyId,
        pricingModel: HAIKU_TOOL.pricingModel,
        startingPrice: HAIKU_TOOL.startingPrice,
        pricingNote: HAIKU_TOOL.pricingNote,
        hasApi: HAIKU_TOOL.hasApi,
        logoEmoji: HAIKU_TOOL.logoEmoji,
        logoGradient: HAIKU_TOOL.logoGradient,
        tagsPipe: HAIKU_TOOL.tagsPipe,
        makerHandle: HAIKU_TOOL.makerHandle,
      },
      logoUrl: HAIKU_TOOL.logoUrl,
      editorial: HAIKU_TOOL.editorial,
      nowMs: NOW,
    });
    console.log(`✓ Convex: Patched existing tool ${HAIKU_TOOL.slug}`);
  } else {
    const res = await convex.mutation(api.adminCrud.toolCreate, {
      id: HAIKU_TOOL.id,
      slug: HAIKU_TOOL.slug,
      name: HAIKU_TOOL.name,
      tagline: HAIKU_TOOL.tagline,
      description: HAIKU_TOOL.description,
      websiteUrl: HAIKU_TOOL.websiteUrl,
      categoryLegacyId: HAIKU_TOOL.categoryLegacyId,
      pricingModel: HAIKU_TOOL.pricingModel,
      startingPrice: HAIKU_TOOL.startingPrice,
      pricingNote: HAIKU_TOOL.pricingNote,
      hasApi: HAIKU_TOOL.hasApi,
      logoEmoji: HAIKU_TOOL.logoEmoji,
      logoGradient: HAIKU_TOOL.logoGradient,
      logoUrl: HAIKU_TOOL.logoUrl,
      tagsPipe: HAIKU_TOOL.tagsPipe,
      makerHandle: HAIKU_TOOL.makerHandle,
      status: HAIKU_TOOL.status,
      editorsPick: HAIKU_TOOL.editorsPick,
      curated: HAIKU_TOOL.curated,
      createdAt: NOW,
      editorial: HAIKU_TOOL.editorial,
    });
    console.log(`✓ Convex: Created tool ${HAIKU_TOOL.name} (ID: ${res.id})`);
    if (HAIKU_TOOL.docsUrl) {
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: res.id,
        data: { docsUrl: HAIKU_TOOL.docsUrl },
        nowMs: NOW,
      });
    }
  }

  // ── 2. Seed or Patch Blog Post ──
  console.log("\nSyncing Claude Haiku 5.5 blog post to Convex...");
  const postsList = await convex.query(api.posts.list, { limit: 100 });
  const existingPost = postsList.posts.find((p) => p.slug === BLOG_POST.slug);

  if (existingPost) {
    console.log(`Post ${BLOG_POST.slug} exists, updating...`);
    await convex.mutation(api.adminCrud.postPatch, {
      postLegacyId: existingPost.id ?? existingPost.slug,
      coverUrl: BLOG_POST.coverUrl,
      data: {
        title: BLOG_POST.title,
        excerpt: BLOG_POST.excerpt,
        body: BLOG_POST.body,
        category: BLOG_POST.category,
        tagsPipe: BLOG_POST.tagsPipe,
        status: BLOG_POST.status,
        author: BLOG_POST.author,
        readingMinutes: BLOG_POST.readingMinutes,
        seoTitle: BLOG_POST.seoTitle,
        seoDescription: BLOG_POST.seoDescription,
        keywords: BLOG_POST.keywords,
        coverEmoji: BLOG_POST.coverEmoji,
        coverGradient: BLOG_POST.coverGradient,
      },
    });
    console.log(`✓ Convex: Patched existing blog post ${BLOG_POST.slug}`);
  } else {
    const postRes = await convex.mutation(api.adminCrud.postCreate, {
      id: BLOG_POST.id,
      slug: BLOG_POST.slug,
      title: BLOG_POST.title,
      excerpt: BLOG_POST.excerpt,
      body: BLOG_POST.body,
      category: BLOG_POST.category,
      tagsPipe: BLOG_POST.tagsPipe,
      coverEmoji: BLOG_POST.coverEmoji,
      coverGradient: BLOG_POST.coverGradient,
      coverUrl: BLOG_POST.coverUrl,
      readingMinutes: BLOG_POST.readingMinutes,
      author: BLOG_POST.author,
      status: BLOG_POST.status,
      seoTitle: BLOG_POST.seoTitle,
      seoDescription: BLOG_POST.seoDescription,
      keywords: BLOG_POST.keywords,
      publishedAt: BLOG_POST.publishedAt,
      createdAt: BLOG_POST.createdAt,
      updatedAt: BLOG_POST.updatedAt,
    });
    console.log(`✓ Convex: Created blog post ${BLOG_POST.title} (Slug: ${postRes.slug})`);
  }

  // ── 3. Verification ──
  console.log("\nVerifying tool in Convex...");
  const verifiedTool = await convex.query(api.tools.pageData, { slug: HAIKU_TOOL.slug });
  if ("error" in verifiedTool) {
    throw new Error(`Tool verification failed: ${verifiedTool.error}`);
  }
  console.log("✓ Tool verified:");
  console.log(`  - Name: ${verifiedTool.tool.name}`);
  console.log(`  - Slug: ${verifiedTool.tool.slug}`);
  console.log(`  - Pricing: ${verifiedTool.tool.pricingModel} (${verifiedTool.tool.startingPrice})`);
  console.log(`  - Logo URL: ${verifiedTool.logoUrl}`);
  console.log(`  - Category: ${verifiedTool.tool.category.name}`);

  console.log("\nVerifying blog post in Convex...");
  const verifiedPost = await convex.query(api.seo.blogDetail, { slug: BLOG_POST.slug });
  if ("error" in verifiedPost) {
    throw new Error(`Post verification failed: ${verifiedPost.error}`);
  }
  console.log("✓ Blog post verified:");
  console.log(`  - Title: ${verifiedPost.post.title}`);
  console.log(`  - Slug: ${verifiedPost.post.slug}`);
  console.log(`  - Category: ${verifiedPost.post.category}`);
  console.log(`  - Status: ${verifiedPost.post.status}`);
  console.log(`  - SEO Title: ${verifiedPost.post.seoTitle}`);
  console.log(`  - Reading time: ${verifiedPost.post.readingMinutes} min`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
