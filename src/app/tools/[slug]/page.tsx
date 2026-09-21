import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Clock,
  MessagesSquare,
  Star,
  Triangle,
} from "lucide-react";
import { db } from "@/lib/prother";
import { clamp } from "@/lib/og";
import { listPublishedReviews, reviewStats } from "@/lib/community";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ToolDetailActions } from "@/components/prother/tool-detail-actions";

/**
 * /tools/[slug] — the real, crawlable tool detail page (Task 25).
 *
 * Server-rendered from the ORM: header, badges, pricing/maker/launch meta,
 * description, tags, links, published reviews (with the shared reviewStats
 * aggregate), forum mentions, launch notes and related tools. The only
 * client island is <ToolDetailActions /> (vote / save / share / report) —
 * everything else is static HTML so search engines see the full listing.
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
    "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase",
    extra
  );
}

const SECTION_HEAD = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const tool = await db.tool.findUnique({
    where: { slug },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { name: true } },
    },
  });
  // Unknown slug or removed/unlisted tool → 404 covers the meta too.
  if (!tool || tool.status !== "live") notFound();

  // Tomorrow teaser: keep the URL alive but out of the index (thin content).
  if (tool.launch?.scheduled) {
    return {
      title: `${tool.name} — launching soon | Prother`,
      robots: { index: false, follow: true },
    };
  }

  const votes = (tool.launch?.baseUpvotes ?? 0) + (tool.launch?._count.votes ?? 0);
  const title = `${tool.name} — ${tool.tagline} | Prother`;
  const description = clamp(
    `Live on Prother · ${tool.category.name} · ▲ ${votes} votes. ${tool.description || tool.tagline}`,
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
  const tool = await db.tool.findUnique({
    where: { slug },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { slug: true, name: true, emoji: true } },
    },
  });
  if (!tool || tool.status !== "live") notFound();

  const votes = (tool.launch?.baseUpvotes ?? 0) + (tool.launch?._count.votes ?? 0);
  const scheduled = tool.launch?.scheduled ?? false;
  const name = tool.name;
  const launchId = tool.launch?.id ?? null;
  const launchDate = tool.launch?.launchDate ?? null;

  // ── Tomorrow teaser → minimal "Launching soon" panel, no full content ──
  if (scheduled) {
    return (
      <div className="bg-ink pb-16 md:pb-0">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
          <Breadcrumbs
            trail={[
              { name: "Home", href: "/" },
              { name: "AI tools", href: "/tools" },
              { name },
            ]}
          />
          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <span
              aria-hidden
              className={cn(
                "grid size-14 place-items-center rounded-2xl bg-gradient-to-br text-3xl shadow-xl",
                tool.logoGradient
              )}
            >
              {tool.logoEmoji}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">{name}</h1>
            <p className="text-sm text-white/60">{tool.tagline}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.3em] text-ember">
              <Clock className="size-3.5" aria-hidden />
              Launching soon
            </p>
            <p className="max-w-sm text-sm text-white/55">
              This product goes live on the Prother feed tomorrow — come back on
              launch day to upvote it and read the first verdicts.
            </p>
            <Link
              href="/#feed"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ember transition-colors hover:bg-ember/20"
            >
              Today&apos;s feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Full live listing — everything below is server-rendered ────────────
  const [stats, reviews, comments, threads, relatedRows] = await Promise.all([
    reviewStats(tool.id),
    db.review.findMany({
      where: { toolId: tool.id, status: "published" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.comment.findMany({
      where: { toolId: tool.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.forumThread.findMany({
      where: {
        hidden: false,
        OR: [{ title: { contains: name } }, { body: { contains: name } }],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { slug: true, title: true, author: true, createdAt: true },
    }),
    // Mirror the API's "More like this" query (live tools, same category,
    // most upvoted first — scheduled teasers excluded).
    db.tool.findMany({
      where: {
        categoryId: tool.categoryId,
        slug: { not: tool.slug },
        status: "live",
        launch: { is: { scheduled: false } },
      },
      include: {
        launch: { select: { baseUpvotes: true, _count: { select: { votes: true } } } },
      },
      orderBy: { launch: { baseUpvotes: "desc" } },
      take: 3,
    }),
  ]);

  const aggregate = stats.aggregate;
  const related = relatedRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    emoji: r.logoEmoji,
    gradient: r.logoGradient,
    tagline: r.tagline,
    votes: (r.launch?.baseUpvotes ?? 0) + (r.launch?._count.votes ?? 0),
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
                aria-hidden
                className={cn(
                  "grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-4xl shadow-xl sm:size-20",
                  tool.logoGradient
                )}
              >
                {tool.logoEmoji}
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
              {tool.relaunch && (
                <li
                  title={tool.relaunchNote ?? undefined}
                  className={chipCx("border-mint/30 bg-mint/10 text-mint")}
                >
                  Re-launch
                </li>
              )}
              {!tool.claimed && <li className={chipCx("text-white/40")}>Unclaimed</li>}
              {tool.hasApi && <li className={chipCx("text-white/60")}>API ✓</li>}
              {tool.pricingModel === "open_source" && (
                <li className={chipCx("text-white/60")}>Open source</li>
              )}
              <li className={chipCx("text-white/60")}>
                {tool.track === "community" ? "Submitted" : "Seed"}
              </li>
            </ul>

            {/* Mono meta line: pricing · maker · launch date (UTC, static) */}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-white/45">
              <span title={tool.pricingNote ?? undefined} className="text-ember">
                {pricingLine(tool.pricingModel, tool.startingPrice)}
              </span>
              <span aria-hidden className="text-white/25">
                ·
              </span>
              <span>{tool.makerHandle}</span>
              {launchDate && (
                <>
                  <span aria-hidden className="text-white/25">
                    ·
                  </span>
                  <span>Launched {utcDateLabel(launchDate)}</span>
                </>
              )}
            </p>

            {/* Category chip — a real link to the crawlable category page */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/categories/${tool.category.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
              >
                <span aria-hidden>{tool.category.emoji}</span>
                {tool.category.name}
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] tracking-wider text-ember uppercase">
                <Triangle className="size-2.5 fill-current" aria-hidden />
                {votes} votes
              </span>
            </div>

            {/* Interactive actions (client island) */}
            <ToolDetailActions
              slug={tool.slug}
              name={name}
              launchId={launchId}
              initialVotes={votes}
            />
          </header>

          {/* b. About */}
          {tool.description && (
            <section aria-label={`About ${name}`} className="space-y-3">
              <h2 className={SECTION_HEAD}>About {name}</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-white/80 sm:text-base">
                {tool.description}
              </p>
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
                className="inline-flex items-center gap-2 rounded-lg border border-ember/40 bg-ember/10 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ember transition-colors hover:bg-ember/20"
              >
                Visit website
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
              {tool.githubUrl && (
                <a
                  href={tool.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] tracking-wider text-white/60 uppercase transition-colors hover:border-ember/40 hover:text-ember"
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
                  <span className="text-sm text-white/35">/5</span>
                </span>
                <span className="font-mono text-[10px] tracking-wider text-white/40 uppercase">
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
                No reviews yet — launch-day verdicts land here.
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
                      <span aria-hidden className="text-white/25">
                        ·
                      </span>
                      <span className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
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
                        className="size-4 shrink-0 text-white/35 transition-colors group-hover:text-ember"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white/85 transition-colors group-hover:text-ember">
                          {t.title}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-white/35 uppercase">
                          {t.author} · {utcDateLabel(t.createdAt)}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-white/25 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/forums"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ember transition-colors hover:text-ember-hot"
            >
              Start a discussion
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </section>

          {/* g. Launch notes — recent launch-day comments */}
          {comments.length > 0 && (
            <section aria-label="Launch notes" className="space-y-3">
              <h2 className={SECTION_HEAD}>Launch notes</h2>
              <ul className="space-y-2">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-xs font-semibold tracking-wider text-white/85">
                        {c.author}
                      </span>
                      {c.isMaker && (
                        <span className={chipCx("border-ember/30 bg-ember/10 text-ember")}>
                          Maker
                        </span>
                      )}
                      <span aria-hidden className="text-white/25">
                        ·
                      </span>
                      <span className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
                        {utcDateLabel(c.createdAt)}
                      </span>
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-white/70">
                      {c.body}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* h. More like this — real links to sibling listings */}
          {related.length > 0 && (
            <section aria-label="More like this" className="space-y-3">
              <h2 className={SECTION_HEAD}>More like this</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/tools/${r.slug}`}
                    aria-label={`Open ${r.name} — ${r.tagline}`}
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
                      <span className="shrink-0 font-mono text-xs tabular-nums text-ember">
                        ▲{r.votes}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-snug text-white/45">
                      {r.tagline}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Back to the directory — crawlable path Home → /tools → tool */}
        <p className="mt-14 border-t border-white/10 pt-6">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] text-white/40 uppercase transition-colors hover:text-ember"
          >
            <Check className="size-3.5" aria-hidden />
            Browse all AI tools on Prother
          </Link>
        </p>
      </div>
    </div>
  );
}
