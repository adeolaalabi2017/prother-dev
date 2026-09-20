import type { Metadata } from "next";
import { SiteHeader } from "@/components/prother/site-header";
import { Hero } from "@/components/prother/hero";
import { CategoryTicker } from "@/components/prother/category-ticker";
import { HowItWorks } from "@/components/prother/how-it-works";
import { LaunchFeed } from "@/components/prother/launch-feed";
import { AgentEra } from "@/components/prother/agent-era";
import { TrendingStrip } from "@/components/prother/trending-strip";
import { Standards } from "@/components/prother/standards";
import { Journal } from "@/components/prother/journal";
import { Faq } from "@/components/prother/faq";
import { FinalCta } from "@/components/prother/final-cta";
import { SiteFooter } from "@/components/prother/site-footer";
import { ToolExplorer } from "@/components/prother/tool-explorer";
import { SubmitWizard } from "@/components/prother/submit-wizard";
import { StatusTracker } from "@/components/prother/status-tracker";
import { EditorConsole } from "@/components/prother/editor-console";
import { AdminConsole } from "@/components/prother/admin-console";
import { AuthProvider } from "@/components/prother/auth-provider";
import { AuthMenu } from "@/components/prother/auth-menu";
import { DeepLinkHost } from "@/components/prother/deep-link-host";
import { CompareTray } from "@/components/prother/compare-tray";
import { ToolFullPage } from "@/components/prother/tool-full-page";
import { PostFullPage } from "@/components/prother/post-full-page";
import { CategoryFullPage } from "@/components/prother/category-full-page";
import { LaunchesFullPage } from "@/components/prother/launches-full-page";
import { CompareFullPage } from "@/components/prother/compare-full-page";
import { CollectionFullPage } from "@/components/prother/collection-full-page";
import { CollectionsMineFullPage } from "@/components/prother/collections-mine-full-page";
import { ScrollProgress } from "@/components/prother/scroll-progress";
import { BackToTop } from "@/components/prother/back-to-top";
import { db } from "@/lib/prother";
import { clamp } from "@/lib/og";
import { CATEGORY_BLURBS } from "@/lib/category-blurbs";
// hero-rebalance: single-column centered hero (daily-digest panel removed per feedback)

/**
 * Server-side unfurl metadata for the single-route deep links. Post-sandbox
 * these become real routes: /tool/{slug} · /journal/{slug} · /category/{slug}
 * · /launches/{date} · /compare/{a}/{b} · /collections/{slug} — the metadata
 * plumbing below moves over one-to-one.
 */
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
  const launchesDate = first(params.launches);
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
      include: {
        launch: { include: { _count: { select: { votes: true } } } },
        category: { select: { name: true } },
      },
    });
    if (tool) {
      const votes = (tool.launch?.baseUpvotes ?? 0) + (tool.launch?._count.votes ?? 0);
      const scheduled = tool.launch?.scheduled ?? false;
      const title = `${tool.name} — ${tool.tagline} | Prother`;
      const description = clamp(
        `${scheduled ? "Launching" : "Live"} on Prother · ${tool.category.name} · ▲ ${votes} votes. ${tool.description || tool.tagline}`,
        200,
      );
      return {
        title,
        description,
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
        const title = `${a.name} vs ${b.name} — Compare AI tools | Prother`;
        const description = clamp(
          `Side-by-side comparison: ${a.name} (${a.tagline}) vs ${b.name} (${b.tagline}) — votes, ratings, pricing, and more.`,
          200,
        );
        return { title, description, robots: { index: true, follow: true } };
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
      const title = `${c.name} — Curated collection | Prother`;
      const description = clamp(
        `${c.description || `A curated collection of ${c._count.items} AI tools`}, hand-picked by ${c.ownerName} on Prother.`,
        200,
      );
      return { title, description };
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
      const title = `${cat.name} — AI tools, ranked | Prother`;
      const description = clamp(`${blurb} ${cat._count.tools} tools listed.`, 200);
      return { title, description };
    }
    return {};
  }

  // Launch archive deep link (?launches=YYYY-MM-DD) — daily indexable page.
  if (launchesDate && /^\d{4}-\d{2}-\d{2}$/.test(launchesDate)) {
    const start = new Date(`${launchesDate}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start.getTime() + 86_400_000);
      const count = await db.launch.count({
        where: { scheduled: false, launchDate: { gte: start, lt: end } },
      });
      const label = start.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
      return {
        title: `AI launches on ${label} | Prother`,
        description: clamp(
          count > 0
            ? `${count} AI ${count === 1 ? "tool" : "tools"} launched on ${label} — final standings, votes, and makers.`
            : `The AI launch archive for ${label} on Prother — where AI products launch.`,
          200,
        ),
      };
    }
    return {};
  }

  // Personal space (?mine=collections) — never indexed.
  if (mineView) {
    return { title: "My collections & follows | Prother", robots: { index: false } };
  }

  return {};
}

/** Stack order matters: later components render on top (higher in DOM). */
export default function Page() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col overflow-x-clip bg-ink pb-16 text-foreground md:pb-0">
        <ScrollProgress />
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <CategoryTicker />
          <HowItWorks />
          <LaunchFeed />
          <AgentEra />
          <TrendingStrip />
          <Standards />
          <Journal />
          <Faq />
          <FinalCta />
        </main>
        <SiteFooter />
        <ToolExplorer />
        <SubmitWizard />
        <StatusTracker />
        <EditorConsole />
        <AdminConsole />
        <CompareTray />
        <DeepLinkHost />
        {/* ── Full-page deep-link stack (each renders null when closed) ── */}
        <CollectionsMineFullPage />
        <CollectionFullPage />
        <CategoryFullPage />
        <LaunchesFullPage />
        <CompareFullPage />
        <PostFullPage />
        <ToolFullPage />
        <BackToTop />
      </div>
    </AuthProvider>
  );
}

// full-page router — PostReader dialog retired (see worklog Task 16)

