import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/admin";
import { convexClaimSettle, shadowClaimById } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * POST /api/claims/[id]/verify — fetch the tool's site and match the
 * prother-claim meta token (both attribute orders, case-insensitive).
 * Match → claim verified + listing rights transferred (audited).
 * No match / unreachable → claim marked failed with a reason (UI offers
 * retry + editor arbitration hint).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  // Convex-only (claims cutover): claim + tool resolve in one query; every
  // outcome settles atomically via claimSettle.
  const client = createServerConvexClient()!;
  const loaded = await shadowClaimById(client, id);
  if (!loaded) {
    return NextResponse.json({ error: "claim_not_found" }, { status: 404 });
  }
  const { claim, tool } = loaded;
  if (claim.userEmail !== user.email) {
    return NextResponse.json({ error: "not_your_claim" }, { status: 403 });
  }

  // Already verified — idempotent replay.
  if (claim.status === "verified") {
    return NextResponse.json({ verified: true, claim });
  }

  if (!tool) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }

  // Someone else claimed the listing while this claim was pending.
  if (tool.claimed && tool.makerEmail !== user.email) {
    const updated = await convexClaimSettle(client, {
      claimLegacyId: claim.id,
      status: "failed",
      note: "listing_already_claimed",
      nowMs: Date.now(),
    });
    return NextResponse.json({
      verified: false,
      reason: "listing_already_claimed",
      claim: updated,
    });
  }

  // Fetch the maker's page and look for the token in any <meta> tag.
  let html = "";
  let fetchError: string | null = null;
  try {
    const res = await fetch(tool.websiteUrl, {
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
      headers: { "user-agent": "ProtherClaimBot/1.0 (+https://prother.dev)" },
    });
    if (!res.ok) {
      fetchError = `http_${res.status}`;
    } else {
      const text = await res.text();
      html = text.slice(0, 512 * 1024); // meta tags live in <head> — cap the scan
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  if (fetchError) {
    const reason = `site_unreachable: ${fetchError.slice(0, 200)}`;
    const updated = await convexClaimSettle(client, {
      claimLegacyId: claim.id,
      status: "failed",
      note: reason,
      nowMs: Date.now(),
    });
    return NextResponse.json({
      verified: false,
      reason,
      claim: updated,
    });
  }

  const tokenFound = findClaimToken(html, claim.token);

  if (tokenFound) {
    const nowMs = Date.now();
    const updated = await convexClaimSettle(client, {
      claimLegacyId: claim.id,
      status: "verified",
      verifiedAt: nowMs,
      transfer: { email: user.email, handle: user.handle },
      nowMs,
    });
    logAudit("claim.verified", "tool", tool.slug, `meta_tag verified by ${user.email}`);
    return NextResponse.json({
      verified: true,
      claim: updated,
    });
  }

  const updated = await convexClaimSettle(client, {
    claimLegacyId: claim.id,
    status: "failed",
    note: "token_not_found",
    nowMs: Date.now(),
  });
  return NextResponse.json({
    verified: false,
    reason: "token_not_found",
    claim: updated,
  });
}

/**
 * Token matcher: scans every <meta …> tag and requires BOTH a
 * name="prother-claim" attribute and a content="TOKEN" attribute on the
 * SAME tag, in any attribute order, case-insensitively.
 */
function findClaimToken(html: string, token: string): boolean {
  const tagRe = /<meta\b[^>]*>/gi;
  const nameRe = /name\s*=\s*["']([^"']*)["']/i;
  const contentRe = /content\s*=\s*["']([^"']*)["']/i;
  for (const tag of html.match(tagRe) ?? []) {
    const name = tag.match(nameRe)?.[1]?.trim().toLowerCase();
    if (name !== "prother-claim") continue;
    const content = tag.match(contentRe)?.[1]?.trim();
    if (content === token) return true;
  }
  return false;
}
