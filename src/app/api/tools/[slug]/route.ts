import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { STANDARD_DEFS } from "@/lib/standards";
import type { RelatedToolRow, ToolDetailResponse } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import { commentCountsByTool } from "@/lib/discussion";
import { toolMediaByIds } from "@/lib/media";
import {
  editorialByToolIds,
  resolveAlternatives,
} from "@/lib/tool-editorial";
import {
  isFollowing,
  latestClaimFor,
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
  claim: ReturnType<typeof serializeClaim> | null;
  myReview: { id: string; ease: number; power: number; value: number; body: string; status: string } | null;
  savedIn: { slug: string; name: string }[];
};

type ToolDetailWithCommunity = ToolDetailResponse & {
  reviews: { count: number; aggregate: ReviewAggregate | null };
  /** Total comments on the listing's discussion. */
  comments: number;
  viewer: ViewerState | null;
};

/** GET /api/tools/[slug] — full detail for the tool preview modal (PRD §10.1).
 *  Community layer (reviews / discussion / viewer state) is additive. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tool = await db.tool.findUnique({
    where: { slug },
    include: {
      category: { select: { slug: true, name: true, emoji: true } },
    },
  });

  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  // Live tools were checked against the full quality bar before listing.
  const standards = STANDARD_DEFS.map((s) => ({ ...s, passed: true }));

  // "More like this" — up to 3 LIVE tools from the same category, Editor's
  // Picks first, then newest listings.
  const relatedRows = await db.tool.findMany({
    where: {
      categoryId: tool.categoryId,
      slug: { not: tool.slug },
      status: "live",
    },
    orderBy: [{ editorsPick: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      slug: true,
      name: true,
      logoEmoji: true,
      logoGradient: true,
      tagline: true,
      editorsPick: true,
    },
  });
  const related: RelatedToolRow[] = relatedRows.map((r) => ({
    slug: r.slug,
    name: r.name,
    emoji: r.logoEmoji,
    gradient: r.logoGradient,
    tagline: r.tagline,
    editorsPick: r.editorsPick,
  }));

  // ── Community layer (F-16 / F-35 / F-30 / F-39 / F-41) ─────────────────
  // NOTE: toolCommunityFields goes through $queryRaw — makerEmail is a
  // post-boot column the cached PrismaClient doesn't know.
  const [stats, fields, commentCounts, user, mediaMap, editorialMap, toolCount] = await Promise.all([
    reviewStats(tool.id),
    toolCommunityFields(tool.id),
    commentCountsByTool([tool.id]),
    getAuthUser(),
    // POST-boot media columns → raw SQL (stale-PrismaClient rule).
    toolMediaByIds([tool.id]),
    // POST-boot editorial columns → raw SQL (lib/tool-editorial.ts).
    editorialByToolIds([tool.id]),
    // Live listings in the category (drives the "N tools" meta line).
    db.tool.count({ where: { categoryId: tool.categoryId, status: "live" } }),
  ]);
  // Editorial "alternatives" resolved to live directory rows, order kept
  // (depends on the editorial map above, so it runs after the batch).
  const editorial = editorialMap.get(tool.id);
  const alternatives = editorial
    ? await resolveAlternatives(editorial.alternativeSlugs, tool.slug)
    : [];

  let viewer: ViewerState | null = null;
  if (user) {
    const isMaker =
      (tool.claimed && fields.makerEmail === user.email) ||
      tool.makerHandle === `@${user.handle}`;
    const [following, claim, myReview, savedInRows] = await Promise.all([
      isFollowing(user.email, "tool", tool.slug),
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
    viewer = {
      isMaker,
      following,
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
    // Uploaded media (POST-boot columns → raw SQL, lib/media.ts). The logo
    // falls back to the emoji tile when null; screenshots power the gallery.
    logoUrl: mediaMap.get(tool.id)?.logoUrl ?? null,
    screenshots: mediaMap.get(tool.id)?.screenshotUrls ?? [],
    // Editorial enrichment (POST-boot columns → raw SQL, lib/tool-editorial).
    longDescription: editorial?.longDescription ?? null,
    useCases: editorial?.useCases ?? [],
    pros: editorial?.pros ?? [],
    cons: editorial?.cons ?? [],
    alternatives,
    pricingCheckedAt: editorial?.pricingCheckedAt
      ? editorial.pricingCheckedAt.toISOString()
      : null,
    contentUpdatedAt: editorial?.contentUpdatedAt
      ? editorial.contentUpdatedAt.toISOString()
      : null,
    pricing: {
      model: tool.pricingModel,
      price: tool.startingPrice,
      note: tool.pricingNote,
    },
    category: { ...tool.category, toolCount },
    maker: tool.makerHandle,
    track: tool.track === "community" ? "community" : "editor_seed",
    badges: {
      editorsPick: tool.editorsPick,
      curated: tool.curated,
      unclaimed: !tool.claimed,
      hasApi: tool.hasApi,
      openSource: tool.pricingModel === "open_source",
    },
    links: {
      github: tool.githubUrl,
      docs: tool.docsUrl,
      twitter: tool.twitterUrl,
    },
    submittedAt: tool.createdAt.toISOString(),
    verified: tool.verifiedAt != null,
    standards,
    related,
    reviews: { count: stats.count, aggregate: stats.aggregate },
    comments: commentCounts.get(tool.id) ?? 0,
    viewer,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
