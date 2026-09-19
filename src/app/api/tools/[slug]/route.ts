import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { STANDARD_DEFS } from "@/lib/standards";
import type { ToolDetailResponse } from "@/lib/prother";

export const dynamic = "force-dynamic";

/** GET /api/tools/[slug] — full detail for the tool preview modal (PRD §10.1).
 *  Optional `?vk=<voterKey>` returns whether this visitor already upvoted. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const voterKey = new URL(req.url).searchParams.get("vk");

  const tool = await db.tool.findUnique({
    where: { slug },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { slug: true, name: true, emoji: true } },
    },
  });

  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  const scheduled = tool.launch?.scheduled ?? false;

  // 1-vote-per-visitor integrity: reflect this voter's existing ballot (F-14).
  const existingVote =
    voterKey && tool.launch
      ? await db.vote.findUnique({
          where: { launchId_voterKey: { launchId: tool.launch.id, voterKey } },
        })
      : null;
  const votedByVisitor = existingVote != null;

  const standards = STANDARD_DEFS.map((s) => ({
    ...s,
    // Live tools were checked against the full bar before they could launch;
    // scheduled launches are still in the verification queue.
    passed: !scheduled,
  }));

  const body: ToolDetailResponse = {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    description: tool.description,
    websiteUrl: tool.websiteUrl,
    emoji: tool.logoEmoji,
    gradient: tool.logoGradient,
    pricing: {
      model: tool.pricingModel,
      price: tool.startingPrice,
      note: tool.pricingNote,
    },
    category: tool.category,
    maker: tool.makerHandle,
    track: tool.track === "community" ? "community" : "editor_seed",
    badges: {
      editorsPick: tool.editorsPick,
      curated: tool.curated,
      relaunch: tool.relaunch,
      unclaimed: !tool.claimed,
      hasApi: tool.hasApi,
      openSource: tool.pricingModel === "open_source",
    },
    links: {
      github: tool.githubUrl,
      docs: tool.docsUrl,
      twitter: tool.twitterUrl,
    },
    votes: (tool.launch?.baseUpvotes ?? 0) + (tool.launch?._count.votes ?? 0),
    voted: votedByVisitor,
    launchId: tool.launch?.id ?? null,
    launchDate: tool.launch?.launchDate.toISOString() ?? null,
    scheduled,
    submittedAt: tool.createdAt.toISOString(),
    verified: tool.verifiedAt != null && !scheduled,
    standards,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
