import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  MessagesSquare,
  Star,
  X,
} from "lucide-react";
import { clamp } from "@/lib/og";
import { blurbFor } from "@/lib/category-blurbs";
import { resolveAlternatives } from "@/lib/tool-editorial";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ToolDetailActions } from "@/components/prother/tool-detail-actions";
import { AboutClamp } from "@/components/prother/about-clamp";
import { createServerConvexClient } from "@/lib/convex";
import { shadowToolPageData } from "@/lib/data";

/**
 * /tools/[slug] — the real, crawlable tool detail page (Task 25).
 *
 * Server-rendered from the ORM: header, badges, pricing/maker/listing meta,
 * description, tags, links, published reviews (with the shared reviewStats
 * aggregate), forum mentions and related tools. The only client island is
 * <ToolDetailActions /> (save / compare / share / report) — everything else
 * is static HTML so search engines see the full listing.
 *
 * Task 35-c editorial enrichment: long about copy, pricing facts panel,
 * use cases, pros/cons, alternatives, category context and the pricing
 * fact-check badge all render progressively. A section exists only when its
 * content does, so listings without editorial data look exactly as before.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

// ── Formatting helpers (server-only, deterministic UTC — hydration-safe) ─

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function utcDateLabel(v: Date | string): string {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Mar 2026" — the Listed-date format. */
function utcMonthYear(v: Date | string): string {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

function pricingLine(model: string, price: string | null): string {
  const label = PRICING_LABEL[model] ?? "Free";
  if ((model === "paid" || model === "freemium") && price) {
    return `${label} · from ${price}`;
  }
  return label;
}

/** Mono chip shared by badges / tags / ratings. */
function chipCx(extra?: string): string {
  return cn(
    "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs tracking-wider uppercase",
    extra
  );
}

const SECTION_HEAD = "font-mono text-xs uppercase tracking-[0.25em] text-white/60";

// ── Convex-only SSR bundle (Prisma-shaped for untouched render code):
// tags re-joined to the pipe string, Date-expected fields rebuilt as Dates,
// media/editorial Maps keyed by tool id.

type ConvexBundle = {
  tool: {
    id: string;
    slug: string;
    status: string;
    name: string;
    tagline: string;
    description: string | null;
    websiteUrl: string;
    logoEmoji: string;
    logoGradient: string;
    pricingModel: string;
    startingPrice: string | null;
    pricingNote: string | null;
    tags: string;
    makerHandle: string;
    track: string;
    editorsPick: boolean;
    curated: boolean;
    claimed: boolean;
    hasApi: boolean;
    githubUrl: string | null;
    docsUrl: string | null;
    twitterUrl: string | null;
    categoryId: string;
    createdAt: Date;
    category: { slug: string; name: string; emoji: string };
  };
  stats: { count: number; aggregate: import("@/lib/community").ReviewAggregate | null };
  reviews: {
    id: string;
    author: string;
    ease: number;
    power: number;
    value: number;
    body: string;
    createdAt: string;
  }[];
  threads: { slug: string; title: string; author: string; createdAt: string }[];
  relatedRows: {
    slug: string;
    name: string;
    logoEmoji: string;
    logoGradient: string;
    tagline: string;
    editorsPick: boolean;
  }[];
  mediaMap: Map<string, { logoUrl: string | null; screenshotUrls: string[] }>;
  editorialMap: Map<
    string,
    {
      longDescription: string | null;
      useCases: { title: string; body: string }[];
      pros: string[];
      cons: string[];
      alternativeSlugs: string[];
      pricingCheckedAt: Date | null;
      contentUpdatedAt: Date | null;
    }
  >;
  categoryToolCount: number;
  alternatives: import("@/lib/tool-editorial").AlternativeRow[];
};

async function getConvexBundle(slug: string): Promise<ConvexBundle | null> {
  // Convex-only (tool detail cutover): null surfaces as notFound downstream.
  try {
    const res = await shadowToolPageData(createServerConvexClient()!, slug);
    if ("error" in res) return null;
    const isoOrNull = (v: string | null): Date | null =>
      v ? new Date(v) : null;
    return {
      tool: {
        ...res.tool,
        tags: res.tool.tags.join("|"),
        createdAt: new Date(res.tool.createdAt),
      },
      stats: res.stats,
      reviews: res.reviews,
      threads: res.threads,
      relatedRows: res.related,
      mediaMap: new Map([
        [
          res.tool.id,
          { logoUrl: res.logoUrl, screenshotUrls: res.screenshots },
        ],
      ]),
      editorialMap: new Map([
        [
          res.tool.id,
          {
            longDescription: res.editorial.longDescription,
            useCases: res.editorial.useCases,
            pros: res.editorial.pros,
            cons: res.editorial.cons,
            alternativeSlugs: res.editorial.alternativeSlugs,
            pricingCheckedAt: isoOrNull(res.editorial.pricingCheckedAt),
            contentUpdatedAt: isoOrNull(res.editorial.contentUpdatedAt),
          },
        ],
      ]),
      categoryToolCount: res.categoryToolCount,
      alternatives: res.alternatives,
    };
  } catch {
    return null;
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getConvexBundle(slug);
  const tool = bundle?.tool;
  // Unknown slug or removed/unlisted tool → 404 covers the meta too.
  if (!tool || tool.status !== "live") notFound();

  const title = `${tool.name} · ${tool.tagline} | Prother`;
  const description = clamp(
    `Listed on Prother · ${tool.category.name} · ${pricingLine(tool.pricingModel, tool.startingPrice)}. ${tool.description || tool.tagline}`,
    200,
  );
  const keywords = tool.tags
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: { canonical: `/tools/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Prother",
      images: [
        { url: `/api/og?tool=${encodeURIComponent(slug)}`, width: 1200, height: 630 },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?tool=${encodeURIComponent(slug)}`],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function ToolPage({ params }: Params) {
  const { slug } = await params;
  const bundle = await getConvexBundle(slug);
  if (!bundle || !bundle.tool || bundle.tool.status !== "live") notFound();
  const tool = bundle.tool;
  const name = tool.name;

  // ── Full live listing — everything below is server-rendered ────────────
  const [stats, reviews, threads, relatedRows, mediaMap, editorialMap, categoryToolCount] =
    [
      bundle.stats,
      bundle.reviews,
      bundle.threads,
      bundle.relatedRows,
      bundle.mediaMap,
      bundle.editorialMap,
      bundle.categoryToolCount,
    ];

  const logoUrl = mediaMap.get(tool.id)?.logoUrl ?? null;
  const screenshots = mediaMap.get(tool.id)?.screenshotUrls ?? [];

  // Editorial enrichment (Task 35-c). editorialByToolIds always maps every
  // requested id, so this only falls back defensively.
  const editorial =
    editorialMap.get(tool.id) ?? {
      longDescription: null,
      useCases: [],
      pros: [],
      cons: [],
      alternativeSlugs: [],
      pricingCheckedAt: null,
      contentUpdatedAt: null,
    };
  // Alternatives arrive resolved in the Convex bundle; the Prisma path
  // below only runs when editors listed slugs the bundle didn't resolve
  // (defensive — normally bundle.alternatives covers it).
  const alternatives =
    bundle.alternatives.length > 0
      ? bundle.alternatives
      : editorial.alternativeSlugs.length
        ? await resolveAlternatives(editorial.alternativeSlugs, tool.slug)
        : [];

  const longParagraphs = (editorial.longDescription ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const aggregate = stats.aggregate;
  const related = relatedRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    emoji: r.logoEmoji,
    gradient: r.logoGradient,
    tagline: r.tagline,
    editorsPick: r.editorsPick,
  }));
  const tags = tool.tags.split("|").map((t) => t.trim()).filter(Boolean);

  // JSON-LD — SoftwareApplication. aggregateRating appears ONLY when the
  // real aggregate exists (≥3 published reviews); ratings are never faked.
  const priceMatch = (tool.startingPrice ?? "").match(/(\d+(?:\.\d+)?)/);
  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description: tool.description || tool.tagline,
    applicationCategory: tool.category.name,
    operatingSystem: "Web",
    url: `${SITE_BASE}/tools/${tool.slug}`,
    offers: {
      "@type": "Offer",
      // Paid pricing carries the parsed starting price; every other model
      // maps to "0" (free / freemium entry / open source).
      price: tool.pricingModel === "paid" && priceMatch ? priceMatch[1] : "0",
      priceCurrency: "USD",
    },
    ...(editorial.contentUpdatedAt
      ? { dateModified: editorial.contentUpdatedAt.toISOString() }
      : {}),
    author: { "@type": "Organization", name: "Prother" },
    publisher: { "@type": "Organization", name: "Prother" },
    ...(aggregate
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: aggregate.overall,
            ratingCount: aggregate.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <div className="bg-ink pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />

      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
        <Breadcrumbs
          trail={[
            { name: "Home", href: "/" },
            { name: "AI tools", href: "/tools" },
            { name },
          ]}
        />

        <article className="mt-8 space-y-12">
          {/* a. Header */}
          <header className="space-y-5">
            <div className="flex items-start gap-4 sm:gap-5">
              <span
                aria-hidden={!logoUrl}
                className={cn(
                  "grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br text-4xl shadow-xl sm:size-20",
                  tool.logoGradient
                )}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${name} logo`}
                    className="size-full object-contain"
                  />
                ) : (
                  <span aria-hidden>{tool.logoEmoji}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {name}
                </h1>
                <p className="mt-1 text-base text-white/65 sm:text-lg">{tool.tagline}</p>
              </div>
            </div>

            {/* Badge chips — mirror tool-full-page.tsx */}
            <ul className="flex flex-wrap items-center gap-1.5" aria-label="Badges">
              {tool.editorsPick && (
                <li className={chipCx("border-ember/30 bg-ember/15 text-ember")}>
                  <Star className="size-3" aria-hidden /> Editors pick
                </li>
              )}
              {tool.curated && (
                <li className={chipCx("border-yellow-500/30 bg-yellow-500/10 text-yellow-500")}>
                  Curated
                </li>
              )}
              {!tool.claimed && <li className={chipCx("text-white/60")}>Unclaimed</li>}
              {tool.hasApi && <li className={chipCx("text-white/60")}>API ✓</li>}
              {tool.pricingModel === "open_source" && (
                <li className={chipCx("text-white/60")}>Open source</li>
              )}
              <li className={chipCx("text-white/60")}>
                {tool.track === "community" ? "Submitted" : "Seed"}
              </li>
            </ul>

            {/* Mono meta line: pricing · maker · listed date (UTC, static) */}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-wider text-white/60">
              <span title={tool.pricingNote ?? undefined} className="text-ember">
                {pricingLine(tool.pricingModel, tool.startingPrice)}
              </span>
              {editorial.pricingCheckedAt && (
                <span
                  title="Pricing verified by the editors on this date"
                  className="inline-flex items-center gap-1 text-mint"
                >
                  <CheckCircle2 className="size-3" aria-hidden />
                  Pricing checked {utcMonthYear(editorial.pricingCheckedAt)}
                </span>
              )}
              <span aria-hidden className="text-white/55">
                ·
              </span>
              <span>{tool.makerHandle}</span>
              <span aria-hidden className="text-white/55">
                ·
              </span>
              <span>Listed {utcMonthYear(tool.createdAt)}</span>
              <span aria-hidden className="text-white/55">
                ·
              </span>
              <span>Updated {utcDateLabel(editorial.contentUpdatedAt ?? tool.createdAt)}</span>
            </p>

            {/* Category chip + rating — a real link to the crawlable category page */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/categories/${tool.category.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-sm tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
              >
                <span aria-hidden>{tool.category.emoji}</span>
                {tool.category.name}
              </Link>
              {aggregate ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 font-mono text-xs tracking-wider text-ember uppercase">
                  <Star className="size-2.5 fill-current" aria-hidden />
                  {aggregate.overall}/5 · {aggregate.count} reviews
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs tracking-wider text-white/50 uppercase">
                  {stats.count} reviews
                </span>
              )}
            </div>

            {/* Interactive actions (client island) */}
            <ToolDetailActions
              slug={tool.slug}
              name={name}
              websiteUrl={tool.websiteUrl}
            />
          </header>

          {/* b. About — the editors' long description wins when present,
              split into real paragraphs for crawlers; the short listing copy
              (with its Read more clamp) remains the fallback. */}
          {(longParagraphs.length > 0 || tool.description) && (
            <section aria-label={`About ${name}`} className="space-y-3">
              <h2 className={SECTION_HEAD}>About {name}</h2>
              {longParagraphs.length > 0 ? (
                <div className="space-y-4">
                  {longParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className="text-[15px] leading-relaxed whitespace-pre-line text-white/80 sm:text-base"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <AboutClamp text={tool.description ?? ""} />
              )}
            </section>
          )}

          {/* b1. Pricing (Task 35-c) — compact facts panel; renders whenever
              the listing carries a model, a price or an editor note. */}
          {(tool.pricingModel || tool.startingPrice || tool.pricingNote) && (
            <section aria-label={`Pricing for ${name}`} className="space-y-3">
              <h2 className={SECTION_HEAD}>Pricing</h2>
              <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-semibold uppercase tracking-wider text-white/85">
                    {PRICING_LABEL[tool.pricingModel] ?? "Free"}
                  </span>
                  {tool.startingPrice && (
                    <span className="text-2xl font-black tracking-tight text-white">
                      {tool.startingPrice}
                    </span>
                  )}
                </div>
                {tool.pricingNote && (
                  <p className="text-sm leading-relaxed text-white/60">{tool.pricingNote}</p>
                )}
                {editorial.pricingCheckedAt && (
                  <p
                    title="Pricing verified by the editors on this date"
                    className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-mint"
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Pricing checked {utcMonthYear(editorial.pricingCheckedAt)}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* b2. Screenshots (Task 35-c layout) — crawlable link grid; each
              shot opens full size in a new tab. */}
          {screenshots.length > 0 && (
            <section aria-label={`Screenshots of ${name}`} className="space-y-3">
              <h2 className={SECTION_HEAD}>Screenshots</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {screenshots.map((src, i) => (
                  <a
                    key={`${src}-${i}`}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open screenshot in a new tab"
                    className="group block"
                  >
                    <img
                      src={src}
                      alt={`${name} screenshot ${i + 1}`}
                      loading="lazy"
                      className="aspect-video w-full rounded-lg border border-white/10 object-cover transition-colors group-hover:border-ember/40"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* b3. Use cases (Task 35-c) — editor-written, mono-indexed rows. */}
          {editorial.useCases.length > 0 && (
            <section aria-label={`Use cases for ${name}`} className="space-y-3">
              <h2 className={SECTION_HEAD}>Use cases</h2>
              <ol className="space-y-3">
                {editorial.useCases.map((u, i) => (
                  <li
                    key={`${u.title}-${i}`}
                    className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <span
                      aria-hidden
                      className="pt-0.5 font-mono text-xs font-semibold tracking-wider text-ember"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-white/90">{u.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-white/60">{u.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* b4. Pros and cons (Task 35-c) — side-by-side verdict panels. */}
          {(editorial.pros.length > 0 || editorial.cons.length > 0) && (
            <section aria-label={`Pros and cons of ${name}`} className="space-y-3">
              <h2 className={SECTION_HEAD}>Pros and cons</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {editorial.pros.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-mint">
                      Pros
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {editorial.pros.map((pro, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-white/75"
                        >
                          <Check className="mt-0.5 size-3.5 shrink-0 text-mint" aria-hidden />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {editorial.cons.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ember">
                      Cons
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {editorial.cons.map((con, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-white/75"
                        >
                          <X className="mt-0.5 size-3.5 shrink-0 text-ember" aria-hidden />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* c. Tags */}
          {tags.length > 0 && (
            <section aria-label="Tags" className="space-y-3">
              <h2 className={SECTION_HEAD}>Tags</h2>
              <ul className="flex flex-wrap items-center gap-1.5">
                {tags.map((t) => (
                  <li key={t} className={chipCx("text-white/50")}>
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* d. Links */}
          <section aria-label="Links" className="space-y-3">
            <h2 className={SECTION_HEAD}>Links</h2>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={tool.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-ember transition-colors hover:bg-ember/20"
              >
                Visit website
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
              {tool.githubUrl && (
                <a
                  href={tool.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-sm tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
                >
                  GitHub
                  <ArrowUpRight className="size-3" aria-hidden />
                </a>
              )}
              {tool.docsUrl && (
                <a
                  href={tool.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-sm tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
                >
                  Docs
                  <ArrowUpRight className="size-3" aria-hidden />
                </a>
              )}
              {tool.twitterUrl && (
                <a
                  href={tool.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-sm tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
                >
                  Twitter
                  <ArrowUpRight className="size-3" aria-hidden />
                </a>
              )}
            </div>
          </section>

          {/* e. Reviews (F-16) — server-rendered; aggregate unlocks at ≥3 */}
          <section aria-label="Reviews" className="space-y-4">
            <h2 className={SECTION_HEAD}>Reviews</h2>

            {aggregate && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <span className="text-2xl font-black tabular-nums text-ember">
                  {aggregate.overall}
                  <span className="text-sm text-white/55">/5</span>
                </span>
                <span className="font-mono text-xs tracking-wider text-white/60 uppercase">
                  {aggregate.count} verified reviews
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className={chipCx("text-white/60")}>Ease {aggregate.ease}/5</span>
                  <span className={chipCx("text-white/60")}>Power {aggregate.power}/5</span>
                  <span className={chipCx("text-white/60")}>Value {aggregate.value}/5</span>
                </span>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/50">
                No reviews yet. Be the first after you&apos;ve tried it.
              </p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-xs font-semibold tracking-wider text-ember">
                        {r.author}
                      </span>
                      <span aria-hidden className="text-white/55">
                        ·
                      </span>
                      <span className="font-mono text-xs tracking-wider text-white/55 uppercase">
                        {utcDateLabel(r.createdAt)}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className={chipCx("text-white/55")}>Ease {r.ease}/5</span>
                        <span className={chipCx("text-white/55")}>Power {r.power}/5</span>
                        <span className={chipCx("text-white/55")}>Value {r.value}/5</span>
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-white/75">
                      {r.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* f. Discussion — forum threads mentioning this tool */}
          <section aria-label="Discussion" className="space-y-3">
            <h2 className={SECTION_HEAD}>Discussion</h2>
            {threads.length > 0 && (
              <ul className="space-y-2">
                {threads.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/forums/${t.slug}`}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-ember/40 hover:bg-ember/[0.04]"
                    >
                      <MessagesSquare
                        className="size-4 shrink-0 text-white/55 transition-colors group-hover:text-ember"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white/85 transition-colors group-hover:text-ember">
                          {t.title}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs tracking-wider text-white/55 uppercase">
                          {t.author} · {utcDateLabel(t.createdAt)}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/forums"
              className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold uppercase tracking-wider text-ember transition-colors hover:text-ember-hot"
            >
              Start a discussion
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </section>

          {/* g2. Alternatives (Task 35-c) — editor-picked rivals resolved to
              live listings only (unknown slugs are skipped by the helper). */}
          {alternatives.length > 0 && (
            <section aria-label={`Alternatives to ${name}`} className="space-y-3">
              <h2 className={SECTION_HEAD}>Alternatives</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {alternatives.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/tools/${a.slug}`}
                    aria-label={`Open ${a.name}: ${a.tagline}`}
                    className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-ember/40 hover:bg-ember/[0.04]"
                  >
                    <span
                      aria-hidden={!a.logoUrl}
                      className={cn(
                        "grid size-10 place-items-center overflow-hidden rounded-lg bg-gradient-to-br text-lg",
                        a.logoGradient
                      )}
                    >
                      {a.logoUrl ? (
                        <img
                          src={a.logoUrl}
                          alt={`${a.name} logo`}
                          className="size-full object-contain"
                        />
                      ) : (
                        <span aria-hidden>{a.logoEmoji}</span>
                      )}
                    </span>
                    <span className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-white/90 transition-colors group-hover:text-ember">
                        {a.name}
                      </span>
                      {a.editorsPick && (
                        <span
                          aria-label="Editor's Pick"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-xs tracking-wider text-ember uppercase"
                        >
                          <Star className="size-2.5 fill-current" aria-hidden />
                          Pick
                        </span>
                      )}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-snug text-white/60">
                      {a.tagline}
                    </span>
                    <span className="mt-2.5 block">
                      <span className={chipCx("text-white/55")}>
                        {PRICING_LABEL[a.pricingModel] ?? a.pricingModel}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* g. Category context (Task 35-c panel) + More like this — the
              panel carries the crawlable category intro and live listing
              count; the sibling grid below stays the one "more in" surface,
              so no duplicate chip list of the same tools is rendered. */}
          <section aria-label={`More in ${tool.category.name}`} className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/categories/${tool.category.slug}`}
                  className="inline-flex items-center gap-1.5 font-mono text-sm tracking-wider text-white/85 uppercase transition-colors hover:text-ember"
                >
                  <span aria-hidden>{tool.category.emoji}</span>
                  {tool.category.name}
                </Link>
                <span className={chipCx("text-white/55")}>{categoryToolCount} tools</span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/60">
                {blurbFor(tool.category.slug, tool.category.name)}
              </p>
            </div>
            {related.length > 0 && (
              <div className="space-y-3">
                <h2 className={SECTION_HEAD}>More like this</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/tools/${r.slug}`}
                      aria-label={`Open ${r.name}: ${r.tagline}`}
                      className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-ember/40 hover:bg-ember/[0.04]"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-10 place-items-center rounded-lg bg-gradient-to-br text-lg",
                          r.gradient
                        )}
                      >
                        {r.emoji}
                      </span>
                      <span className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-white/90 transition-colors group-hover:text-ember">
                          {r.name}
                        </span>
                        {r.editorsPick && (
                          <span
                            aria-label="Editor's Pick"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-xs tracking-wider text-ember uppercase"
                          >
                            <Star className="size-2.5 fill-current" aria-hidden />
                            Pick
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-snug text-white/60">
                        {r.tagline}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </article>

        {/* Back to the directory — crawlable path Home → /tools → tool */}
        <p className="mt-14 border-t border-white/10 pt-6">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 font-mono text-sm tracking-[0.2em] text-white/60 uppercase transition-colors hover:text-ember"
          >
            <Check className="size-3.5" aria-hidden />
            Browse all AI tools on Prother
          </Link>
        </p>
      </div>
    </div>
  );
}
