import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { STANDARD_DEFS } from "@/lib/standards";
import type { RelatedToolRow, ToolDetailResponse } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import {
  cooldownInfo,
  isFollowing,
  latestClaimFor,
  relaunchAnchor,
  reviewByUser,
  reviewStats,
  serializeClaim,
  toolCommunityFields,
} from "@/lib/community";
import type { ReviewAggregate } from "@/lib/community";

export const dynamic = "force-dynamic";

/** Community fields appended to the classic detail payload (additive only). */
type ViewerState = {
  isMaker: boolean;
  following: boolean;
  canRelaunch: boolean;
  nextEligibleAt: string | null;
  claim: ReturnType<typeof serializeClaim> | null;
  myReview: { id: string; ease: number; power: number; value: number; body: string; status: string } | null;
  savedIn: { slug: string; name: string }[];
};

type ToolDetailWithCommunity = ToolDetailResponse & {
  reviews: { count: number; aggregate: ReviewAggregate | null };
  launchHistory: { version: string; note: string | null; launchedAt: string; totalVotes: number }[];
  relaunchCount: number;
  relaunchNote: string | null;
  originalLaunchDate: string | null;
  viewer: ViewerState | null;
};

/** GET /api/tools/[slug] — full detail for the tool preview modal (PRD §10.1).
 *  Optional `?vk=<voterKey>` returns whether this visitor already upvoted.
 *  Community layer (reviews / relaunch history / viewer state) is additive. */
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

  // "More like this" — up to 3 LIVE tools from the same category, most
  // upvoted first. Scheduled/teaser tools are excluded (not launched yet).
  const relatedRows = await db.tool.findMany({
    where: {
      categoryId: tool.categoryId,
      slug: { not: tool.slug },
      launch: { is: { scheduled: false } },
    },
    include: { launch: { select: { baseUpvotes: true } } },
    orderBy: { launch: { baseUpvotes: "desc" } },
    take: 3,
  });
  const related: RelatedToolRow[] = relatedRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    emoji: r.logoEmoji,
    gradient: r.logoGradient,
    tagline: r.tagline,
    votes: r.launch?.baseUpvotes ?? 0,
  }));

  // ── Community layer (F-16 / F-35 / F-30 / F-39 / F-41) ─────────────────
  // NOTE: toolCommunityFields goes through $queryRaw — makerEmail/relaunch
  // columns are post-boot additions the cached PrismaClient doesn't know.
  const [stats, fields, launchHistoryRows, user] = await Promise.all([
    reviewStats(tool.id),
    toolCommunityFields(tool.id),
    db.$queryRaw<{ version: string; note: string | null; launchedAt: number | string; totalVotes: number }[]>`
      SELECT version, note, launchedAt, totalVotes
      FROM RelaunchEvent
      WHERE toolId = ${tool.id}
      ORDER BY createdAt DESC
      LIMIT 20`,
    getAuthUser(),
  ]);

  let viewer: ViewerState | null = null;
  if (user) {
    const isMaker =
      (tool.claimed && fields.makerEmail === user.email) ||
      tool.makerHandle === `@${user.handle}`;
    const [following, anchor, claim, myReview, savedInRows] = await Promise.all([
      isFollowing(user.email, "tool", tool.slug),
      isMaker
        ? relaunchAnchor(tool.id, {
            originalLaunchDate: fields.originalLaunchDate,
            launch: tool.launch,
          })
        : Promise.resolve(new Date(0)),
      latestClaimFor(tool.id, user.email),
      reviewByUser(tool.id, user.id),
      db.$queryRaw<{ slug: string; name: string }[]>`
        SELECT c.slug, c.name
        FROM CollectionItem ci
        JOIN Collection c ON c.id = ci.collectionId
        WHERE ci.toolId = ${tool.id} AND c.ownerEmail = ${user.email}
        ORDER BY ci.position ASC
        LIMIT 50`,
    ]);
    const cooldown = isMaker ? cooldownInfo(anchor) : { eligible: false, nextEligibleAt: null };
    viewer = {
      isMaker,
      following,
      canRelaunch: isMaker && cooldown.eligible,
      nextEligibleAt: isMaker ? cooldown.nextEligibleAt : null,
      claim: claim ? serializeClaim(claim) : null,
      myReview: myReview
        ? {
            id: myReview.id,
            ease: myReview.ease,
            power: myReview.power,
            value: myReview.value,
            body: myReview.body,
            status: myReview.status,
          }
        : null,
      savedIn: savedInRows,
    };
  }

  const body: ToolDetailWithCommunity = {
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
    related,
    reviews: { count: stats.count, aggregate: stats.aggregate },
    launchHistory: launchHistoryRows.map((r) => ({
      version: r.version,
      note: r.note,
      launchedAt: new Date(r.launchedAt).toISOString(),
      totalVotes: Number(r.totalVotes),
    })),
    relaunchCount: fields.relaunchCount,
    relaunchNote: fields.relaunchNote,
    originalLaunchDate: fields.originalLaunchDate,
    viewer,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
