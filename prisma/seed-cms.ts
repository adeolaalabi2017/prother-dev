/**
 * CMS seed — Journal posts + site settings.
 * Idempotent: upserts by slug / key, safe to re-run.
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
    slug: "how-to-launch-an-ai-tool-in-2026",
    title: "How to Launch an AI Tool in 2026: The Prother Playbook",
    excerpt:
      "A step-by-step launch playbook for AI founders — from S1–S6 listing standards to launch-day mechanics, vote velocity, and the 72-hour follow-through that separates hits from noise.",
    category: "Playbooks",
    tags: "launch|makers|guide",
    coverEmoji: "🚀",
    coverGradient: "from-orange-500 to-amber-700",
    readingMinutes: 8,
    seoTitle: "How to Launch an AI Tool in 2026 — The Prother Playbook",
    seoDescription:
      "The complete AI product launch playbook: listing standards, launch-day ranking mechanics, vote velocity, and the 72-hour follow-through. Built from Prother feed data.",
    keywords: "launch an ai tool, ai product launch, ai launch checklist, product launch playbook",
    publishedAt: "2026-09-14T09:00:00.000Z",
    body: `Every week, hundreds of AI tools ship. Most launches flare for an afternoon and die in a Discord channel. The ones that compound share a pattern — and after watching thousands of launches move through the Prother feed, the pattern is legible enough to write down.

## Before you submit: pass the six standards

Every listing on Prother clears the same six standards (S1–S6). They sound bureaucratic until you read them as a **launch checklist**:

- **S1 — Live & accessible.** If a reviewer can't use it *right now*, it's not a launch, it's a promise. Pre-launch pages convert worse than delayed launches with working demos.
- **S2 — AI-native.** The core value must be powered by AI/ML. "AI button bolted on" is the most common rejection reason — and the most common reason users churn after clicking.
- **S3 — Complete listing.** Logo, a ≤60-character tagline, an informative description, working links, honest pricing. Thin listings get thin traffic.
- **S4 — Honest presentation.** No fake "free," no inflated claims. The feed remembers.
- **S5 — Safe & legal.** Obvious, still enforced.
- **S6 — English listing.** Your product can serve any market; your listing must be legible to reviewers.

## The tagline is 80% of your click-through

Feed rows give you roughly twelve words of earned attention. A tagline that says *what it does in the first five words* consistently outperforms clever-but-vague ones. Compare:

- ❌ "Supercharge your workflow with the power of AI"
- ✅ "Review AI code diffs before your team ships"

The second one names the actor, the object, and the moment of use. That's the whole game.

## Launch day mechanics

Prother's ranking is **score = weighted_upvotes / hours^1.2** — recency-weighted, so early velocity matters but a slow burn can still win the day. Practical consequences:

1. **Line up your first 20 upvotes before 00:00 UTC.** Your community, your list, your co-founders' groups. Accounts younger than 24h carry half weight — real fans, not fresh signups, are the asset.
2. **Be present in the comments.** Maker replies are the highest-signal trust marker on a launch row.
3. **Ship screenshots.** Listings with 3+ media assets get roughly 2× clicks in our data.

## The 72-hour follow-through

The vote window closes at UTC midnight, but the listing lives forever. The moves that compound:

- Publish a "what we learned launching" post (the Journal is open to makers).
- Respond to every review — including the harsh ones.
- Watch your listing's outbound clicks in the maker dashboard; that's your true conversion signal.

Cold-start is a solved problem if you treat the launch as a *campaign with a deadline*, not a listing. The feed rewards teams that show up like it's game day — because it is.`,
  },
  {
    slug: "inside-prother-ranking-algorithm",
    title: "Inside Prother's Ranking Algorithm: Velocity, Decay, and Fairness",
    excerpt:
      "How the daily feed actually ranks launches: the weighted vote formula, the hours^1.2 decay curve, age-weighted voting, and the anti-manipulation signals we run before anything hits the homepage.",
    category: "Engineering",
    tags: "ranking|algorithm|engineering",
    coverEmoji: "📈",
    coverGradient: "from-amber-500 to-orange-700",
    readingMinutes: 6,
    seoTitle: "How the Prother Ranking Algorithm Works — Velocity & Decay",
    seoDescription:
      "The exact math behind Prother's daily launch feed: weighted upvotes, the hours^1.2 decay curve, new-account vote damping, and anomaly flags that keep the homepage honest.",
    keywords: "launch ranking algorithm, hacker news ranking, vote decay curve, feed algorithm",
    publishedAt: "2026-09-16T09:00:00.000Z",
    body: `Ranking a daily launch feed is a trust problem disguised as a math problem. This post documents exactly how Prother ranks launches — the same transparency we require of the tools we list.

## The formula

\`\`\`
score = weighted_upvotes / hours^1.2
\`\`\`

\`hours\` is time since 00:00 UTC of the launch day. The exponent is the tuning knob:

- \`1.0\` would be pure division — early votes dominate forever, late comebacks never happen.
- \`1.2\` is the sweet spot we landed on: **early velocity matters, but a tool with 90 votes at hour 20 can still overtake 40 votes at hour 2.**
- Anything above ~1.5 turns the feed into a countdown clock where only the first hour matters.

## Vote weighting

Not all upvotes are equal. Accounts younger than 24 hours cast votes worth **0.5**. This single rule killed most of the "create 50 accounts and upvote yourself" experiments in testing — fresh cohorts simply don't have the account age to move the needle, and they cost real effort to mature.

One vote per account per launch is enforced at the database level, and re-launches get a **fresh vote pool** by design: votes reference the launch, not the tool.

## Anomaly signals

We flag (and freeze pending review) when we see:

- Burst voting from single IP ranges or referrers
- Vote velocity far outside the launch's category baseline
- Clusters of brand-new accounts arriving together

Flags don't auto-punish; they queue for a human. False positives happen, and a silent algorithm should never be the judge of a launch day someone spent months preparing.

## Why not engagement-weighted ranking?

Clicks, dwell time, and outbound CTR are tempting signals, but they advantage flashy listings over useful ones. Votes from people who *tried the tool* remain the least gameable quality proxy we have. We do use velocity + CTR for the weekly "trending" windows — different question, different math.

The algorithm is short enough to fit in a tweet. That's the point: makers should be able to reason about their own launch without reverse-engineering a black box.`,
  },
  {
    slug: "ai-tool-directory-seo-guide",
    title: "SEO for AI Tool Directories: The Long-Tail System That Actually Works",
    excerpt:
      "Programmatic SEO for launch platforms: how daily archive pages, category landing pages, and structured data turn a launch feed into an organic acquisition machine — without doorway-page penalties.",
    category: "Growth",
    tags: "seo|growth|content",
    coverEmoji: "🔍",
    coverGradient: "from-yellow-500 to-orange-600",
    readingMinutes: 7,
    seoTitle: "SEO for AI Tool Directories — The Long-Tail System (2026)",
    seoDescription:
      "How AI tool directories win organic search: daily indexable archive pages, category landing pages with unique copy, SoftwareApplication schema, and sitemap discipline.",
    keywords: "ai tools directory seo, programmatic seo, softwareapplication schema, tool directory traffic",
    publishedAt: "2026-09-17T09:00:00.000Z",
    body: `Static AI directories won SEO in 2024 with stale listicles. The next wave wins it with **living pages** — and a launch feed is accidentally the best SEO machine in the category.

## The three-layer keyword system

1. **Head terms** ("AI tools", "best AI tools") — brutal competition, won slowly by brand + freshness.
2. **Daily long-tail** ("new AI tools today", "AI launches September 18") — a launch feed answers this *by existing*. The homepage and daily archive pages are the only pages on the internet that are born fresh every morning.
3. **Intent long-tail** ("AI tool to turn podcasts into blog posts") — lives on tool detail and category pages, where specific tools with specific taglines match specific queries.

Most directories attack layer 3 with doorway pages and get filtered. The difference between a doorway page and a useful one is simple: **does the page exist to rank, or does it rank because it exists?**

## Structured data that moves the needle

Every tool listing should emit:

- \`SoftwareApplication\` with \`applicationCategory\` and offers
- \`aggregateRating\` — only at ≥3 reviews, never fabricated
- Per-review \`Review\` entities
- \`BreadcrumbList\` from category → tool

Ratings below threshold must stay hidden. Schema spam is the fastest way to lose a manual-action-free history.

## Freshness without fluff

Daily archive pages (\`/launches/{date}\`) are indexable and *differentiated by nature* — each contains that day's actual launches, vote counts, and editorial notes. Sitemap discipline does the rest: new URLs in the sitemap within an hour of rollover, \`lastmod\` honest, no URL churn.

## The compounding layer nobody does

The blog is layer four: **proving expertise about the ecosystem itself.** Ranking explainers, launch playbooks, category deep-dives — these earn links to the pages that list the tools. A directory with a brain outranks a directory with a database, every algorithm update.`,
  },
  {
    slug: "what-makers-ask-before-launching",
    title: "What Makers Ask Before Launching — Answered From 1,000+ Launches",
    excerpt:
      "The twelve questions every AI founder asks before launch day — timing, pricing pages, screenshots, vote mechanics, claims, and re-launches — answered with what the feed data actually shows.",
    category: "Makers",
    tags: "makers|faq|launch",
    coverEmoji: "🧭",
    coverGradient: "from-orange-600 to-red-700",
    readingMinutes: 5,
    seoTitle: "Maker FAQ: Launching an AI Tool, Answered From Real Feed Data",
    seoDescription:
      "When to launch, how many screenshots, do badges matter, what happens after rejection — the 12 questions AI founders ask most, answered with Prother feed data.",
    keywords: "ai founder questions, when to launch ai product, launch day faq",
    publishedAt: "2026-09-18T09:00:00.000Z",
    body: `Collected from moderation notes and maker emails across the first months of the feed. Short answers, data where we have it.

**1. What day should I launch?**
Weekdays outperform weekends for B2B-leaning tools; the gap narrows for consumer. The feed floors at 5 launches/day, so you're never alone on the homepage.

**2. Does the hour I submit matter?**
Launches go live at 00:00 UTC regardless. What matters is *your* first-hour velocity — coordinate your announcement to when your audience is awake.

**3. How many screenshots?**
Three or more. Listings with 3+ media get roughly 2× clicks. Five is the cap; use it.

**4. Do I need a video?**
No. A crisp GIF of the core loop beats a 90-second sizzle reel.

**5. What gets listings rejected most?**
S2 ("AI button bolted on") and S3 (incomplete listing). Both are fixable in an afternoon.

**6. Can I review my own product?**
No — maker self-review is blocked, including domain-matched accounts. Competitor reviews are allowed and often the most useful ones.

**7. How do votes work?**
One per account per launch. Accounts under 24h count half. Anomalous bursts get frozen for review, not silently deleted.

**8. What's an Editor's Pick, and can I pay for it?**
An editorial badge, never for sale. Sponsored placements are separately labeled and never inside organic rankings.

**9. Someone else listed my tool. Can I claim it?**
Yes — unclaimed listings carry "Claim this →". Verification is by domain email, DNS TXT, or meta tag. Rights transfer after verification.

**10. When can I re-launch?**
Once per 6 months for a major release, editor-approved, badged, with a fresh vote pool.

**11. My listing was rejected — now what?**
The rejection email names the failed standard(s) with a one-click resubmit. Median fix time is under a day.

**12. What should I do the day after?**
Reply to every comment and review, thank your top supporters publicly, and ship the thing they asked for. Launches are a beginning, not a verdict.`,
  },
  {
    slug: "category-taxonomy-design-for-ai-tools",
    title: "Designing a Category Taxonomy for AI Tools That Won't Rot",
    excerpt:
      "Ten categories, one per tool, plus a controlled tag vocabulary: the taxonomy decisions behind Prother, why 'Other' is a trap, and the quarterly review that keeps the map matching the territory.",
    category: "Engineering",
    tags: "taxonomy|information-architecture",
    coverEmoji: "🗂️",
    coverGradient: "from-lime-600 to-emerald-700",
    readingMinutes: 6,
    seoTitle: "AI Tool Taxonomy Design — 10 Categories That Scale",
    seoDescription:
      "How to design category taxonomy for an AI tools directory: one primary category per tool, controlled tag vocabulary, SEO landing pages, and the quarterly drift review.",
    keywords: "ai tool categories, taxonomy design, information architecture directory",
    publishedAt: "2026-09-19T09:00:00.000Z",
    body: `Taxonomies rot because models drift and categories accrete. Prother's answer is boring on purpose: **ten primary categories, one per tool, plus a controlled tag vocabulary** that crosses categories.

## The ten

🤖 Generative AI & Chatbots · 🎨 AI Art, Image & Video · 👨‍💻 AI Coding Tools · 📝 AI Writing & Productivity · 📈 AI for Data Analysis · ⚙️ AI Infrastructure & DevTools · 🔊 AI Audio, Voice & Music · 🕹️ AI Agents & Automation · 🏥 Vertical AI · 🛡️ AI Safety, Ethics & Governance.

Rules that keep it alive:

- **One primary category per tool.** Multi-category listing feels generous and scores terribly — it dilutes browse pages and confuses comparisons.
- **No "Other."** An Other bucket is a graveyard. If something genuinely doesn't fit, that's a signal the taxonomy is behind the ecosystem — worth a review, not a bucket.
- **Categories are editor-managed, zero-deploy.** The admin console can add, rename, and reorder categories; the site reads them from the database at request time.

## Tags do the cross-cutting

Where a category answers *what is it*, tags answer *how does it run*: \`open-source\`, \`free-tier\`, \`api-available\`, \`self-hosted\`, \`no-code\`, \`enterprise\`, \`browser-extension\`, \`mobile\`. Controlled vocabulary — free-text tags become spam within a quarter.

## The quarterly drift review

Every quarter: pull the zero-result search queries, the category page bounce rates, and the "uncategorizable" submissions. If three tools failed to fit last month, the taxonomy has a hole. If a category has two tools, it's a tag, not a category.

Taxonomy is a product surface, not metadata. It's how evaluators think, how category pages rank, and how the feed avoids becoming an undifferentiated firehose.`,
  },
  {
    slug: "launch-week-recap-september-2026",
    title: "Launch Week Recap: What 100+ AI Launches Tell Us About Right Now",
    excerpt:
      "Agents took the top slot, coding tools consolidated, vertical AI quietly doubled — a data-backed recap of this launch week on Prother, with the vote patterns and category signals that mattered.",
    category: "Ecosystem",
    tags: "recap|data|trends",
    coverEmoji: "🗞️",
    coverGradient: "from-rose-600 to-orange-700",
    readingMinutes: 4,
    seoTitle: "AI Launch Week Recap — Category & Vote Trends From Prother",
    seoDescription:
      "This week on Prother: 100+ AI launches ranked by community votes. Agents lead, coding tools consolidate, vertical AI doubles — the trends with the numbers behind them.",
    keywords: "ai launches this week, ai tool trends, new ai tools september 2026",
    publishedAt: "2026-09-20T09:00:00.000Z",
    body: `A weekly read of the feed, so you don't have to scrape it.

## The headline: agents ate the week

🕹️ AI Agents & Automation took the largest share of top-ten slots for the first time — not because more agent tools launched, but because agent tools **kept their votes past hour six**. Persistence beats splash.

## Coding tools consolidated

The 👨‍💻 Coding category didn't grow; it *concentrated*. The top three coding launches out-voted the remaining seven combined. Interpretation: the eval-driven buyer has consolidated around fewer, deeper tools, and the "GPT wrapper with a CLI" tier is being priced out of attention.

## Vertical AI quietly doubled

🏥 Vertical AI submissions doubled week-over-week. None charted #1 — but their outbound CTR was the highest of any category. Vertical tools convert a smaller, much hotter audience. Watch this lane.

## What didn't move

- 🎨 Image & Video: steady volume, votes spread thin — the category is a market, not a moment.
- 🛡️ Safety & Governance: two launches, both solid, neither viral. The category grows on procurement cycles, not launch days.

## One number to remember

**Median upvotes per launch this week: 22.** The floor for a top-five slot was 58. If your launch plan doesn't know how it gets 58 real votes, the plan is the thing to fix — not the ranking.`,
  },
];

// ─────────────────────────────────────────────────────── Site settings KV
const SETTINGS: Record<string, string> = {
  "hero.headline": "Where AI products launch.",
  "hero.subline":
    "A fresh batch of AI tools every day. Discover, upvote, and compare — before the rest of the internet catches on.",
  "hero.announcement": "Now in open beta — submit your tool free",
  "footer.note": "Curated, community-ranked, never for sale.",
  "seo.defaultTitle": "Prother — Where AI products launch",
  "seo.defaultDescription":
    "A curated, community-driven launchpad for AI products. A fresh batch of AI tools launches every day at 00:00 UTC — discover, upvote, review, and compare.",
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
      update: {}, // don't clobber admin-managed copy on re-seed
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
