import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/prother/hero";
import { CategoryTicker } from "@/components/prother/category-ticker";
import { IntentPath } from "@/components/prother/intent-path";
import { TrendingStrip } from "@/components/prother/trending-strip";
import { SubmitOpenButton } from "@/components/prother/submit-open-button";
import { CATEGORIES } from "@/components/prother/categories";
import { ToolLogo } from "@/components/prother/tool-logo";
import { clamp } from "@/lib/og";
import { cn } from "@/lib/utils";
import { CATEGORY_BLURBS } from "@/lib/category-blurbs";
import { createServerConvexClient } from "@/lib/convex";
import { shadowHomepage, shadowMetaEntities, shadowSite } from "@/lib/data";

/** Convex-only entity lookups for deep-link metadata (null on failure —
 *  the homepage never 500s on a metadata read). */
async function metaEntities(args: {
  toolSlug?: string;
  postSlug?: string;
  categorySlug?: string;
  collectionSlug?: string;
  compareA?: string;
  compareB?: string;
}) {
  try {
    return await shadowMetaEntities(createServerConvexClient()!, args);
  } catch {
    return null;
  }
}

/**
 * The landing page — search & discovery for the AI tools directory. Hero +
 * categories + Editor's Picks + trending; everything else lives on dedicated
 * routes (/tools, /categories, /journal, /about, /submit).
 *
 * The metadata plumbing below serves the single-route deep links (?tool=,
 * ?post=, ?category=, ?compare=, ?collection=) — post-sandbox these become
 * real routes one-to-one.
 *
 * force-dynamic: the server-rendered sections read the CMS-managed site copy
 * (SiteSetting KV, Task 32), so editor saves must appear on the next request.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || null;

  const toolSlug = first(params.tool);
  const postSlug = first(params.post);
  const categorySlug = first(params.category);
  const collectionSlug = first(params.collection);
  const compareRaw = first(params.compare);
  const mineView = first(params.mine);

  // Phase 5: one Convex fetch for every deep-link branch (Prisma-shaped
  // adapters below; each branch still falls back to its Prisma lookup).
  const [cmpA, cmpB] = (compareRaw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const convexMeta = await metaEntities({
    toolSlug: toolSlug ?? undefined,
    postSlug: postSlug && !toolSlug ? postSlug : undefined,
    categorySlug: categorySlug ?? undefined,
    collectionSlug: collectionSlug ?? undefined,
    compareA: cmpA,
    compareB: cmpB,
  });

  // Journal deep link (?post=slug) — article-level unfurl metadata.
  if (postSlug && !toolSlug) {
    const cxPost = convexMeta?.post;
    const post =
      cxPost && cxPost.status === "published"
        ? {
            ...cxPost,
            publishedAt: cxPost.publishedAt
              ? new Date(cxPost.publishedAt)
              : null,
          }
        : null;
    if (post && post.status === "published") {
      const title = post.seoTitle || `${post.title} | Prother Journal`;
      const description = clamp(post.seoDescription || post.excerpt, 200);
      return {
        title,
        description,
        keywords: post.keywords
          ? post.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
        // The overlay serves homepage HTML — fold it into the real article.
        alternates: { canonical: `/journal/${post.slug}` },
        openGraph: {
          title,
          description,
          type: "article",
          publishedTime: post.publishedAt?.toISOString(),
          authors: [post.author],
          images: [
            {
              url: `/api/og?post=${encodeURIComponent(post.slug)}`,
              width: 1200,
              height: 630,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [`/api/og?post=${encodeURIComponent(post.slug)}`],
        },
      };
    }
    return {};
  }

  if (toolSlug) {
    const tool = convexMeta?.tool;
    if (tool) {
      const title = `${tool.name} · ${tool.tagline} | Prother`;
      const description = clamp(
        `${tool.category.name} · ${tool.pricingModel}. ${tool.description || tool.tagline}`,
        200,
      );
      return {
        title,
        description,
        // /tools/[slug] shipped (Task 25) — fold the legacy ?tool= deep link
        // into the real tool page's canonical URL.
        alternates: { canonical: `/tools/${encodeURIComponent(toolSlug)}` },
        openGraph: {
          title,
          description,
          type: "article",
          images: [
            {
              url: `/api/og?tool=${encodeURIComponent(toolSlug)}`,
              width: 1200,
              height: 630,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [`/api/og?tool=${encodeURIComponent(toolSlug)}`],
        },
      };
    }
    return {};
  }

  // Compare deep link (?compare=a,b) — "A vs B" head-to-head unfurl.
  if (compareRaw) {
    const [aSlug, bSlug] = compareRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (aSlug && bSlug) {
      const [a, b] = [convexMeta?.compareA, convexMeta?.compareB];
      if (a && b) {
        const title = `${a.name} vs ${b.name} · Compare AI tools | Prother`;
        const description = clamp(
          `Side-by-side comparison of ${a.name} (${a.tagline}) and ${b.name} (${b.tagline}): pricing, ratings, and features.`,
          200,
        );
        return {
          title,
          description,
          alternates: {
            canonical: `/?compare=${encodeURIComponent(compareRaw)}`,
          },
        };
      }
    }
    return {};
  }

  // Public collection deep link (?collection=slug).
  if (collectionSlug) {
    const cxCollection = convexMeta?.collection;
    const shaped = cxCollection
      ? {
          ...cxCollection,
          _count: { items: cxCollection.itemCount },
        }
      : null;
    if (shaped && shaped.isPublic) {
      const title = `${shaped.name} · Curated collection | Prother`;
      const description = clamp(
        `${shaped.description || `A curated collection of ${shaped._count.items} AI tools`}, hand-picked by ${shaped.ownerName} on Prother.`,
        200,
      );
      return {
        title,
        description,
        alternates: {
          canonical: `/?collection=${encodeURIComponent(collectionSlug)}`,
        },
      };
    }
    return {};
  }

  // Category browse deep link (?category=slug) — curated SEO intro copy.
  if (categorySlug) {
    const cxCategory = convexMeta?.category;
    const cat = cxCategory
      ? {
          ...cxCategory,
          _count: { tools: cxCategory.toolCount },
        }
      : null;
    if (cat) {
      const blurb = CATEGORY_BLURBS[cat.slug] ?? "";
      const title = `${cat.name} · AI tools, ranked | Prother`;
      const description = clamp(
        `${blurb} ${cat._count.tools} tools listed.`,
        200,
      );
      return {
        title,
        description,
        // Categories live at their real /categories/[slug] routes (Task 25).
        alternates: {
          canonical: `/categories/${encodeURIComponent(categorySlug)}`,
        },
      };
    }
    return {};
  }

  // Personal space (?mine=collections) — never indexed.
  if (mineView) {
    return {
      title: "My collections & follows | Prother",
      robots: { index: false },
      alternates: { canonical: "/" },
    };
  }

  // Default (incl. pure-UI overlays like ?saved=mine): fold query variants
  // into the clean homepage URL so crawlers never index duplicate shells.
  // NOTE: page-level alternates REPLACE the layout's (shallow merge), so the
  // default homepage branch re-advertises the main RSS feed itself.
  return {
    alternates: {
      canonical: "/",
      types: { "application/rss+xml": "/api/rss" },
    },
  };
}

// ── Server data for the two static sections ──────────────────────────────

/** Live listing count per category slug (statuses other than live don't count). */
async function liveCountByCategory(): Promise<Map<string, number>> {
  // Convex-only homepage bundle (empty grid rather than 500 on failure).
  try {
    const { counts } = await shadowHomepage(createServerConvexClient()!);
    return new Map(counts.map((c) => [c.slug, c.count]));
  } catch {
    return new Map(); // grid renders with 0 counts rather than 500ing
  }
}

