import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Compass, Star } from "lucide-react";
import { db } from "@/lib/prother";
import { clamp } from "@/lib/og";
import { blurbFor } from "@/lib/category-blurbs";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { AdSlot } from "@/components/prother/ad-slot";
import { placementEnabled } from "@/lib/ad-config";

/**
 * /categories/[slug] — the real, crawlable category page (Task 25).
 * Ranked grid of live tools in the category (server-rendered static links),
 * the curated SEO blurb from lib/category-blurbs, an ItemList JSON-LD over
 * the tools, and a BreadcrumbList (free from <Breadcrumbs />).
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

const PRICING_LABEL: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open Source",
};

function pricingChip(model: string, price: string | null): string {
  const label = PRICING_LABEL[model] ?? "Free";
  if ((model === "paid" || model === "freemium") && price) {
    return `${label} ${price}`;
  }
  return label;
}

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { tools: { where: { status: "live" } } },
      },
    },
  });
  if (!category) notFound();

  const blurb = blurbFor(category.slug, category.name);
  const count = category._count.tools;
  const title = `${category.name} · AI tools | Prother`;
  const description = clamp(`${blurb} ${count} ${count === 1 ? "tool" : "tools"} listed.`, 200);

  return {
    title,
    description,
    keywords: [
      `${category.name} AI tools`,
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
      images: [{ url: "/api/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/api/og"],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const category = await db.category.findUnique({
    where: { slug },
    include: {
      tools: {
        where: { status: "live" },
        // Explicit select — a stale cached PrismaClient in a long-running dev
        // server references dropped columns on full-row Tool selects.
        select: {
          slug: true,
          name: true,
          tagline: true,
          logoEmoji: true,
          logoGradient: true,
          pricingModel: true,
          startingPrice: true,
          editorsPick: true,
          createdAt: true,
        },
        // Featured ordering (mirrors GET /api/tools, sort=featured):
        // pinned listings first, then Editor's Picks, then newest.
        orderBy: [
          { pinned: "desc" },
          { editorsPick: "desc" },
          { createdAt: "desc" },
        ],
      },
    },
  });
  if (!category) notFound();

  const tools = category.tools.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    emoji: t.logoEmoji,
    gradient: t.logoGradient,
    pricing: pricingChip(t.pricingModel, t.startingPrice),
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

  return (
    <div className="bg-ink pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <Breadcrumbs
          trail={[{ name: "Home", href: "/" }, { name: category.name }]}
        />

        {/* Page head */}
        <header className="mt-8">
          <p className="flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-ember uppercase">
            <Compass className="size-3.5" aria-hidden />
            Category
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tighter text-white sm:text-5xl md:text-6xl">
            <span aria-hidden className="mr-3">
              {category.emoji}
            </span>
            {category.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60 sm:text-lg">
            {blurb}
          </p>
          <p className="mt-4 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
            {tools.length} {tools.length === 1 ? "tool" : "tools"} listed · curated
            daily
          </p>
        </header>

        {/* Category Spotlight — the top slot sold on /advertise. Category-
            targeted campaigns win here (targetCategory = slug or null). */}
        {spotlightOn && (
          <AdSlot
            placement="category_spotlight"
            category={category.slug}
            variant="spotlight"
            className="mt-8"
          />
        )}

        {/* Ranked grid — real links to the SSR tool pages */}
        <div className="pb-24 pt-8">
          {tools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
              <p className="font-mono text-sm tracking-wider text-white/60 uppercase">
                Nothing listed here yet
              </p>
              <p className="mt-2 text-sm text-white/60">
                New {category.name.toLowerCase()} tools appear as they&apos;re approved.{" "}
                <Link href="/submit" className="text-ember hover:underline">
                  Submit yours
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t, i) => (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  aria-label={`${t.name}: ${t.tagline}. Rank ${i + 1} in ${category.name}.`}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-inner",
                        t.gradient
                      )}
                    >
                      {t.emoji}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {i < 3 && (
                        <span className="font-mono text-xs tracking-wider text-white/55 uppercase">
                          #{i + 1}
                        </span>
                      )}
                      {t.editorsPick && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/15 px-2.5 py-1 font-mono text-xs tracking-wider text-ember uppercase">
                          <Star className="size-2.5 fill-current" aria-hidden />
                          Editor&apos;s Pick
                        </span>
                      )}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg leading-snug font-bold text-white transition-colors group-hover:text-ember">
                    {t.name}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/55">
                    {t.tagline}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs tracking-wider text-white/60 uppercase">
                      {t.pricing}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs tracking-wider text-white/55 uppercase">
                      Open listing
                      <ArrowUpRight
                        className="size-3.5 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Cross-links — the directory stays one hop away */}
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
            <Link
              href="/tools"
              className="transition-colors hover:text-ember"
            >
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
