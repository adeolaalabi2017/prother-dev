import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Compass, Scale, Star } from "lucide-react";
import { clamp } from "@/lib/og";
import { blurbFor } from "@/lib/category-blurbs";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { AdSlot } from "@/components/prother/ad-slot";
import { placementEnabled } from "@/lib/ad-config";
import { createServerConvexClient } from "@/lib/convex";
import { shadowCategoryDetail } from "@/lib/data";
import { ToolLogo } from "@/components/prother/tool-logo";
import { ToolDecisionCard } from "@/components/prother/tool-card";
import { guideFor } from "@/lib/category-guides";
import { safeJsonLd } from "@/lib/safe-json-ld";

/**
 * /categories/[slug] - the real, crawlable category page (Task 25).
 * Ranked grid of live tools in the category (server-rendered static links),
 * the curated SEO blurb from lib/category-blurbs, an ItemList JSON-LD over
 * the tools, and a BreadcrumbList (free from <Breadcrumbs />).
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  // Convex-only (categories cutover).
  const res = await shadowCategoryDetail(createServerConvexClient()!, slug);
  if (!res || "error" in res) notFound();
  const name = res.category.name;
  const count = res.category.toolCount;
  const blurb = blurbFor(slug, name!);
  const title = `${name} · AI tools | Prother`;
  const description = clamp(
    `${blurb} ${count} ${count === 1 ? "tool" : "tools"} listed.`,
    200,
  );

  return {
    title,
    description,
    keywords: [
      `${name} AI tools`,
      "AI tools",
      "AI tools directory",
      "AI tool discovery",
    ],
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title,
      description,
      siteName: "Prother",
      type: "website",
      images: [
        {
          url: `/api/og?category=${encodeURIComponent(slug)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?category=${encodeURIComponent(slug)}`],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  // Convex-only (categories cutover): pinned/picks/newest order + live count.
  const res = await shadowCategoryDetail(createServerConvexClient()!, slug);
  if (!res || "error" in res) notFound();
  const category = {
    slug: res.category.slug,
    name: res.category.name,
    emoji: res.category.emoji,
    toolCount: res.category.toolCount,
  };
  const tools = res.tools.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    emoji: t.emoji,
    gradient: t.gradient,
    logoUrl: (t as any).logoUrl ?? null,
    pricing: t.pricing,
    editorsPick: t.editorsPick,
  }));

  const blurb = blurbFor(category.slug, category.name);
  const spotlightOn = await placementEnabled("category_spotlight");

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} AI tools on Prother`,
    description: clamp(blurb, 300),
    numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `${SITE_BASE}/tools/${t.slug}`,
    })),
  };

  const guide = guideFor(slug);
  const faqJsonLd =
    guide && guide.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.a,
            },
          })),
        }
      : null;

  return (
    <div className="bg-ink pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <Breadcrumbs
          trail={[{ name: "Home", href: "/" }, { name: category.name }]}
        />

        {/* Page head */}
        <header className="mt-8">
          <p className="flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ember-tint uppercase">
            <Compass className="size-3.5" aria-hidden />
            Category
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tighter text-white sm:text-5xl md:text-6xl">
            {category.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60 sm:text-lg">
            {blurb}
          </p>
          <p className="mt-4 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
            {tools.length} {tools.length === 1 ? "tool" : "tools"} listed ·
            curated daily
          </p>
          <div className="mt-5">
            <Link
              href={`/compare/${category.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ember/40 px-5 text-sm font-semibold text-ember transition-colors hover:bg-ember/10"
            >
              <Scale className="size-4" aria-hidden />
              Compare {category.name} tools
            </Link>
          </div>
        </header>

        {/* Head-to-Head Showdowns in this category */}
        {tools.length >= 2 && (
          <section
            aria-label={`Compare ${category.name} tools`}
            className="mt-8 rounded-lg border border-white/10 bg-white/[0.02] p-5 sm:p-6"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ember">
                  Head-to-Head Showdowns
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Compare top {category.name.toLowerCase()} tools side by side.
                </p>
              </div>
              <Link
                href={`/compare/${category.slug}`}
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/50 transition-colors hover:text-ember sm:mt-0"
              >
                Full comparison table
                <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [tools[0], tools[1]],
                ...(tools.length >= 3 ? [[tools[0], tools[2]]] : []),
                ...(tools.length >= 4 ? [[tools[1], tools[2]]] : []),
              ].map(([tA, tB]) => (
                <Link
                  key={`${tA.slug}-vs-${tB.slug}`}
                  href={`/compare/${tA.slug}-vs-${tB.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3.5 transition-colors hover:border-ember/40 hover:bg-ember/[0.04]"
                >
                  <div className="flex items-center gap-2.5">
                    <ToolLogo
                      slug={tA.slug}
                      name={tA.name}
                      logoUrl={tA.logoUrl}
                      emoji={tA.emoji}
                      size="xs"
                      className="size-6 rounded"
                    />
                    <span className="text-xs font-semibold text-white/85 group-hover:text-ember">
                      {tA.name}
                    </span>
                    <span className="font-mono text-[10px] text-white/55 uppercase">
                      vs
                    </span>
                    <ToolLogo
                      slug={tB.slug}
                      name={tB.name}
                      logoUrl={tB.logoUrl}
                      emoji={tB.emoji}
                      size="xs"
                      className="size-6 rounded"
                    />
                    <span className="text-xs font-semibold text-white/85 group-hover:text-ember">
                      {tB.name}
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

        {/* Category Spotlight - the top slot sold on /advertise. Category-
            targeted campaigns win here (targetCategory = slug or null). */}
        {spotlightOn && (
          <AdSlot
            placement="category_spotlight"
            category={category.slug}
            variant="spotlight"
            className="mt-8"
          />
        )}

        {/* Ranked grid - real links to the SSR tool pages */}
        <div className="pb-24 pt-8">
          {tools.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
              <p className="font-mono text-sm tracking-wider text-white/60 uppercase">
                Nothing listed here yet
              </p>
              <p className="mt-2 text-sm text-white/60">
                New {category.name.toLowerCase()} tools appear as they&apos;re
                approved.{" "}
                <Link href="/submit" className="text-ember hover:underline">
                  Submit yours
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t, i) => (
                <ToolDecisionCard
                  key={t.slug}
                  slug={t.slug}
                  name={t.name}
                  tagline={t.tagline}
                  emoji={t.emoji}
                  gradient={t.gradient}
                  logoUrl={t.logoUrl}
                  pricing={t.pricing}
                  category={category}
                  rank={i < 3 ? i + 1 : undefined}
                  editorsPick={t.editorsPick}
                />
              ))}
            </div>
          )}

          {/* Architectural Procurement & Evaluation Guide */}
          {guide && (
            <div className="mt-16 border-t border-white/10 pt-16">
              <div className="max-w-3xl">
                <p className="font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
                  PROCUREMENT & ARCHITECTURE GUIDE
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl text-balance">
                  {guide.headline}
                </h2>
              </div>

              {/* Tool Classifications / Subtypes */}
              <div className="mt-8">
                <h3 className="font-mono text-xs font-semibold tracking-wider text-white/50 uppercase">
                  Architectural Classifications
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {guide.subtypes.map((sub, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left"
                    >
                      <h4 className="text-sm font-semibold text-white">
                        {sub.title}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-white/60">
                        {sub.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Evaluation Criteria */}
              <div className="mt-8">
                <h3 className="font-mono text-xs font-semibold tracking-wider text-white/50 uppercase">
                  Key Evaluation Criteria for Engineers
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {guide.evaluationCriteria.map((crit, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left"
                    >
                      <h4 className="text-sm font-semibold text-ember">
                        {crit.title}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-white/60">
                        {crit.criteria}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical FAQs Section */}
              <div className="mt-12 border-t border-white/[0.06] pt-12">
                <h3 className="font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
                  TECHNICAL FAQS
                </h3>
                <h4 className="mt-2 text-xl font-semibold text-white">
                  Frequently Answered Questions about {category.name}
                </h4>

                <div className="mt-6 space-y-4">
                  {guide.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left"
                    >
                      <h5 className="text-sm font-semibold text-white">
                        {faq.q}
                      </h5>
                      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/65">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Domains */}
              {guide.relatedCategories.length > 0 && (
                <div className="mt-12 border-t border-white/[0.06] pt-8">
                  <span className="font-mono text-xs text-white/50 uppercase tracking-wider">
                    Related Domains:
                  </span>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {guide.relatedCategories.map((rel) => (
                      <Link
                        key={rel.slug}
                        href={`/categories/${rel.slug}`}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs font-medium text-white/70 transition-colors hover:border-ember/40 hover:bg-white/[0.06] hover:text-white"
                      >
                        {rel.name} &rarr;
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cross-links - the directory stays one hop away */}
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
            <Link href="/tools" className="transition-colors hover:text-ember">
              Browse the full directory
            </Link>
            <span aria-hidden>/</span>
            <Link href="/submit" className="transition-colors hover:text-ember">
              List your tool
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
