import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/prother/hero";
import { CategoryTicker } from "@/components/prother/category-ticker";
import { TrendingStrip } from "@/components/prother/trending-strip";
import { SubmitOpenButton } from "@/components/prother/submit-open-button";
import { CATEGORIES } from "@/components/prother/categories";
import { db } from "@/lib/prother";
import { clamp } from "@/lib/og";
import { CATEGORY_BLURBS } from "@/lib/category-blurbs";

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

  // Journal deep link (?post=slug) — article-level unfurl metadata.
  if (postSlug && !toolSlug) {
    const post = await db.post.findUnique({ where: { slug: postSlug } });
    if (post && post.status === "published") {
      const title = post.seoTitle || `${post.title} | Prother Journal`;
      const description = clamp(post.seoDescription || post.excerpt, 200);
      return {
        title,
        description,
        keywords: post.keywords
          ? post.keywords.split(",").map((k) => k.trim()).filter(Boolean)
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
            { url: `/api/og?post=${encodeURIComponent(post.slug)}`, width: 1200, height: 630 },
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
    const tool = await db.tool.findUnique({
      where: { slug: toolSlug },
      // Explicit select — full-row Tool reads break on a stale pre-v6 cached
      // PrismaClient (it still SELECTs the dropped relaunch columns).
      select: {
        slug: true,
        name: true,
        tagline: true,
        description: true,
        pricingModel: true,
        category: { select: { name: true } },
      },
    });
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
            { url: `/api/og?tool=${encodeURIComponent(toolSlug)}`, width: 1200, height: 630 },
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
    const [aSlug, bSlug] = compareRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (aSlug && bSlug) {
      const [a, b] = await Promise.all([
        db.tool.findUnique({ where: { slug: aSlug }, select: { name: true, tagline: true } }),
        db.tool.findUnique({ where: { slug: bSlug }, select: { name: true, tagline: true } }),
      ]);
      if (a && b) {
        const title = `${a.name} vs ${b.name} · Compare AI tools | Prother`;
        const description = clamp(
          `Side-by-side comparison of ${a.name} (${a.tagline}) and ${b.name} (${b.tagline}): pricing, ratings, and features.`,
          200,
        );
        return { title, description, alternates: { canonical: `/?compare=${encodeURIComponent(compareRaw)}` } };
      }
    }
    return {};
  }

  // Public collection deep link (?collection=slug).
  if (collectionSlug) {
    const c = await db.collection.findUnique({
      where: { slug: collectionSlug },
      include: { _count: { select: { items: true } } },
    });
    if (c && c.isPublic) {
      const title = `${c.name} · Curated collection | Prother`;
      const description = clamp(
        `${c.description || `A curated collection of ${c._count.items} AI tools`}, hand-picked by ${c.ownerName} on Prother.`,
        200,
      );
      return {
        title,
        description,
        alternates: { canonical: `/?collection=${encodeURIComponent(collectionSlug)}` },
      };
    }
    return {};
  }

  // Category browse deep link (?category=slug) — curated SEO intro copy.
  if (categorySlug) {
    const cat = await db.category.findUnique({
      where: { slug: categorySlug },
      include: { _count: { select: { tools: true } } },
    });
    if (cat) {
      const blurb = CATEGORY_BLURBS[cat.slug] ?? "";
      const title = `${cat.name} · AI tools, ranked | Prother`;
      const description = clamp(`${blurb} ${cat._count.tools} tools listed.`, 200);
      return {
        title,
        description,
        // Categories live at their real /categories/[slug] routes (Task 25).
        alternates: { canonical: `/categories/${encodeURIComponent(categorySlug)}` },
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
  try {
    const [cats, live] = await Promise.all([
      db.category.findMany({ select: { id: true, slug: true } }),
      db.tool.findMany({ where: { status: "live" }, select: { categoryId: true } }),
    ]);
    const slugById = new Map(cats.map((c) => [c.id, c.slug]));
    const out = new Map<string, number>();
    for (const t of live) {
      const slug = slugById.get(t.categoryId);
      if (slug) out.set(slug, (out.get(slug) ?? 0) + 1);
    }
    return out;
  } catch {
    return new Map(); // grid renders with 0 counts rather than 500ing
  }
}

/** Up to 6 Editor's Picks — pinned first, then newest. */
async function getEditorsPicks() {
  try {
    return await db.tool.findMany({
      where: { status: "live", editorsPick: true },
      select: {
        slug: true,
        name: true,
        tagline: true,
        logoEmoji: true,
        logoGradient: true,
        pricingModel: true,
        category: { select: { slug: true, name: true, emoji: true } },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 6,
    });
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

/** Site copy KV (CMS-managed frontend elements) — blanks fall back in-code. */
async function getSiteCopy(): Promise<Record<string, string>> {
  try {
    const rows = await db.siteSetting.findMany({ select: { key: true, value: true } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {}; // the page never fails on a settings read
  }
}

/** Black display heading with the last word of each line in ember. */
function AccentHeading({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <h2 className={className}>
      {lines.map((line, li) => {
        const words = line.split(" ");
        const body = words.slice(0, -1).join(" ");
        const accent = words.at(-1) ?? "";
        return (
          <span key={li}>
            {li > 0 && <br />}
            {body ? `${body} ` : ""}
            <span className="text-ember">{accent}</span>
          </span>
        );
      })}
    </h2>
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
    <section id="categories" className="bg-ink py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-white/60">
          <span aria-hidden className="h-px w-6 bg-ember/70" />
          {copy["home.categoriesKicker"] || "Browse by category"}
        </p>
        <AccentHeading
          text={copy["home.categoriesHeading"] || "Find your category."}
          className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl"
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-ember/50"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  aria-hidden
                  className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-orange-700 text-2xl shadow-inner"
                >
                  {c.emoji}
                </span>
                <span className="font-mono text-xs uppercase tracking-wider text-white/60 group-hover:text-ember">
                  {counts.get(c.slug) ?? 0} tools
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-white transition-colors group-hover:text-ember">
                {c.name}
              </h3>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-white/50">
                {firstSentence(CATEGORY_BLURBS[c.slug] ?? "")}
              </p>
            </Link>
          ))}
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
    pricingModel: string;
    category: { slug: string; name: string; emoji: string };
  }[];
  copy: Record<string, string>;
}) {
  if (picks.length === 0) return null;
  return (
    <section id="picks" className="bg-ink py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-white/60">
          <span aria-hidden className="text-ember">★</span>
          {copy["home.picksKicker"] || "Editor's Picks"}
        </p>
        <AccentHeading
          text={copy["home.picksHeading"] || "Hand-tested by our editors."}
          className="mt-3 max-w-2xl text-5xl font-black tracking-tighter text-white md:text-6xl"
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((p) => (
            <Link
              key={p.slug}
              href={`/tools/${p.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-ember/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl shadow-inner ${p.logoGradient}`}
                >
                  {p.logoEmoji}
                </span>
                <span className="rounded-full border border-ember/40 bg-ember/10 px-2 py-0.5 font-mono text-xs uppercase tracking-[0.2em] text-ember">
                  Editor&apos;s Pick
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-white transition-colors group-hover:text-ember">
                {p.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-white/50">{p.tagline}</p>
              <p className="mt-3 font-mono text-xs uppercase tracking-wider text-white/60">
                {p.category.emoji} {p.category.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingBand({ copy }: { copy: Record<string, string> }) {
  return (
    <section id="submit" className="relative overflow-hidden bg-ink py-28">
      {/* Bottom ember glow */}
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-ember/20 blur-[100px]"
      />
      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <AccentHeading
          text={copy["home.closingHeadline"] || "Can't find the\ntool you need?"}
          className="text-6xl leading-[0.95] font-black tracking-tighter text-white md:text-7xl"
        />
        <p className="mt-4 text-white/60">
          {copy["home.closingSub"] || "Listings are free and reviewed by humans."}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <SubmitOpenButton label="Submit a tool" className="h-12 px-6 text-base" />
          <Link
            href="/tools"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-ember/40 bg-transparent px-6 text-base font-semibold text-ember transition-colors hover:bg-ember/10 hover:text-ember-hot"
          >
            Browse the directory
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

  const [counts, picks, copy] = await Promise.all([liveCountByCategory(), getEditorsPicks(), getSiteCopy()]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <CategoryTicker />
      <CategoryGrid counts={counts} copy={copy} />
      <EditorsPicks picks={picks} copy={copy} />
      <TrendingStrip />
      <ClosingBand copy={copy} />
    </>
  );
}
