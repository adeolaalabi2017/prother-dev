import type { Metadata } from "next";
import { SiteHeader } from "@/components/prother/site-header";
import { Hero } from "@/components/prother/hero";
import { CategoryTicker } from "@/components/prother/category-ticker";
import { HowItWorks } from "@/components/prother/how-it-works";
import { LaunchFeed } from "@/components/prother/launch-feed";
import { AgentEra } from "@/components/prother/agent-era";
import { Standards } from "@/components/prother/standards";
import { Faq } from "@/components/prother/faq";
import { FinalCta } from "@/components/prother/final-cta";
import { SiteFooter } from "@/components/prother/site-footer";
import { ToolExplorer } from "@/components/prother/tool-explorer";
import { SubmitWizard } from "@/components/prother/submit-wizard";
import { StatusTracker } from "@/components/prother/status-tracker";
import { EditorConsole } from "@/components/prother/editor-console";
import { ScrollProgress } from "@/components/prother/scroll-progress";
import { BackToTop } from "@/components/prother/back-to-top";
import { db } from "@/lib/prother";
import { clamp } from "@/lib/og";

/**
 * Server-side unfurl metadata for shareable tool deep links (?tool=<slug>).
 * The hash form (#tool=<slug>) can't reach the server, so "Copy link" now
 * shares the canonical ?tool= form — social crawlers get a real title,
 * description, and a dynamic OG image from /api/og?tool=<slug>.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const toolParam = params.tool;
  const slug = (Array.isArray(toolParam) ? toolParam[0] : toolParam)?.trim();

  if (!slug) return {};

  const tool = await db.tool.findUnique({
    where: { slug },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { name: true } },
    },
  });
  if (!tool) return {};

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

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-ink pb-16 text-foreground md:pb-0">
      <ScrollProgress />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <CategoryTicker />
        <HowItWorks />
        <LaunchFeed />
        <AgentEra />
        <Standards />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <ToolExplorer />
      <SubmitWizard />
      <StatusTracker />
      <EditorConsole />
      <BackToTop />
    </div>
  );
}
