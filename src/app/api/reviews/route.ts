import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import {
  isReviewMaker,
  listPublishedReviews,
  reviewByUser,
  reviewStats,
  serializeReview,
  toolCommunityFields,
  upsertReviewRow,
} from "@/lib/community";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  toolSlug: z.string().min(1).max(80),
  ease: z.number().int().min(1).max(5),
  power: z.number().int().min(1).max(5),
  value: z.number().int().min(1).max(5),
  body: z.string().min(20).max(2000),
});

/**
 * GET /api/reviews?tool=<slug> — published reviews + aggregate (unlocks at
 * ≥3 published), plus the viewer's own review and review eligibility (F-16).
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("tool")?.trim() || "";
  if (!slug) {
    return NextResponse.json({ error: "tool_required" }, { status: 400 });
  }

  const tool = await db.tool.findUnique({
    where: { slug },
    select: {
      id: true,
      claimed: true,
      websiteUrl: true,
      launch: { select: { scheduled: true } },
    },
  });
  if (!tool) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }

  const [user, published, stats, fields] = await Promise.all([
    getAuthUser(),
    listPublishedReviews(tool.id),
    reviewStats(tool.id),
    toolCommunityFields(tool.id),
  ]);

  // Published reviews for everyone; the viewer's own (even a filtered one)
  // is merged in and flagged mine=true.
  const mineRow = user ? await reviewByUser(tool.id, user.id) : null;
  const rows = [...published];
  if (mineRow && !rows.some((r) => r.id === mineRow.id)) {
    rows.unshift(mineRow);
  }
  const reviews = rows.map((r) => serializeReview(r, r.userId === user?.id));

  // Eligibility: anon → auth; scheduled launch → scheduled; maker → maker.
  // (makerEmail is a post-boot column — compare the raw-fetched value.)
  let canReview = true;
  let reason: null | "auth" | "maker" | "scheduled" = null;
  if (!user) {
    canReview = false;
    reason = "auth";
  } else if (tool.launch?.scheduled) {
    canReview = false;
    reason = "scheduled";
  } else if (
    isReviewMaker(
      { claimed: tool.claimed, makerEmail: fields.makerEmail, websiteUrl: tool.websiteUrl },
      user
    )
  ) {
    canReview = false;
    reason = "maker";
  }

  return NextResponse.json(
    {
      count: stats.count,
      aggregate: stats.aggregate,
      reviews,
      mine: mineRow != null,
      canReview,
      reason,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * POST /api/reviews — upsert the signed-in user's review (unique per
 * tool+user). Accounts younger than 48h land in the "filtered" soft-
 * moderation queue; everyone else publishes immediately (F-16).
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }
  const { toolSlug, ease, power, value, body } = parsed.data;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const tool = await db.tool.findUnique({
    where: { slug: toolSlug },
    select: {
      id: true,
      claimed: true,
      websiteUrl: true,
      launch: { select: { scheduled: true } },
    },
  });
  if (!tool) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }
  if (tool.launch?.scheduled) {
    return NextResponse.json({ error: "scheduled" }, { status: 403 });
  }
  const fields = await toolCommunityFields(tool.id);
  if (
    isReviewMaker(
      { claimed: tool.claimed, makerEmail: fields.makerEmail, websiteUrl: tool.websiteUrl },
      user
    )
  ) {
    return NextResponse.json({ error: "maker_self" }, { status: 403 });
  }

  // <48h accounts → soft-moderation filter (P3 policy).
  const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
  const status = accountAgeMs < 48 * 3_600_000 ? "filtered" : "published";

  const row = await upsertReviewRow({
    toolId: tool.id,
    userId: user.id,
    author: `@${user.handle}`,
    ease,
    power,
    value,
    body,
    status,
  });

  const stats = await reviewStats(tool.id);

  return NextResponse.json(
    { review: serializeReview(row, true), count: stats.count, aggregate: stats.aggregate },
    { status: 201 }
  );
}