/** Live tool count per tag, for the homepage intent cards. Empty on failure. */
async function liveCountByTag(): Promise<Record<string, number>> {
  try {
    const { tagCounts } = await shadowHomepage(createServerConvexClient()!);
    return (tagCounts ?? {}) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Up to 6 Editor's Picks — pinned first, then newest. */
async function getEditorsPicks() {
  // Convex-only homepage bundle (section hides on failure).
  try {
    const { picks } = await shadowHomepage(createServerConvexClient()!);
    return picks as Array<(typeof picks)[number] & { logoUrl?: string | null }>;
  } catch {
    return []; // section hides — the homepage never fails on a section query
  }
}

/** First sentence of a category blurb — the one-line hook on the grid card. */
function firstSentence(blurb: string): string {
  const m = blurb.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : blurb).trim();
}

// ── Sections (server-rendered) ───────────────────────────────────────────

/** Site copy KV & stats (CMS-managed frontend elements) — blanks fall back in-code. */
async function getSiteData() {
  // Convex-only site settings (empty map on failure — never fail the page).
  try {
    const res = await shadowSite(createServerConvexClient()!);
    return { settings: res.settings, stats: res.stats };
  } catch {
    return { settings: {}, stats: null }; // the page never fails on a settings read
  }
}

/** Black display heading with the last word of each line in ember.
 *  Pass accent={false} for supporting sections — the ember word is a brand
 *  moment reserved for the hero and closing band, not every H2 on the page. */
function AccentHeading({
  text,
  className,
  accent = true,
}: {
  text: string;
  className?: string;
  accent?: boolean;
}) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <h2 className={className}>
      {lines.map((line, li) => {
        const words = line.split(" ");
        const body = words.slice(0, -1).join(" ");
        const accentWord = words.at(-1) ?? "";
        return (
          <span key={li}>
            {li > 0 && <br />}
            {body ? `${body} ` : ""}
            {accent ? (
              <span className="text-ember">{accentWord}</span>
            ) : (
              accentWord
            )}
          </span>
        );
      })}
    </h2>
  );
}

