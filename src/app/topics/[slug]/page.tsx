import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, Compass, Scale, Sparkles, Star } from "lucide-react";
import { getTopicBySlug, TOPICS } from "@/lib/topics";
import { POPULAR_SHOWDOWNS } from "@/lib/showdowns";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ToolLogo } from "@/components/prother/tool-logo";
import { createServerConvexClient } from "@/lib/convex";
import { shadowToolsDirectory } from "@/lib/data";
import type { DirectoryRow } from "@/app/api/tools/route";
import { safeJsonLd } from "@/lib/safe-json-ld";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  return {
    title: `${topic.h1} | Prother`,
    description: topic.metaDescription,
    keywords: [
      topic.name,
      `${topic.name} directory`,
      `${topic.slug} ai tools`,
      "best ai tools",
      "ai directory",
    ],
    alternates: { canonical: `/topics/${topic.slug}` },
    openGraph: {
      title: `${topic.h1} | Prother`,
      description: topic.metaDescription,
      siteName: "Prother",
      type: "website",
      images: [
        {
          url: `/api/og?category=${encodeURIComponent(topic.slug)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${topic.h1} | Prother`,
      description: topic.metaDescription,
      images: [`/api/og?category=${encodeURIComponent(topic.slug)}`],
    },
  };
}

function pricingBadge(model: string, price: string | null): string {
  switch (model) {
    case "free":
      return "Free";
    case "freemium":
      return price ? `Freemium (${price})` : "Freemium";
    case "paid":
      return price ? `Paid (${price})` : "Paid";
    case "open_source":
      return "Open Source";
    default:
      return "Free";
  }
}

export default async function TopicPage({ params }: Params) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const convex = createServerConvexClient();
  const dir = await shadowToolsDirectory(convex!, {
    categorySlug: null,
    q: null,
    tag: topic.tag,
    pricing: topic.pricing ?? null,
    sort: "featured",
    page: 1,
    pageSize: 60,
  });

  const tools: DirectoryRow[] = "rows" in dir && Array.isArray(dir.rows) ? dir.rows : [];
  const total = "total" in dir && typeof dir.total === "number" ? dir.total : tools.length;

  const breadcrumbTrail = [
    { name: "Home", href: "/" },
    { name: "Topics", href: "/topics" },
    { name: topic.name },
  ];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: topic.h1,
    description: topic.blurb,
    numberOfItems: tools.length,
    itemListElement: tools.map((t, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: t.name,
      url: `https://prother.dev/tools/${t.slug}`,
    })),
  };

  const toolSlugsSet = new Set(tools.map((t) => t.slug));
  const relevantShowdowns = POPULAR_SHOWDOWNS.filter(
    (s) => toolSlugsSet.has(s.toolA) || toolSlugsSet.has(s.toolB)
  ).slice(0, 4);

  const otherTopics = TOPICS.filter((t) => t.slug !== topic.slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-ink pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />

      {/* Header banner */}
      <div className="border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6">
          <Breadcrumbs trail={breadcrumbTrail} />

          <div className="mt-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ember">
                <span className="text-sm" aria-hidden>{topic.emoji}</span>
                Topic Directory
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                {topic.h1}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
                {topic.blurb}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white/80">
                <span className="font-bold text-ember">{total}</span>
                <span>{total === 1 ? "Tool" : "Tools"} Verified</span>
              </span>
              <Link
                href={`/tools?tag=${encodeURIComponent(topic.tag)}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white/80 hover:border-ember/40 hover:text-ember transition-colors"
              >
                <span>Filter in Directory</span>
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        {/* Tool grid */}
        {tools.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
            <Compass className="mx-auto size-8 text-white/50" aria-hidden />
            <p className="mt-4 font-mono text-sm uppercase tracking-wider text-white/60">
              No tools found for this topic yet
            </p>
            <p className="mt-2 text-sm text-white/60">
              We are constantly reviewing and ingesting new tools.
            </p>
            <Link
              href="/tools"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-wider text-white/80 hover:border-ember/40 hover:text-ember transition-colors"
            >
              Browse complete directory
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <article
                key={t.slug}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <ToolLogo
                      slug={t.slug}
                      name={t.name}
                      logoUrl={t.logoUrl}
                      emoji={t.emoji}
                      gradient={t.gradient}
                      size="lg"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {t.editorsPick && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ember">
                          <Star className="size-2.5 fill-current" aria-hidden />
                          Editor Pick
                        </span>
                      )}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/60">
                        {pricingBadge(t.pricing.model, t.pricing.price)}
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-white transition-colors group-hover:text-ember">
                    <Link href={`/tools/${t.slug}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/60">
                    {t.tagline}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-xs">
                  <span className="font-mono text-white/50 uppercase tracking-wider">
                    {t.category.emoji} {t.category.name}
                  </span>
                  <Link
                    href={`/tools/${t.slug}`}
                    className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ember hover:underline"
                  >
                    <span>View Spec</span>
                    <ArrowUpRight className="size-3" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Head-to-Head Showdowns */}
        {relevantShowdowns.length > 0 && (
          <section className="mt-16 border-t border-white/10 pt-12">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.25em] text-ember">
                  <Scale className="size-3.5" aria-hidden />
                  Head-to-Head Comparisons
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                  Popular {topic.name} Showdowns
                </h2>
              </div>
              <Link
                href="/compare"
                className="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-white/60 hover:text-ember transition-colors"
              >
                <span>All Comparisons</span>
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relevantShowdowns.map((s) => (
                <Link
                  key={s.slug}
                  href={`/compare/${s.slug}`}
                  className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-ember/40 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                      Showdown
                    </span>
                    <span className="rounded-full bg-ember/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-ember uppercase">
                      VS
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white group-hover:text-ember transition-colors">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    Side-by-side specs, pricing, and features
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Explore Other Topics */}
        <section className="mt-16 border-t border-white/10 pt-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/50">
            More Topics & Intents
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Related Collections
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherTopics.map((other) => (
              <Link
                key={other.slug}
                href={`/topics/${other.slug}`}
                className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>{other.emoji}</span>
                  <h3 className="text-sm font-semibold text-white group-hover:text-ember transition-colors">
                    {other.name}
                  </h3>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-white/55">
                  {other.tagline}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
