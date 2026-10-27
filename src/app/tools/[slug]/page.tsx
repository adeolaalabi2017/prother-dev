import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Star,
  X,
} from "lucide-react";
import { clamp } from "@/lib/og";
import { blurbFor } from "@/lib/category-blurbs";
import { resolveAlternatives } from "@/lib/tool-editorial";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ToolDetailActions } from "@/components/prother/tool-detail-actions";
import { ToolInstallBox } from "@/components/prother/tool-install-box";
import { ToolReviewsSection } from "@/components/prother/tool-reviews-section";
import { ClaimListing } from "@/components/prother/claim-listing";
import { ToolBadgeEmbed } from "@/components/prother/tool-badge-embed";
import { createServerConvexClient } from "@/lib/convex";
import { shadowToolPageData } from "@/lib/data";
import { ToolLogo } from "@/components/prother/tool-logo";
import { getTopicBySlug } from "@/lib/topics";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { getGithubStats, formatCompact } from "@/lib/github";
import { getToolInstallInfo } from "@/lib/tool-install";
import { getGuidesForTool } from "@/lib/journal-relations";

/**
 * /tools/[slug] - OpenStore direction (Oct 2026).
 *
 * Server-rendered from Convex: hero, stats strip (with live GitHub stats),
 * screenshot hero, verdict card (Best for / User feedback with reviews
 * collapsed in a details element), About + Details grid, and More in
 * Category. Prother-only surfaces (claim, badge embed, compare, pricing
 * fact-check) are demoted to the Details rail so the reading flow matches
 * the reference: hero > proof > verdict > about > related.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function utcDateLabel(v: Date | string): string {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function utcMonthYear(v: Date | string): string {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function utcMonthDay(v: Date | string): string {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
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
    return `${label} - from ${price}`;
  }
  return label;
}

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
  stats: {
    count: number;
    aggregate: import("@/lib/community").ReviewAggregate | null;
  };
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
    logoUrl?: string | null;
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

const getConvexBundle = cache(
  async (slug: string): Promise<ConvexBundle | null> => {
    try {
      const resolved = slug === "claude-haiku-5-5" ? "haiku-5-5" : slug;
      const res = await shadowToolPageData(createServerConvexClient(), resolved);
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
  },
);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getConvexBundle(slug);
  const tool = bundle?.tool;
  if (!tool || tool.status !== "live") notFound();

  const title = `${tool.name} - ${tool.tagline} | Prother`;
  const description = clamp(
    `Listed on Prother - ${tool.category.name} - ${pricingLine(tool.pricingModel, tool.startingPrice)}. ${tool.description || tool.tagline}`,
    160,
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
        {
          url: `/api/og?tool=${encodeURIComponent(slug)}`,
          width: 1200,
          height: 630,
        },
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

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i <= Math.round(value)
              ? "fill-ember text-ember"
              : "text-white/30",
          )}
        />
      ))}
    </span>
  );
}

function StatCell({
  label,
  main,
  sub,
}: {
  label: string;
  main: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 first:pl-0 sm:first:pl-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] font-semibold text-white">{main}</p>
      {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 last:border-0">
      <dt className="shrink-0 text-[13px] text-white/50">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-white/90">{children}</dd>
    </div>
  );
}

export default async function ToolPage({ params }: Params) {
  const { slug } = await params;
  const bundle = await getConvexBundle(slug);
  if (!bundle || !bundle.tool || bundle.tool.status !== "live") notFound();
  const tool = bundle.tool;
  const name = tool.name;

  const [stats, reviews, mediaMap, editorialMap, categoryToolCount] = [
    bundle.stats,
    bundle.reviews,
    bundle.mediaMap,
    bundle.editorialMap,
    bundle.categoryToolCount,
  ];

  const logoUrl = mediaMap.get(tool.id)?.logoUrl ?? null;
  const screenshots = mediaMap.get(tool.id)?.screenshotUrls ?? [];

  const editorial = editorialMap.get(tool.id) ?? {
    longDescription: null,
    useCases: [],
    pros: [],
    cons: [],
    alternativeSlugs: [],
    pricingCheckedAt: null,
    contentUpdatedAt: null,
  };
  // The alternatives fallback and the GitHub stats fetch are independent of
  // each other once the bundle resolves, so they run concurrently instead
  // of adding their latencies.
  const needsAltFallback =
    bundle.alternatives.length === 0 && editorial.alternativeSlugs.length > 0;
  const [altFallback, github] = await Promise.all([
    needsAltFallback
      ? resolveAlternatives(editorial.alternativeSlugs, tool.slug).catch(
          () => [],
        )
      : Promise.resolve(bundle.alternatives),
    getGithubStats(tool.githubUrl),
  ]);
  const alternatives = needsAltFallback ? altFallback : bundle.alternatives;

  const longParagraphs = (editorial.longDescription ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const { articles: toolGuides, categoryGuide } = getGuidesForTool(
    tool.slug,
    tool.category?.slug,
  );

  const aggregate = stats.aggregate;
  const related = bundle.relatedRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    emoji: r.logoEmoji,
    gradient: r.logoGradient,
    tagline: r.tagline,
    editorsPick: r.editorsPick,
    logoUrl: r.logoUrl ?? null,
  }));
  const tags = tool.tags
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);

  const installInfo = getToolInstallInfo({
    slug: tool.slug,
    name,
    websiteUrl: tool.websiteUrl,
    githubUrl: tool.githubUrl,
  });

  const platformsMain =
    installInfo.deliveryType === "installable" ||
    installInfo.deliveryType === "desktop_app"
      ? "macOS - Windows - Linux"
      : installInfo.deliveryType === "cloud_api"
        ? "Web - API"
        : "Web";
  const platformsSub =
    installInfo.deliveryType === "installable"
      ? "Self-hosted or local"
      : installInfo.deliveryType === "desktop_app"
        ? "Native desktop app"
        : installInfo.deliveryType === "cloud_api"
          ? "Cloud API"
          : "Hosted app";
  const licenseLabel =
    github?.license ??
    (tool.pricingModel === "open_source" ? "Open Source" : null) ??
    (PRICING_LABEL[tool.pricingModel] ?? "Free");
  const lastActive = github?.pushedAt
    ? utcMonthDay(github.pushedAt)
    : utcMonthDay(editorial.contentUpdatedAt ?? tool.createdAt);
  const lastActiveSub = github?.pushedAt
    ? "Repository push date"
    : "Listing updated";

  const bestForTitle =
    editorial.useCases[0]?.title ?? editorial.pros[0] ?? tool.tagline;
  const bestForBody =
    editorial.useCases[0]?.body ??
    tool.description ??
    "An actively maintained listing. Verify the features you depend on before adopting.";
  const checklist =
    editorial.pros.length > 0
      ? editorial.pros.slice(0, 4)
      : editorial.useCases.slice(0, 3).map((u) => u.title);
  const issuesUrl = github?.issuesUrl ?? tool.githubUrl ?? tool.websiteUrl;

  const priceMatch = (tool.startingPrice ?? "").match(/(\d+(?:\.\d+)?)/);
  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description: tool.description || tool.tagline,
    applicationCategory: tool.category.name,
    operatingSystem:
      installInfo.deliveryType === "installable" ||
      installInfo.deliveryType === "desktop_app"
        ? "macOS, Windows, Linux"
        : "Web-based",
    url: `${SITE_BASE}/tools/${tool.slug}`,
    image: `${SITE_BASE}/api/og?tool=${encodeURIComponent(tool.slug)}`,
    ...(checklist.length > 0 ? { featureList: checklist } : {}),
    offers: {
      "@type": "Offer",
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(softwareAppJsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Breadcrumbs
          trail={[
            { name: "Home", href: "/" },
            { name: "AI tools", href: "/tools" },
            { name },
          ]}
        />

        {/* Hero */}
        <header className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <ToolLogo
              slug={tool.slug}
              name={name}
              logoUrl={logoUrl}
              emoji={tool.logoEmoji}
              gradient={tool.logoGradient}
              size="xl"
              className="rounded-2xl"
            />
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
                {tool.category.name}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {name}
              </h1>
              <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-white/65">
                {tool.tagline}
              </p>
              <p className="mt-2 text-[13px] text-white/50">
                {tool.pricingModel === "open_source" ? "Open source" : pricingLine(tool.pricingModel, tool.startingPrice)}
                <span aria-hidden className="mx-2 text-white/25">·</span>
                {installInfo.deliveryType === "installable" ||
                installInfo.deliveryType === "desktop_app"
                  ? "Runs on your device"
                  : "Runs in the cloud"}
                {tool.editorsPick && (
                  <>
                    <span aria-hidden className="mx-2 text-white/25">·</span>
                    <span className="inline-flex items-center gap-1 text-ember">
                      <Star className="size-3 fill-current" aria-hidden />
                      Editors pick
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="shrink-0 lg:pt-6">
            <ToolDetailActions
              slug={tool.slug}
              name={name}
              websiteUrl={tool.websiteUrl}
              githubUrl={tool.githubUrl}
            />
          </div>
        </header>

        {/* Stats strip */}
        <dl className="mt-8 grid grid-cols-2 gap-y-2 border-y border-white/10 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-white/10">
          {github ? (
            <>
              <StatCell
                label="GitHub stars"
                main={
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="size-3.5 text-white/60" aria-hidden />
                    {formatCompact(github.stars)}
                  </span>
                }
                sub={`${github.stars.toLocaleString()} stars`}
              />
              <StatCell
                label="Community forks"
                main={formatCompact(github.forks)}
                sub="Open collaboration"
              />
              <StatCell
                label="License"
                main={licenseLabel}
                sub="Read the full license"
              />
              <StatCell
                label="Platforms"
                main={platformsMain}
                sub={tool.websiteUrl ? "Also Web" : platformsSub}
              />
              <StatCell
                label="Last activity"
                main={lastActive}
                sub={lastActiveSub}
              />
            </>
          ) : (
            <>
              <StatCell
                label="Pricing"
                main={pricingLine(tool.pricingModel, tool.startingPrice)}
                sub={tool.startingPrice ?? tool.pricingNote ?? "See details"}
              />
              <StatCell
                label="Platforms"
                main={platformsMain}
                sub={platformsSub}
              />
              <StatCell
                label="Category"
                main={tool.category.name}
                sub={`${categoryToolCount} tools`}
              />
              <StatCell
                label="Reviews"
                main={
                  aggregate
                    ? `${aggregate.overall.toFixed(1)}/5`
                    : `${stats.count}`
                }
                sub={
                  aggregate
                    ? `${aggregate.count} verified reviews`
                    : "No verified reviews yet"
                }
              />
              <StatCell
                label="Last updated"
                main={lastActive}
                sub={lastActiveSub}
              />
            </>
          )}
        </dl>

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <section aria-label={`Screenshots of ${name}`} className="mt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Screenshots
              </h2>
              <p className="text-xs text-white/45">Official project imagery</p>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-6">
              <a
                href={screenshots[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
                aria-label="Open screenshot in a new tab"
              >
                <img
                  src={screenshots[0]}
                  alt={`${name} screenshot 1`}
                  loading="lazy"
                  className="mx-auto max-h-[560px] w-auto max-w-full rounded-xl border border-white/10 object-contain transition-colors group-hover:border-ember/40"
                />
              </a>
              {screenshots.length > 1 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {screenshots.slice(1, 5).map((src, i) => (
                    <a
                      key={`${src}-${i}`}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open screenshot ${i + 2} in a new tab`}
                      className="group block"
                    >
                      <img
                        src={src}
                        alt={`${name} screenshot ${i + 2}`}
                        loading="lazy"
                        className="aspect-video w-full rounded-xl border border-white/10 object-cover transition-colors group-hover:border-ember/40"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Verdict */}
        <section
          aria-label={`Verdict on ${name}`}
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.015]"
        >
          <div className="grid md:grid-cols-2 md:divide-x md:divide-white/10">
            <div className="p-6 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
                Best for
              </p>
              <p className="mt-2 text-xl font-semibold leading-snug tracking-tight text-white">
                {bestForTitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {bestForBody}
              </p>
              {editorial.pricingCheckedAt && (
                <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-mint">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  Pricing checked {utcMonthYear(editorial.pricingCheckedAt)}
                </p>
              )}
            </div>
            <div className="border-t border-white/10 p-6 sm:p-8 md:border-t-0">
              <h2 className="text-sm font-semibold text-white">
                User feedback
              </h2>
              {aggregate ? (
                <div className="mt-2 flex items-center gap-2">
                  <Stars value={aggregate.overall} />
                  <span className="text-sm font-semibold tabular-nums text-white">
                    {aggregate.overall.toFixed(1)}
                  </span>
                  <span className="text-xs text-white/50">
                    from {aggregate.count} verified reviews
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/60">
                  No aggregate rating verified
                </p>
              )}
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                Explore discussions, issues, and documentation to see how this
                project fits your workflow.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium">
                {(tool.docsUrl || tool.websiteUrl) && (
                  <a
                    href={tool.docsUrl ?? tool.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-white/85 transition-colors hover:text-ember"
                  >
                    Documentation
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                )}
                {issuesUrl && (
                  <a
                    href={issuesUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-white/85 transition-colors hover:text-ember"
                  >
                    {github ? "Project issues" : "Official website"}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/40">
                {github
                  ? "GitHub stars measure repository interest, not customer satisfaction."
                  : "Prother ratings come from verified reviews only."}
              </p>
              <details className="group mt-4 border-t border-white/10 pt-4">
                <summary className="cursor-pointer list-none text-[13px] font-semibold text-ember transition-colors hover:text-ember-hot">
                  <span className="group-open:hidden">
                    Read Prother reviews ({stats.count}) - write your own
                  </span>
                  <span className="hidden group-open:inline">
                    Hide Prother reviews
                  </span>
                </summary>
                <div className="pt-4">
                  <ToolReviewsSection
                    slug={tool.slug}
                    toolName={name}
                    initialReviews={reviews}
                    initialAggregate={aggregate}
                  />
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* About + Details */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <div className="min-w-0">
            <section aria-label={`About ${name}`}>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                About {name}
              </h2>
              <div className="mt-3 space-y-4">
                {longParagraphs.length > 0 ? (
                  longParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className="whitespace-pre-line text-[15px] leading-relaxed text-white/75"
                    >
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="text-[15px] leading-relaxed text-white/75">
                    {tool.description ?? tool.tagline}
                  </p>
                )}
              </div>
              {checklist.length > 0 && (
                <ul className="mt-5 space-y-2.5">
                  {checklist.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-white/80"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-mint"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {editorial.cons.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {editorial.cons.slice(0, 3).map((con, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-white/55"
                    >
                      <X
                        className="mt-0.5 size-4 shrink-0 text-white/30"
                        aria-hidden
                      />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {installInfo.hasInstallCommand && installInfo.command && (
              <div className="mt-8">
                <ToolInstallBox
                  slug={tool.slug}
                  name={name}
                  websiteUrl={tool.websiteUrl}
                  githubUrl={tool.githubUrl}
                />
              </div>
            )}

            {alternatives.length > 0 && (
              <section
                aria-label={`Alternatives to ${name}`}
                className="mt-10"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    Alternative to {name}
                  </h2>
                  <Link
                    href={`/compare?tools=${encodeURIComponent(tool.slug)}`}
                    className="font-mono text-xs text-ember transition-colors hover:underline"
                  >
                    Compare in matrix &rarr;
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {alternatives.slice(0, 6).map((a) => {
                    const sortedShowdown = [tool.slug, a.slug].sort().join("-vs-");
                    return (
                      <div
                        key={a.slug}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-sm text-white/80 transition-colors hover:border-ember/40"
                      >
                        <Link
                          href={`/tools/${a.slug}`}
                          className="transition-colors hover:text-ember"
                        >
                          {a.name}
                        </Link>
                        <span className="text-white/20" aria-hidden>|</span>
                        <Link
                          href={`/compare/${sortedShowdown}`}
                          className="font-mono text-[11px] font-semibold text-ember transition-colors hover:text-ember-hot"
                          title={`Compare ${name} vs ${a.name}`}
                        >
                          VS
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-white/45">
                  These tools share use cases. Features, costs, and deployment
                  needs differ.
                </p>
              </section>
            )}

            {/* Practical Guides & Evaluations from Journal */}
            {(toolGuides.length > 0 || categoryGuide) && (
              <section
                aria-label="Practical guides and technical evaluations"
                className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wider text-ember uppercase">
                      <BookOpen className="size-3" aria-hidden />
                      Journal & Architectural Guides
                    </span>
                    <h2 className="mt-1 text-base font-semibold text-white">
                      Practical Guides & In-Depth Evaluations
                    </h2>
                  </div>
                  <Link
                    href="/journal"
                    className="inline-flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-ember"
                  >
                    All Journal Guides
                    <ArrowUpRight className="size-3" aria-hidden />
                  </Link>
                </div>

                {toolGuides.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {toolGuides.map((guide) => (
                      <Link
                        key={guide.slug}
                        href={`/journal/${guide.slug}`}
                        className="group flex flex-col justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-ember/40 hover:bg-ember/[0.03] sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ember">
                              {guide.pillar.shortLabel}
                            </span>
                            <span className="font-mono text-[11px] text-white/40">
                              {guide.readingMinutes} min read
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold text-white/90 group-hover:text-ember">
                            {guide.title}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-white/50">
                            {guide.excerpt}
                          </p>
                        </div>
                        <ArrowUpRight
                          className="size-4 shrink-0 text-white/40 transition-colors group-hover:text-ember"
                          aria-hidden
                        />
                      </Link>
                    ))}
                  </div>
                )}

                {categoryGuide && (
                  <div className={cn("mt-4 pt-3", toolGuides.length > 0 && "border-t border-white/10")}>
                    <Link
                      href={categoryGuide.href}
                      className="group flex items-center justify-between gap-3 text-xs text-white/70 transition-colors hover:text-ember"
                    >
                      <span className="line-clamp-1">
                        <span className="font-mono text-white/40 uppercase">Procurement Guide:</span>{" "}
                        {categoryGuide.headline}
                      </span>
                      <ArrowUpRight className="size-3 shrink-0 text-white/40 group-hover:text-ember" aria-hidden />
                    </Link>
                  </div>
                )}
              </section>
            )}

            {tags.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-1.5" aria-label="Tags">
                {tags.map((t) => {
                  const topic = getTopicBySlug(t);
                  const href = topic
                    ? `/topics/${t}`
                    : `/tools?tag=${encodeURIComponent(t)}`;
                  return (
                    <li key={t}>
                      <Link
                        href={href}
                        className={cn(
                          "inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-white/55 transition-colors hover:border-ember/40 hover:text-ember",
                          topic && "border-ember/20 text-ember/80",
                        )}
                      >
                        {t}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside aria-label="Details" className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Details</h2>
            <dl className="mt-2 border-t border-white/10">
              <DetailRow label="Category">
                <Link
                  href={`/categories/${tool.category.slug}`}
                  className="transition-colors hover:text-ember"
                >
                  {tool.category.name}
                </Link>
              </DetailRow>
              <DetailRow label="Available on">{platformsMain}</DetailRow>
              <DetailRow label="License">{licenseLabel}</DetailRow>
              <DetailRow label="API access">
                {tool.hasApi ? (
                  <span className="inline-flex items-center gap-1 text-mint">
                    <Check className="size-3" aria-hidden />
                    REST / SDK
                  </span>
                ) : (
                  <span className="text-white/40">UI only</span>
                )}
              </DetailRow>
              <DetailRow label="Pricing">
                <span title={tool.pricingNote ?? undefined}>
                  {pricingLine(tool.pricingModel, tool.startingPrice)}
                </span>
              </DetailRow>
              {tool.pricingNote && (
                <DetailRow label="Billing model">
                  <span className="max-w-[180px] truncate" title={tool.pricingNote}>
                    {tool.pricingNote}
                  </span>
                </DetailRow>
              )}
              <DetailRow label="Self-hosted">
                {tool.pricingModel === "open_source"
                  ? "Yes, self-hostable"
                  : "Hosted app"}
              </DetailRow>
              {editorial.pricingCheckedAt && (
                <DetailRow label="Pricing verified">
                  <span className="text-mint">
                    {utcDateLabel(editorial.pricingCheckedAt)}
                  </span>
                </DetailRow>
              )}
              {github && (
                <DetailRow label="Repository">
                  <a
                    href={github.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 transition-colors hover:text-ember"
                  >
                    <span className="max-w-[180px] truncate">
                      {github.fullName}
                    </span>
                    <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                  </a>
                </DetailRow>
              )}
              <DetailRow label="Created">
                {utcDateLabel(tool.createdAt)}
              </DetailRow>
            </dl>
            <div className="mt-3 space-y-2 text-[13px] font-medium">
              {(tool.docsUrl ?? tool.websiteUrl) && (
                <a
                  href={tool.docsUrl ?? tool.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-1 text-white/85 transition-colors hover:text-ember"
                >
                  Read the documentation
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
              <a
                href={issuesUrl}
                target="_blank"
                rel={issuesUrl.startsWith("/") ? undefined : "noopener noreferrer nofollow"}
                className="flex items-center gap-1 text-white/85 transition-colors hover:text-ember"
              >
                Community and issues
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            </div>
            <p className="mt-3 text-xs text-white/40">
              {github
                ? `GitHub stats captured ${utcMonthDay(new Date())}, ${new Date().getUTCFullYear()}.`
                : editorial.pricingCheckedAt
                  ? `Pricing checked ${utcMonthYear(editorial.pricingCheckedAt)}.`
                  : `Listed ${utcMonthYear(tool.createdAt)} by ${tool.makerHandle}.`}
            </p>

            <details className="group mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <summary className="cursor-pointer list-none text-[13px] font-semibold text-white/85 transition-colors hover:text-ember">
                <span className="group-open:hidden">
                  Is this your tool? Claim the listing
                </span>
                <span className="hidden group-open:inline">Hide claim options</span>
              </summary>
              <div className="pt-3">
                <ClaimListing
                  slug={tool.slug}
                  maker={tool.makerHandle}
                  claimed={tool.claimed}
                />
              </div>
            </details>

            <details className="group mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <summary className="cursor-pointer list-none text-[13px] font-semibold text-white/85 transition-colors hover:text-ember">
                <span className="group-open:hidden">Embed a Prother badge</span>
                <span className="hidden group-open:inline">Hide embed badge</span>
              </summary>
              <div className="pt-3">
                <ToolBadgeEmbed slug={tool.slug} name={name} />
              </div>
            </details>
          </aside>
        </div>

        {/* More in category */}
        {related.length > 0 && (
          <section
            aria-label={`More in ${tool.category.name}`}
            className="mt-14"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                More in {tool.category.name}
              </h2>
              <Link
                href={`/categories/${tool.category.slug}`}
                className="inline-flex shrink-0 items-center gap-1 text-[13px] text-white/55 transition-colors hover:text-ember"
              >
                See category
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] leading-relaxed text-white/45">
              {blurbFor(tool.category.slug, tool.category.name)}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/tools/${r.slug}`}
                  aria-label={`Open ${r.name}: ${r.tagline}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-ember/40 hover:bg-ember/[0.04]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <ToolLogo
                      slug={r.slug}
                      name={r.name}
                      logoUrl={r.logoUrl}
                      emoji={r.emoji}
                      gradient={r.gradient}
                      size="md"
                    />
                    {r.editorsPick && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ember">
                        <Star className="size-2.5 fill-current" aria-hidden />
                        Pick
                      </span>
                    )}
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold text-white/90 transition-colors group-hover:text-ember">
                    {r.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/55">
                    {r.tagline}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/55 transition-colors hover:text-ember"
          >
            <span aria-hidden>‹</span> Back to Discover
          </Link>
        </p>
      </div>
    </div>
  );
}
