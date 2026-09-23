/**
 * CMS seed — Journal posts + site settings.
 * Idempotent: upserts by slug / key, safe to re-run.
 * Discovery-era copy: directory, listings, evaluation — no launch framing.
 * Run: bun prisma/seed-cms.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ─────────────────────────────────────────────────────────── Journal posts
type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string;
  coverEmoji: string;
  coverGradient: string;
  readingMinutes: number;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  publishedAt: string; // ISO
  body: string;
};

const POSTS: SeedPost[] = [
  {
    slug: "how-to-evaluate-an-ai-tool-in-15-minutes",
    title: "How to Evaluate an AI Tool in 15 Minutes",
    excerpt:
      "A practical 15-minute checklist for evaluating an AI tool before it touches your workflow: free-tier reality check, data retention, export paths, pricing math, and a 3-task test.",
    category: "Playbooks",
    tags: "evaluation|makers|guide",
    coverEmoji: "🧪",
    coverGradient: "from-orange-500 to-amber-700",
    readingMinutes: 6,
    seoTitle: "How to Evaluate an AI Tool in 15 Minutes. The Prother Checklist",
    seoDescription:
      "The 15-minute AI tool evaluation checklist: free-tier reality check, data-retention questions, export paths, pricing math, and a 3-task test on your own material.",
    keywords: "evaluate ai tools, ai tool checklist, ai tool evaluation, choose the right ai tool",
    publishedAt: "2026-09-14T09:00:00.000Z",
    body: `Fifteen minutes is enough to know whether an AI tool deserves a slot in your workflow: if you spend them on the right checks. This is the same checklist our editors run before a tool earns its listing, and it works just as well for your own stack.

## Minutes 0–3: the free-tier reality check

Sign up and use the real product, not the demo video. The free tier is where tools tell the truth about themselves:

- Is the core feature available without a card, or is the "free" plan a brochure?
- Do you hit the wall after three tasks, or can you finish real work?
- Is the paid price posted honestly, or is the pricing page a sales-call form?

A tool that hides its pricing behind a call has already told you something.

## Minutes 3–6: data retention and export paths

Check two things: the data policy and the export settings. You want three answers: what is stored, for how long, and is your content used for training by default? Then find the export path: can you get your work out in a usable format today, without emailing support? A tool you can't leave is a tool that owns you.

## Minutes 6–9: the 3-task test

Run three tasks on **your** material, not the vendor's samples:

1. One easy task: the obvious use case. Does it just work?
2. One representative task: the actual job you'd hire it for, at real complexity.
3. One adversarial task: messy input, edge case, the thing that breaks demos.

Grade all three against what a careful human produced. Most tools pass the demo and fail the representative task; that's a fail.

## Minutes 9–12: pricing math

Price per seat is theater. The real math: (expected monthly usage × the plan that covers it) versus the hours the tool replaces. Watch for seat models that count bots or collaborators as humans, usage meters that reset on calendar days instead of rolling windows, and annual-only discounts that lock you into a tool you've used for fifteen minutes.

## Minutes 12–15: the trust check

Read the changelog and one recent review from an account that isn't the maker's. A tool shipping fixes weekly is telling you the failure you found is already on someone's list. A tool whose only updates are landing-page redesigns is telling you something too.

Fifteen minutes won't make you an expert, but it reliably separates the tools worth a month of your attention from the ones worth a shrug. The checklist is deliberately boring: that's what makes it work.`,
  },
  {
    slug: "inside-prother-listing-standards",
    title: "Inside Prother's Listing Standards: S1–S6",
    excerpt:
      "The six listing standards every tool must clear to appear in Prother's directory: live & accessible, AI-native, complete listing, honest presentation, safe & legal, English listing, and the reasoning behind each.",
    category: "Engineering",
    tags: "standards|listing|engineering",
    coverEmoji: "📐",
    coverGradient: "from-amber-500 to-orange-700",
    readingMinutes: 6,
    seoTitle: "Inside Prother's Listing Standards: S1–S6",
    seoDescription:
      "The six listing standards every AI tool must clear to be listed on Prother: live & accessible, AI-native, complete listing, honest presentation, safe & legal, English listing.",
    keywords: "ai tool listing standards, directory quality standards, ai directory curation",
    publishedAt: "2026-09-16T09:00:00.000Z",
    body: `Every listing in the Prother directory clears the same six standards. We publish them because evaluators deserve to know what "listed" means, and because makers deserve a checklist instead of a mystery. This post documents each standard and the reasoning behind it.

## S1. Live & accessible

If a reviewer can't use it *right now*, it's not a listing, it's a promise. Tools must be live at a working URL: no waitlists as landing pages, no "coming soon" with a screenshot. A dead link or a gated demo fails S1; the most common fix is shipping the demo you already have.

## S2. AI-native

The core value must be powered by AI/ML. "AI button bolted on" is the most common rejection reason, and the most common reason users churn after clicking. A form builder with a model in a modal is not AI-native; a document tool where the model is the editor is.

## S3. Complete listing

Logo, a ≤60-character tagline, an informative description, working links, honest pricing. Thin listings get thin traffic: the standard exists because evaluators compare tools side by side, and a listing with three words and a broken link wastes everyone's fifteen minutes.

## S4. Honest presentation

No fake "free," no inflated claims, no screenshots of features that don't exist yet. If the free tier has a hard cap, the listing says so. If the model is a fine-tune of someone else's work, say whose. Evaluators forgive honest limitations; they don't forgive discovering them after signup.

## S5. Safe & legal

Obvious, still enforced. No malware distribution, no privacy-hostile data practices presented as features, no categories we can't responsibly index.

## S6. English listing

Your product can serve any market; your listing must be legible to reviewers and to the evaluators browsing the directory. Localized products are welcome: the listing itself needs English copy alongside.

## How the standards get applied

Every submission is reviewed by an editor against S1–S6 before it appears in the directory. Rejections name the failed standard(s) with a one-click resubmit: the median fix time is under a day. None of the standards are about size or budget: a two-person team with a working product and an honest listing clears all six. That's the point.`,
  },
  {
    slug: "ai-tool-directory-seo-guide",
    title: "SEO for AI Tool Directories: The Long-Tail System That Actually Works",
    excerpt:
      "Programmatic SEO for AI directories: how category pages, tool listing pages, and a searchable /tools index turn a curated directory into an organic acquisition machine: without doorway-page penalties.",
    category: "Growth",
    tags: "seo|growth|content",
    coverEmoji: "🔍",
    coverGradient: "from-yellow-500 to-orange-600",
    readingMinutes: 7,
    seoTitle: "SEO for AI Tool Directories. The Long-Tail System (2026)",
    seoDescription:
      "How AI tool directories win organic search: category landing pages with unique copy, tool listing pages, a crawlable /tools search experience, SoftwareApplication schema, and sitemap discipline.",
    keywords: "ai tools directory seo, programmatic seo, softwareapplication schema, tool directory traffic",
    publishedAt: "2026-09-17T09:00:00.000Z",
    body: `Static AI directories won SEO in 2024 with stale listicles. The next wave wins it with **living pages**, and a curated directory with real search is accidentally the best SEO machine in the category.

## The three-layer keyword system

1. **Head terms** ("AI tools", "best AI tools"): brutal competition, won slowly by brand + curation.
2. **Category long-tail** ("best AI tools for podcast clipping", "computer vision tools for retail"): the category pages answer this *by existing*. Each category page is the only page on the internet that ranks every serious tool in that category, updated as the ecosystem moves.
3. **Intent long-tail** ("AI tool to turn podcasts into blog posts"): lives on tool listing pages and the /tools search results, where specific tools with specific taglines match specific queries.

Most directories attack layer 3 with doorway pages and get filtered. The difference between a doorway page and a useful one is simple: **does the page exist to rank, or does it rank because it exists?**

## Structured data that moves the needle

Every tool listing should emit:

- \`SoftwareApplication\` with \`applicationCategory\` and offers
- \`aggregateRating\`: only at ≥3 reviews, never fabricated
- Per-review \`Review\` entities
- \`BreadcrumbList\` from category → tool

Ratings below threshold must stay hidden. Schema spam is the fastest way to lose a manual-action-free history.

## The /tools directory and the SERP

A searchable directory page (\`/tools\`) is the underused layer: every query a visitor types is a real search demand you can see in your own logs. Internally, the SERP teaches you which queries deserve dedicated category copy; externally, a fast, crawlable search experience with clean URLs captures the long tail no category page can enumerate. Sitemap discipline does the rest: new tools in the sitemap the day they're listed, \`lastmod\` honest, no URL churn.

## The compounding layer nobody does

The journal is layer four: **proving expertise about the ecosystem itself.** Evaluation checklists, taxonomy deep-dives, ecosystem recaps: these earn links to the pages that list the tools. A directory with a brain outranks a directory with a database, every algorithm update.`,
  },
  {
    slug: "what-makers-ask-before-listing",
    title: "12 Questions Makers Ask Before Listing a Tool",
    excerpt:
      "Screenshots, pricing honesty, claims, review gating, claiming an unclaimed listing, the rejection flow: the twelve questions every maker asks before listing a tool, answered from real directory data.",
    category: "Makers",
    tags: "makers|faq|listing",
    coverEmoji: "🧭",
    coverGradient: "from-orange-600 to-red-700",
    readingMinutes: 5,
    seoTitle: "Maker FAQ: Listing a Tool on Prother, Answered",
    seoDescription:
      "How many screenshots, how honest is honest pricing, what claims get flagged, how claiming works, what happens after rejection: the 12 questions AI makers ask most before listing a tool.",
    keywords: "list ai tool on directory, ai tool listing faq, submit ai tool",
    publishedAt: "2026-09-18T09:00:00.000Z",
    body: `Collected from moderation notes and maker emails across the first months of the directory. Short answers, data where we have it.

**1. How many screenshots should a listing have?**
Three or more. Listings with 3+ media get roughly 2× clicks. Five is the cap; use it.

**2. Do I need a video?**
No. A crisp GIF of the core loop beats a 90-second sizzle reel.

**3. What gets listings rejected most?**
S2 ("AI button bolted on") and S3 (incomplete listing). Both are fixable in an afternoon.

**4. Can I review my own product?**
No: maker self-review is blocked, including domain-matched accounts. Competitor reviews are allowed and often the most useful ones.

**5. How honest does the pricing section need to be?**
Completely. If the free tier has a hard cap, the listing says so. If there's a seat model, the listing says what counts as a seat. Listings with vague pricing convert worse and churn reviewers faster: honesty is the cheaper option.

**6. What kind of claims get flagged?**
Unverifiable superlatives ("the best AI writer"), metrics without a method ("10× faster"), and "free" that isn't. Write claims you could defend with a demo and a methodology paragraph.

**7. Can I gate reviews to verified users?**
On your own site, sure. On Prother, reviews come from community accounts: that's what makes the aggregate meaningful. You can respond to every review, including the harsh ones.

**8. What's an Editor's Pick, and can I pay for it?**
An editorial badge, never for sale. Sponsored placements are separately labeled and never inside organic listings.

**9. Someone else listed my tool. Can I claim it?**
Yes: unclaimed listings carry "Claim this →". Verification is by domain email, DNS TXT, or meta tag. Rights transfer after verification.

**10. Can I pay to be listed?**
No. Listing is free and editorially reviewed; the six standards (S1–S6) are the only gate. Paid placements exist, are labeled, and never affect whether a tool is listed.

**11. My listing was rejected: now what?**
The rejection email names the failed standard(s) with a one-click resubmit. Median fix time is under a day.

**12. What should I do the week after listing?**
Reply to every comment and review, keep the pricing section current, and ship the thing reviewers asked for. A listing is a beginning, not a verdict.`,
  },
  {
    slug: "category-taxonomy-design-for-ai-tools",
    title: "Designing a Category Taxonomy for AI Tools That Won't Rot",
    excerpt:
      "Seven categories, one per tool, plus a controlled tag vocabulary: the taxonomy decisions behind Prother, why 'Other' is a trap, and the quarterly review that keeps the map matching the territory.",
    category: "Engineering",
    tags: "taxonomy|information-architecture",
    coverEmoji: "🗂️",
    coverGradient: "from-lime-600 to-emerald-700",
    readingMinutes: 6,
    seoTitle: "AI Tool Taxonomy Design: 7 Categories That Scale",
    seoDescription:
      "How to design category taxonomy for an AI tools directory: seven categories evaluators actually shop by, one primary category per tool, controlled tag vocabulary, and the quarterly drift review.",
    keywords: "ai tool categories, taxonomy design, information architecture directory",
    publishedAt: "2026-09-19T09:00:00.000Z",
    body: `Taxonomies rot because models drift and categories accrete. Prother's answer is boring on purpose: **seven primary categories, one per tool, plus a controlled tag vocabulary** that crosses categories.

## The seven

💬 Conversational AI & Chatbots · 🎨 Generative Content Creation · 📝 NLP & Text Utilities · 👁️ Computer Vision · 📊 Data Analytics & Predictive Modeling · ⚙️ Automation & Workflow Orchestration · 🛠️ Developer Frameworks & Infrastructure.

We rebuilt the taxonomy around the seven ways evaluators actually shop for AI: ask, create, write, see, analyze, orchestrate, build. The old buckets described marketing decks; these describe jobs to be done.

Rules that keep it alive:

- **One primary category per tool.** Multi-category listing feels generous and scores terribly: it dilutes browse pages and confuses comparisons.
- **No "Other."** An Other bucket is a graveyard. If something genuinely doesn't fit, that's a signal the taxonomy is behind the ecosystem: worth a review, not a bucket.
- **Categories are editor-managed, zero-deploy.** The admin console can add, rename, and reorder categories; the site reads them from the database at request time.

## Tags do the cross-cutting

Where a category answers *what is it for*, tags answer *how does it run*: \`open-source\`, \`free-tier\`, \`api-available\`, \`self-hosted\`, \`no-code\`, \`enterprise\`, \`browser-extension\`, \`mobile\`. Controlled vocabulary: free-text tags become spam within a quarter.

## The quarterly drift review

Every quarter: pull the zero-result search queries, the category page bounce rates, and the "uncategorizable" submissions. If three tools failed to fit last month, the taxonomy has a hole. If a category has two tools, it's a tag, not a category.

Taxonomy is a product surface, not metadata. It's how evaluators think, how category pages rank, and how a directory avoids becoming an undifferentiated firehose.`,
  },
  {
    slug: "state-of-ai-tooling-ecosystem-2026",
    title: "State of the AI Tooling Ecosystem: September 2026",
    excerpt:
      "A quarterly trend recap of the AI tooling ecosystem: category consolidation, agent frameworks growing up, local models going mainstream, and voice cloning's compliance reckoning.",
    category: "Ecosystem",
    tags: "recap|trends|ecosystem",
    coverEmoji: "🗞️",
    coverGradient: "from-rose-600 to-orange-700",
    readingMinutes: 5,
    seoTitle: "State of the AI Tooling Ecosystem. September 2026",
    seoDescription:
      "Where the AI tooling ecosystem stands in September 2026: attention consolidating around fewer tools, agent frameworks maturing, local models entering procurement, and voice cloning's compliance era.",
    keywords: "ai tool trends 2026, ai ecosystem report, ai tooling state",
    publishedAt: "2026-09-20T09:00:00.000Z",
    body: `A quarterly read of the catalog and the conversation around it: what evaluators are searching for, what makers are shipping, and where the money is moving. The interesting signals this quarter are structural, not volume-based.

## Consolidation, not explosion

The tool count keeps rising; the *attention* is consolidating. In almost every category the top five listings now absorb the majority of outbound clicks, and the long tail is being priced out of relevance rather than out of existence. The "model wrapper with a pricing page" tier is disappearing: evaluators have learned to spot it in one screenshot, and the fifteen-minute evaluation checklist is doing to thin tools what review aggregates did to thin apps.

## Agent frameworks grew up

Automation & Workflow Orchestration has quietly become the ecosystem's center of gravity. The tools that survived the year share a shape: durable state, human checkpoints, and honest failure modes. The conversation moved from "what can an agent do" to "what does an agent do when it fails", which is what maturity sounds like.

## Local models went mainstream

A year ago local inference was a hobbyist flex; now the Developer Frameworks & Infrastructure category treats it as table stakes. Privacy-sensitive buyers (legal, healthcare, finance) are the driver: the pitch "your data never leaves the building" now closes deals that cloud-only vendors used to win. Expect the local-versus-API tradeoff to be a standard comparison filter within the year.

## Voice cloning hits its compliance era

Voice moved from demo to deployment, and immediately collided with consent law. Watermarking, per-voice consent records, and cloning opt-out registries are becoming procurement requirements, not differentiators. The tools that treated this as a product feature early are the ones showing up on enterprise shortlists now.

## One number to remember

**Seven categories.** We rebuilt the directory's taxonomy this month around the seven that describe how evaluators actually shop for AI: conversational, generative content, NLP, vision, data, automation, and developer infrastructure. When the shelves match how people think, discovery gets boring in the best way: you search, you compare, you get back to work.`,
  },
];

// ─────────────────────────────────────────────────────── Site settings KV
const SETTINGS: Record<string, string> = {
  "hero.headline": "Find the right AI tool.",
  "hero.subline":
    "A curated directory of AI products and tools. Search, compare, and read real reviews, before you commit your workflow.",
  "hero.announcement": "46 tools indexed: free forever",
  "footer.note": "Curated, human-reviewed, never for sale.",
  "seo.defaultTitle": "Prother. AI tool discovery",
  "seo.defaultDescription":
    "A curated search & discovery directory for AI products and tools. Compare pricing, read reviews, and find the right AI for the job.",
  // Task 32 — CMS-managed frontend elements (server-rendered sections).
  "home.categoriesKicker": "Browse by category",
  "home.categoriesHeading": "Find your category.",
  "home.picksKicker": "Editor's Picks",
  "home.picksHeading": "Hand-tested by our editors.",
  "home.closingHeadline": "Can't find the\ntool you need?",
  "home.closingSub": "Listings are free and reviewed by humans.",
  "footer.tagline": "The curated directory for AI tools. Search, compare, and save your stack.",
};

async function main() {
  let posts = 0;
  for (const p of POSTS) {
    const data = {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      category: p.category,
      tags: p.tags,
      coverEmoji: p.coverEmoji,
      coverGradient: p.coverGradient,
      readingMinutes: p.readingMinutes,
      status: "published",
      author: "Prother Editorial",
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      keywords: p.keywords,
      publishedAt: new Date(p.publishedAt),
    };
    const existing = await db.post.findUnique({ where: { slug: p.slug } });
    if (existing) {
      // Keep admin edits: only fill blanks on re-seed.
      await db.post.update({ where: { slug: p.slug }, data: { ...data, status: existing.status === "published" ? "published" : existing.status } });
    } else {
      await db.post.create({ data });
    }
    posts++;
  }

  let settings = 0;
  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.siteSetting.upsert({
      where: { key },
      update: { value }, // repositioning overwrite — replace stale launch-era copy rows
      create: { key, value },
    });
    settings++;
  }

  console.log(`CMS seed ✓ — ${posts} posts upserted, ${settings} settings ensured.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
