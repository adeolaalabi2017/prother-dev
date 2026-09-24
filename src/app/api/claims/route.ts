import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/admin";
import { newClaimToken, sameDomain } from "@/lib/community";
import {
  convexClaimInsert,
  shadowClaimLatest,
  shadowClaimState,
} from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  toolSlug: z.string().min(1).max(80),
});

/**
 * GET /api/claims?tool=<slug> — claim state for the viewer (auth optional).
 * claimable = the listing is still unclaimed; claim = the viewer's own
 * claim (any status), null when signed out or never claimed.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("tool")?.trim() || "";
  if (!slug) {
    return NextResponse.json({ error: "tool_required" }, { status: 400 });
  }
  const user = await getAuthUser();

  // Convex-only (claims cutover).
  const client = createServerConvexClient()!;
  const res = await shadowClaimState(client, slug, user?.email);
  if ("error" in res) {
    return NextResponse.json(res, {
      status: 404,
      headers: { "x-data-backend": "convex" },
    });
  }
  return NextResponse.json(res, {
    headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
  });
}

/**
 * POST /api/claims — start an ownership claim (F-30). Auto-verifies via
 * email domain when the signed-in email's domain matches the listing's
 * domain; otherwise issues a meta-tag token and waits for verification.
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

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  // Convex-only (claims cutover): tool website/claimed + latest own claim
  // resolve in one query; inserts guard tool_not_found/already_claimed and
  // token uniqueness atomically.
  const client = createServerConvexClient()!;
  const convexErr = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);
  const info = await shadowClaimLatest(client, parsed.data.toolSlug, user.email);
  if (!info) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }
  if (info.tool.claimed) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }

  // Idempotent: an in-flight (pending) or retryable (failed) claim is
  // returned as-is — Verify can retry failed claims, so no new token is cut.
  const existing = info.claim;
  if (existing && (existing.status === "pending" || existing.status === "failed")) {
    return NextResponse.json({
      claim: existing,
      verified: false,
      metaTag: `<meta name="prother-claim" content="${existing.token}">`,
      instructions: metaTagInstructions(info.tool.websiteUrl),
    });
  }

  // Email-domain auto-verify: signed-in email domain == listing domain.
  // The insert transfers rights atomically (mirrors insertClaim +
  // approveClaimAndTransfer).
  if (sameDomain(user.email, info.tool.websiteUrl)) {
    const claimId = crypto.randomUUID();
    const nowMs = Date.now();
    const autoToken = newClaimToken();
    try {
      const claim = await convexClaimInsert(client, {
        id: claimId,
        toolSlug: parsed.data.toolSlug,
        userEmail: user.email,
        userName: user.name,
        method: "email_domain",
        token: autoToken,
        status: "verified",
        verifiedAt: nowMs,
        createdAt: nowMs,
        transfer: { email: user.email, handle: user.handle },
        nowMs,
      });
      logAudit("claim.verified", "tool", parsed.data.toolSlug, `email_domain auto-verify by ${user.email}`);
      return NextResponse.json(
        { claim, verified: true, method: "email_domain" },
        { status: 201 }
      );
    } catch (err) {
      const m = convexErr(err);
      if (m.includes("tool_not_found")) {
        return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
      }
      if (m.includes("already_claimed")) {
        return NextResponse.json({ error: "already_claimed" }, { status: 409 });
      }
      console.error("[api:claims] auto-verify failed:", claimId, err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // Meta-tag flow: the insert guards token uniqueness (token_taken) — retry
  // with a fresh token on the vanishingly rare collision.
  const claimId = crypto.randomUUID();
  const nowMs = Date.now();
  let finalToken = newClaimToken();
  for (let i = 0; i < 3; i++) {
    try {
      const claim = await convexClaimInsert(client, {
        id: claimId,
        toolSlug: parsed.data.toolSlug,
        userEmail: user.email,
        userName: user.name,
        method: "meta_tag",
        token: finalToken,
        status: "pending",
        createdAt: nowMs,
      });
      return NextResponse.json(
        {
          claim,
          verified: false,
          metaTag: `<meta name="prother-claim" content="${finalToken}">`,
          instructions: metaTagInstructions(info.tool.websiteUrl),
        },
        { status: 201 }
      );
    } catch (err) {
      if (convexErr(err).includes("token_taken") && i < 2) {
        finalToken = newClaimToken();
        continue;
      }
      console.error("[api:claims] claimInsert failed:", claimId, err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

function metaTagInstructions(websiteUrl: string): string[] {
  return [
    `Add the meta tag to the <head> of ${websiteUrl}`,
    "Deploy the change",
    "Press Verify: we fetch your page and match the token",
  ];
}
