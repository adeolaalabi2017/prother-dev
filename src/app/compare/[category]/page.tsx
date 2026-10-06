import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ExternalLink, Star, X } from "lucide-react";
import { CompareMatrixView } from "@/components/prother/compare-matrix";
import { ToolLogo } from "@/components/prother/tool-logo";
import { CATEGORIES } from "@/components/prother/categories";
import type { CompareMatrix } from "@/lib/compare";
import { createServerConvexClient } from "@/lib/convex";
import {
  convexCompareBump,
  shadowCompareCategories,
  shadowCompareMatrix,
  shadowCompareView,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { safeJsonLd } from "@/lib/safe-json-ld";

/**
 * /compare/[category] - dual purpose indexable comparison route:
 * 1. Category comparison landings (e.g. /compare/code-assistants)
 * 2. Pairwise "VS" comparison routes (e.g. /compare/cursor-vs-windsurf)
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ category: string }> };

type Category = {
  slug: string;
  name: string;
  emoji: string;
  toolCount: number;
};

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

/** Convex-only categories (never throws - [] on failure). */
async function getCategories(): Promise<Category[]> {
  try {
    return await shadowCompareCategories(createServerConvexClient()!);
  } catch {
    return [];
  }
}

/**
 * Every category that has a landing page. The static CATEGORIES constant is
 * the source of truth for which slugs exist; the Convex list only supplies
 * live tool counts.
 */
function mergeCategories(live: Category[]): Category[] {
  const byslug = new Map(live.map((c) => [c.slug, c]));
  return CATEGORIES.map(
    (c) =>
      byslug.get(c.slug) ?? {
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        toolCount: 0,
      },
  );
}

/** Convex-only matrix (null on failure / unknown category). */
async function getMatrix(
  category: string,
  slugs: string[],
): Promise<CompareMatrix | null> {
  try {
    const res = await shadowCompareMatrix(
      createServerConvexClient()!,
      category,
      slugs,
    );
    if (!("error" in res)) return res as CompareMatrix;
  } catch {
    // fall through to null
  }
  return null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;

  // Case 1: Pairwise "VS" route (e.g. cursor-vs-windsurf)
  if (category.includes("-vs-")) {
    const parts = category.split("-vs-").map((s) => s.trim().toLowerCase());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { title: "Comparison not found | Prother", robots: { index: false } };
    }
    const [slugA, slugB] = parts;
    const client = createServerConvexClient();
    if (!client) {
      return { title: "Compare AI tools | Prother" };
    }
    const res = await shadowCompareView(client, slugA, slugB, 1);
    if (!res || "error" in res || !res.a || !res.b) {
      return { title: "Comparison not found | Prother", robots: { index: false } };
    }

    const canonicalPair = [slugA, slugB].sort().join("-vs-");
    const title = `${res.a.name} vs ${res.b.name}: Side-by-Side Comparison | Prother`;
    const description = `Compare ${res.a.name} vs ${res.b.name} side by side: pricing, community ratings, features, and honest specs.`;
    const og = `/api/og?a=${encodeURIComponent(slugA)}&b=${encodeURIComponent(slugB)}`;

    return {
      title,
      description,
      alternates: { canonical: `/compare/${canonicalPair}` },
      openGraph: {
        title,
        description,
        siteName: "Prother",
        type: "website",
        images: [{ url: og, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [og],
      },
    };
  }

  // Case 2: Category comparison landing (e.g. code-assistants)
  const cats = mergeCategories(await getCategories());
  const cat = cats.find((c) => c.slug === category);
  if (!cat) {
    return { title: "Compare AI tools | Prother", robots: { index: false } };
  }
  const title = `${cat.name}: compare AI tools | Prother`;
  const description = `Compare ${cat.toolCount} ${cat.name} tools side by side: pricing, ratings, API access, and the features that matter for this category.`;
  const og = `/api/og?category=${encodeURIComponent(cat.slug)}&compare=1`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${cat.slug}` },
    openGraph: {
      title,
      description,
      siteName: "Prother",
      type: "website",
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function CompareCategoryPage({ params }: Params) {
  const { category } = await params;
  const client = createServerConvexClient()!;

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 1: Pairwise "VS" comparison (e.g. /compare/cursor-vs-windsurf)
  // ──────────────────────────────────────────────────────────────────────────
  if (category.includes("-vs-")) {
    const parts = category.split("-vs-").map((s) => s.trim().toLowerCase());
    if (parts.length !== 2 || !parts[0] || !parts[1]) notFound();
    const [slugA, slugB] = parts;

    const [viewRes, catsRaw] = await Promise.all([
      shadowCompareView(client, slugA, slugB, 6),
      getCategories(),
    ]);

    if (!viewRes || "error" in viewRes || !viewRes.a || !viewRes.b) {
      notFound();
    }

    // Bump comparison view stats in background
    convexCompareBump(client, { aSlug: slugA, bSlug: slugB }).catch(() => {});

    const { a: toolA, b: toolB, popular } = viewRes;
    const cats = mergeCategories(catsRaw);
    const targetCategory = toolA.category.slug;
    const initialTools = [slugA, slugB];
    const initialMatrix = await getMatrix(targetCategory, initialTools);
    const siteBase = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteBase,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Compare",
          item: `${siteBase}/compare`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: toolA.category.name,
          item: `${siteBase}/compare/${toolA.category.slug}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: `${toolA.name} vs ${toolB.name}`,
          item: `${siteBase}/compare/${slugA}-vs-${slugB}`,
        },
      ],
    };

    const webPageJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${toolA.name} vs ${toolB.name}: Side-by-Side Comparison`,
      description: `Compare ${toolA.name} vs ${toolB.name} side by side: pricing, community ratings, features, and honest specs.`,
      url: `${siteBase}/compare/${slugA}-vs-${slugB}`,
    };

    return (
      <div className="bg-ink pb-20 text-white md:pb-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageJsonLd) }}
        />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-white/50">
            <Link href="/compare" className="transition-colors hover:text-ember">
              Compare
            </Link>
            <span>/</span>
            <Link
              href={`/compare/${toolA.category.slug}`}
              className="transition-colors hover:text-ember"
            >
              {toolA.category.name}
            </Link>
            <span>/</span>
            <span className="text-white/80">
              {toolA.name} vs {toolB.name}
            </span>
          </nav>

          {/* Hero Header */}
          <header className="space-y-6 border-b border-white/10 pb-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/30 bg-ember/10 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-ember uppercase">
                Head to Head Comparison
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs tracking-wider text-white/60 uppercase">
                <span aria-hidden>{toolA.category.emoji}</span>
                {toolA.category.name}
              </span>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                  {toolA.name}{" "}
                  <span className="text-white/55">vs</span>{" "}
                  {toolB.name}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/65 sm:text-lg">
                  Direct side-by-side comparison of features, pricing, verified reviews,
                  and community ratings to help you choose the right tool.
                </p>
              </div>

              {/* Visual VS Avatar Pair */}
              <div className="flex items-center gap-3 self-start sm:self-center">
                <Link
                  href={`/tools/${toolA.slug}`}
                  title={toolA.name}
                  className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 transition-transform hover:scale-105"
                >
                  <ToolLogo
                    slug={toolA.slug}
                    name={toolA.name}
                    logoUrl={toolA.logoUrl}
                    emoji={toolA.emoji}
                    gradient={toolA.gradient}
                    size="lg"
                  />
                </Link>
                <div className="flex size-9 items-center justify-center rounded-full border border-ember/40 bg-ember/15 font-mono text-xs font-black text-ember">
                  VS
                </div>
                <Link
                  href={`/tools/${toolB.slug}`}
                  title={toolB.name}
                  className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 transition-transform hover:scale-105"
                >
                  <ToolLogo
                    slug={toolB.slug}
                    name={toolB.name}
                    logoUrl={toolB.logoUrl}
                    emoji={toolB.emoji}
                    gradient={toolB.gradient}
                    size="lg"
                  />
                </Link>
              </div>
            </div>
          </header>

          {/* Quick Head-to-Head Snapshot Cards */}
          <section aria-label="Quick Comparison" className="mt-10">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
              Overview & Snapshot
            </h2>

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {/* Tool A Card */}
              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <ToolLogo
                      slug={toolA.slug}
                      name={toolA.name}
                      logoUrl={toolA.logoUrl}
                      emoji={toolA.emoji}
                      gradient={toolA.gradient}
                      size="lg"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        <Link
                          href={`/tools/${toolA.slug}`}
                          className="transition-colors hover:text-ember"
                        >
                          {toolA.name}
                        </Link>
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/55">
                        {toolA.tagline}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-white/80 uppercase">
                    {PRICING_LABEL[toolA.pricing.model] ?? toolA.pricing.model}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-black/40 p-3.5">
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-wider text-white/45">
                      Starting Price
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-white/90">
                      {toolA.pricing.price ?? "Free"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-wider text-white/45">
                      Community Rating
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-ember">
                      {toolA.rating ? (
                        <>
                          <Star className="size-3.5 fill-current" aria-hidden />
                          {toolA.rating.overall} / 5 ({toolA.reviewCount})
                        </>
                      ) : (
                        <span className="text-white/55 text-xs font-normal">
                          {toolA.reviewCount} reviews
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs",
                      toolA.hasApi
                        ? "border border-mint/30 bg-mint/10 text-mint"
                        : "border border-white/10 bg-white/[0.02] text-white/55",
                    )}
                  >
                    {toolA.hasApi ? (
                      <>
                        <Check className="size-3" aria-hidden /> API Available
                      </>
                    ) : (
                      <>
                        <X className="size-3" aria-hidden /> No API
                      </>
                    )}
                  </span>
                  {toolA.pricing.model === "open_source" && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/70">
                      Open Source
                    </span>
                  )}
                  {toolA.verified && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-xs text-ember">
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={toolA.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-ember transition-colors hover:bg-ember/20"
                  >
                    Visit website
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                  <Link
                    href={`/tools/${toolA.slug}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white/75 transition-colors hover:border-white/25 hover:text-white"
                  >
                    Full details
                    <ArrowUpRight className="size-3" aria-hidden />
                  </Link>
                </div>
              </div>

              {/* Tool B Card */}
              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <ToolLogo
                      slug={toolB.slug}
                      name={toolB.name}
                      logoUrl={toolB.logoUrl}
                      emoji={toolB.emoji}
                      gradient={toolB.gradient}
                      size="lg"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        <Link
                          href={`/tools/${toolB.slug}`}
                          className="transition-colors hover:text-ember"
                        >
                          {toolB.name}
                        </Link>
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/55">
                        {toolB.tagline}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-white/80 uppercase">
                    {PRICING_LABEL[toolB.pricing.model] ?? toolB.pricing.model}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-black/40 p-3.5">
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-wider text-white/45">
                      Starting Price
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-white/90">
                      {toolB.pricing.price ?? "Free"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[11px] uppercase tracking-wider text-white/45">
                      Community Rating
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-ember">
                      {toolB.rating ? (
                        <>
                          <Star className="size-3.5 fill-current" aria-hidden />
                          {toolB.rating.overall} / 5 ({toolB.reviewCount})
                        </>
                      ) : (
                        <span className="text-white/55 text-xs font-normal">
                          {toolB.reviewCount} reviews
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs",
                      toolB.hasApi
                        ? "border border-mint/30 bg-mint/10 text-mint"
                        : "border border-white/10 bg-white/[0.02] text-white/55",
                    )}
                  >
                    {toolB.hasApi ? (
                      <>
                        <Check className="size-3" aria-hidden /> API Available
                      </>
                    ) : (
                      <>
                        <X className="size-3" aria-hidden /> No API
                      </>
                    )}
                  </span>
                  {toolB.pricing.model === "open_source" && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/70">
                      Open Source
                    </span>
                  )}
                  {toolB.verified && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-xs text-ember">
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={toolB.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-ember transition-colors hover:bg-ember/20"
                  >
                    Visit website
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                  <Link
                    href={`/tools/${toolB.slug}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white/75 transition-colors hover:border-white/25 hover:text-white"
                  >
                    Full details
                    <ArrowUpRight className="size-3" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Feature Matrix */}
          <section aria-label="Feature Matrix" className="mt-14 space-y-4">
            <div>
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
                Detailed Feature Matrix
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Compare {toolA.name} and {toolB.name} across feature support, capabilities, and categories.
              </p>
            </div>

            <div className="mt-6">
              <CompareMatrixView
                categories={cats}
                initialMatrix={initialMatrix}
                initialCategory={targetCategory}
                initialTools={initialTools}
              />
            </div>
          </section>

          {/* Popular Comparisons */}
          {popular.length > 0 && (
            <section aria-label="Popular Comparisons" className="mt-16 space-y-4 border-t border-white/10 pt-10">
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
                More Popular Comparisons
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {popular.map((p) => (
                  <Link
                    key={`${p.aSlug}-vs-${p.bSlug}`}
                    href={`/compare/${p.aSlug}-vs-${p.bSlug}`}
                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-ember/40 hover:bg-ember/[0.04]"
                  >
                    <div className="flex items-center gap-2.5">
                      <ToolLogo
                        slug={p.aSlug}
                        name={p.aName}
                        logoUrl={p.aLogoUrl}
                        emoji={p.aEmoji}
                        size="xs"
                        className="size-6 rounded"
                      />
                      <span className="text-xs font-semibold text-white/85 group-hover:text-ember">
                        {p.aName}
                      </span>
                      <span className="font-mono text-[10px] text-white/55 uppercase">
                        vs
                      </span>
                      <ToolLogo
                        slug={p.bSlug}
                        name={p.bName}
                        logoUrl={p.bLogoUrl}
                        emoji={p.bEmoji}
                        size="xs"
                        className="size-6 rounded"
                      />
                      <span className="text-xs font-semibold text-white/85 group-hover:text-ember">
                        {p.bName}
                      </span>
                    </div>

                    <ArrowUpRight
                      className="size-3.5 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 2: Category comparison landing (e.g. /compare/code-assistants)
  // ──────────────────────────────────────────────────────────────────────────
  const cats = mergeCategories(await getCategories());
  const cat = cats.find((c) => c.slug === category);
  if (!cat) notFound();

  let initialMatrix: CompareMatrix | null = await getMatrix(category, []);
  let initialTools: string[] = [];

  // No explicit selection: feature the top 2 live options so the page paints
  // a complete table instead of an empty shell.
  if (
    initialMatrix &&
    initialMatrix.tools.length === 0 &&
    initialMatrix.options.length >= 2
  ) {
    initialTools = initialMatrix.options.slice(0, 2).map((o) => o.slug);
    initialMatrix = (await getMatrix(category, initialTools)) ?? initialMatrix;
  }

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
  const categoryBreadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteBase,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Compare",
        item: `${siteBase}/compare`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cat.name,
        item: `${siteBase}/compare/${cat.slug}`,
      },
    ],
  };

  return (
    <div className="bg-ink pb-16 text-white md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(categoryBreadcrumbJsonLd),
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <header>
          <nav aria-label="Breadcrumb" className="mb-4">
            <Link
              href="/compare"
              className="font-mono text-xs uppercase tracking-[0.25em] text-white/55 transition-colors hover:text-ember"
            >
              &larr; All categories
            </Link>
          </nav>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-white/60">
            <span aria-hidden className="h-px w-6 bg-ember" />
            Compare
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tighter text-white sm:text-5xl">
            <span aria-hidden>{cat.emoji}</span> {cat.name}{" "}
            <span className="text-ember">tools compared.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            {cat.toolCount} {cat.name} tools side by side: pricing, API access,
            and the features that matter. Add or remove tools to update the
            table.
          </p>
        </header>

        <div className="mt-10">
          <CompareMatrixView
            categories={cats}
            initialMatrix={initialMatrix}
            initialCategory={cat.slug}
            initialTools={initialTools}
          />
        </div>
      </div>
    </div>
  );
}
