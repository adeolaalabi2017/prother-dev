import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { isUserBanned } from "@/lib/users";
import { isReviewMaker } from "@/lib/community";
import { convexReviewUpsert, shadowReviewsData } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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

  const client = createServerConvexClient()!;
  const user = await getAuthUser();

  try {
    const res = await shadowReviewsData(client, slug, user?.id);
    if ("error" in res) {
      return NextResponse.json(res, {
        status: 404,
        headers: { "x-data-backend": "convex" },
      });
    }
    // Published reviews for everyone; the viewer's own (even a filtered one)
    // is merged in and flagged mine=true.
    const rows = [...res.published];
    if (res.mineRow && !rows.some((r) => r.id === res.mineRow!.id)) {
      rows.unshift(res.mineRow);
    }
    const reviews = rows.map(({ userId, ...r }) => ({
      ...r,
      mine: userId === user?.id,
    }));

    // Eligibility: anon → auth; maker → maker. Reviews are open immediately
    // for any live listing — no launch-day gating.
    let canReview = true;
    let reason: null | "auth" | "maker" = null;
    if (!user) {
      canReview = false;
      reason = "auth";
    } else if (
      isReviewMaker(
        { claimed: res.tool.claimed, makerEmail: res.tool.makerEmail, websiteUrl: res.tool.websiteUrl },
        user
      )
    ) {
      canReview = false;
      reason = "maker";
    }

    return NextResponse.json(
      {
        count: res.stats.count,
        aggregate: res.stats.aggregate,
        reviews,
        mine: res.mineRow != null,
        canReview,
        reason,
      },
      { headers: { "Cache-Control": "no-store", "x-data-backend": "convex" } }
    );
  } catch (err) {
    console.error("[api:reviews] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/reviews — upsert the signed-in user's review (unique per
 * tool+user). Reviews are open immediately for any live listing. Accounts
 * younger than 48h land in the "filtered" soft-moderation queue; everyone
 * else publishes immediately (F-16).
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
  if (await isUserBanned(user.id)) {
    return NextResponse.json(
      { error: "account_banned", message: "This account can no longer review." },
      { status: 403 }
    );
  }

  const client = createServerConvexClient()!;
  try {
    const lookup = await shadowReviewsData(client, toolSlug);
    if ("error" in lookup) {
      return NextResponse.json(lookup, { status: 404 });
    }
    if (
      isReviewMaker(
        {
          claimed: lookup.tool.claimed,
          makerEmail: lookup.tool.makerEmail,
          websiteUrl: lookup.tool.websiteUrl,
        },
        user
      )
    ) {
      return NextResponse.json({ error: "maker_self" }, { status: 403 });
    }

    // <48h accounts → soft-moderation filter (P3 policy).
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    const status = accountAgeMs < 48 * 3_600_000 ? "filtered" : "published";

    const now = Date.now();
    const res = await convexReviewUpsert(client, {
      id: crypto.randomUUID(),
      toolSlug,
      userId: user.id,
      author: `@${user.handle}`,
      ease,
      power,
      value,
      body,
      status,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        review: { ...res.review, mine: true },
        count: res.count,
        aggregate: res.aggregate,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api:reviews] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