function EngineeringStandards() {
  return (
    <section
      aria-label="Core Standards"
      className="border-y border-white/[0.08] bg-white/[0.015] py-12"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group relative border-l-2 border-ember/60 pl-4 sm:pl-5">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-ember uppercase">
              <span>01 / INTEGRITY</span>
            </div>
            <h2 className="mt-2 text-base font-bold text-white">
              Zero Pay-to-Play Rankings
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65 text-pretty">
              No sponsored top slots, launch-day manipulation, or affiliate
              bias. Placements reflect genuine developer adoption, utility, and
              verified reviews.
            </p>
          </div>

          <div className="group relative border-l-2 border-white/20 pl-4 transition-colors group-hover:border-ember sm:pl-5">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-white/60 uppercase">
              <span>02 / TELEMETRY</span>
            </div>
            <h2 className="mt-2 text-base font-bold text-white">
              Production-Ready Specs
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65 text-pretty">
              Inspect context window sizes, API throughput, self-hosting
              requirements, and honest pricing tiers before introducing
              dependencies to your codebase.
            </p>
          </div>

          <div className="group relative border-l-2 border-white/20 pl-4 transition-colors group-hover:border-ember sm:pl-5">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-white/60 uppercase">
              <span>03 / VERIFICATION</span>
            </div>
            <h2 className="mt-2 text-base font-bold text-white">
              Specs You Can Check
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65 text-pretty">
              Every listing states its pricing model, context window, API
              access, and self-hosting path, with the date we last checked them.
              No AI-written blurbs and no scraped imports — if a spec is wrong,
              the maker can claim the listing and fix it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryGrid({
  counts,
  copy,
}: {
  counts: Map<string, number>;
  copy: Record<string, string>;
}) {
  return (
    <section id="directory" className="bg-ink py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
              TAXONOMY & DIRECTORY
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl text-balance">
              {copy["home.categoriesHeading"] ||
                "Browse by architecture & domain."}
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/60 text-pretty">
            Eight specialized intelligence domains indexed with verified specs,
            API access, and community ratings.
          </p>
        </div>

        {/* Architectural Workbench Grid (Replacing generic floating rounded cards) */}
        <div className="mt-10 overflow-hidden rounded-xl border border-white/10 bg-white/10">
          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c, idx) => {
              const count = counts.get(c.slug) ?? 0;
              const indexStr = String(idx + 1).padStart(2, "0");
              return (
                <Link
                  key={c.slug}
                  href={`/categories/${c.slug}`}
                  className="group relative flex flex-col justify-between bg-ink p-6 transition-all duration-150 hover:bg-white/[0.035]"
                >
                  <div>
                    {/* Index header */}
                    <div className="flex items-center justify-between font-mono text-xs text-white/50">
                      <span className="font-semibold text-ember group-hover:text-ember-hot">
                        {indexStr}
                      </span>
                      <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium tracking-wider text-white/70 tabular-nums uppercase group-hover:bg-ember/15 group-hover:text-ember">
                        {count} tools
                      </span>
                    </div>

                    {/* Category Title */}
                    <h3 className="mt-4 flex items-center justify-between text-base font-bold text-white transition-colors group-hover:text-ember">
                      <span>{c.name}</span>
                      <span
                        aria-hidden
                        className="font-mono text-xs text-white/55 transition-transform group-hover:translate-x-0.5 group-hover:text-ember"
                      >
                        →
                      </span>
                    </h3>

                    {/* Crisp blurb */}
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/55 text-pretty">
                      {firstSentence(CATEGORY_BLURBS[c.slug] ?? "")}
                    </p>
                  </div>

                  {/* Bottom hairline accent */}
                  <div className="mt-6 border-t border-white/[0.06] pt-3">
                    <span className="font-mono text-[11px] font-medium tracking-wider text-white/60 uppercase group-hover:text-white/80">
                      View Domain Index
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function EditorsPicks({
  picks,
  copy,
}: {
  picks: {
    slug: string;
    name: string;
    tagline: string;
    logoEmoji: string;
    logoGradient: string;
    logoUrl?: string | null;
    pricingModel: string;
    category: { slug: string; name: string; emoji: string };
  }[];
  copy: Record<string, string>;
}) {
  if (picks.length === 0) return null;
  return (
    <section
      id="picks"
      className="border-t border-white/[0.08] bg-ink py-20 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
              <span>★</span>
              <span>EDITOR&apos;S PICKS</span>
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl text-balance">
              {copy["home.picksHeading"] || "Six tools worth your time."}
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/60 text-pretty">
            A small, deliberate set. Pricing models, API access, and specs are
            listed on every page and dated — check them before you commit.
          </p>
        </div>

        {/* Precision Editorial Benchmark Matrix */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((p) => {
            const pricingClean = p.pricingModel
              .replace(/_/g, " ")
              .toUpperCase();
            return (
              <Link
                key={p.slug}
                href={`/tools/${p.slug}`}
                className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-200 hover:border-ember/50 hover:bg-white/[0.045] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div>
                  {/* Top Bar: Logo + Name + Pricing Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ToolLogo
                        slug={p.slug}
                        name={p.name}
                        logoUrl={p.logoUrl}
                        emoji={p.logoEmoji}
                        gradient={p.logoGradient}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-white transition-colors group-hover:text-ember">
                          {p.name}
                        </h3>
                        <p className="truncate font-mono text-[11px] text-white/45">
                          {p.category.name}
                        </p>
                      </div>
                    </div>

                    {/* shrink-0 + nowrap: "OPEN SOURCE" is the longest label
                        and was wrapping to two lines once the name beside it
                        grew. The name truncates instead — the price is the
                        scannable part and must never wrap. */}
                    <span className="shrink-0 whitespace-nowrap rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-white/80 uppercase">
                      {pricingClean}
                    </span>
                  </div>

                  {/* Spec Tagline */}
                  <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-white/65 text-pretty">
                    {p.tagline}
                  </p>
                </div>

                {/* Footer spec bar */}
                <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="font-mono text-[11px] text-white/50">
                    Specs &amp; pricing
                  </span>
                  <span className="font-mono text-xs text-white/60 transition-colors group-hover:text-ember">
                    Inspect Tool →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ClosingBand({ copy }: { copy: Record<string, string> }) {
  return (
    <section id="submit" className="border-t border-white/[0.08] bg-ink py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
          COMMUNITY INDEX
        </p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl text-balance">
          {copy["home.closingHeadline"] ||
            "Building an AI tool for production?"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/65 text-pretty">
          {copy["home.closingSub"] ||
            "Submit your tool for an independent technical audit. Submissions are free forever and reviewed by human engineers."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <SubmitOpenButton
            label="Submit Your Tool for Review"
            className="h-11 px-6 text-sm font-semibold"
          />
          <Link
            href="/tools"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-6 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
          >
            Browse Full Directory
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Homepage entity graph: WebSite + Organization (brand identity for the
 *  knowledge panel). The SearchAction is honest since Task 25: /tools?q=…
 *  renders scored results server-side. */
export default async function Page() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: `${base}/`,
        name: "Prother",
        description:
          "Search and discovery for AI products and tools: a curated directory with honest pricing, reviews, and side-by-side comparisons.",
        publisher: { "@id": `${base}/#organization` },
        inLanguage: "en",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${base}/tools?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        url: `${base}/`,
        name: "Prother",
        logo: {
          "@type": "ImageObject",
          url: `${base}/api/og`,
          width: 1200,
          height: 630,
        },
        description:
          "Prother is a curated search and discovery directory for AI products and tools.",
      },
    ],
  };

  const [counts, picks, siteData, tagCounts] = await Promise.all([
    liveCountByCategory(),
    getEditorsPicks(),
    getSiteData(),
    liveCountByTag(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero initialStats={siteData.stats} initialSettings={siteData.settings} />
      <IntentPath counts={tagCounts} />
      <EngineeringStandards />
      <CategoryTicker />
      <CategoryGrid counts={counts} copy={siteData.settings} />
      <EditorsPicks picks={picks} copy={siteData.settings} />
      <TrendingStrip />
      <ClosingBand copy={siteData.settings} />
    </>
  );
}
