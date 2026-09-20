import { NextResponse } from "next/server";
import { db } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/admin";
import {
  approveClaimAndTransfer,
  claimById,
  serializeClaim,
  setClaimStatus,
  toolCommunityFields,
} from "@/lib/community";

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

  const claim = await claimById(id);
  if (!claim) {
    return NextResponse.json({ error: "claim_not_found" }, { status: 404 });
  }
  if (claim.userEmail !== user.email) {
    return NextResponse.json({ error: "not_your_claim" }, { status: 403 });
  }

  // Already verified — idempotent replay.
  if (claim.status === "verified") {
    return NextResponse.json({ verified: true, claim: serializeClaim(claim) });
  }

  const tool = await db.tool.findUnique({
    where: { id: claim.toolId },
    select: { id: true, slug: true, name: true, websiteUrl: true, claimed: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }

  // Someone else claimed the listing while this claim was pending.
  // (makerEmail is a post-boot column — read it raw, stale-client note.)
  const fields = await toolCommunityFields(tool.id);
  if (tool.claimed && fields.makerEmail !== user.email) {
    await setClaimStatus(claim.id, "failed", "listing_already_claimed");
    const updated = await claimById(claim.id);
    return NextResponse.json({
      verified: false,
      reason: "listing_already_claimed",
      claim: updated ? serializeClaim(updated) : serializeClaim(claim),
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
    await setClaimStatus(claim.id, "failed", `site_unreachable: ${fetchError.slice(0, 200)}`);
    const updated = await claimById(claim.id);
    return NextResponse.json({
      verified: false,
      reason: `site_unreachable: ${fetchError.slice(0, 200)}`,
      claim: updated ? serializeClaim(updated) : serializeClaim(claim),
    });
  }

  const tokenFound = findClaimToken(html, claim.token);

  if (tokenFound) {
    await approveClaimAndTransfer(claim.id, tool.id, user);
    logAudit("claim.verified", "tool", tool.slug, `meta_tag verified by ${user.email}`);
    const updated = await claimById(claim.id);
    return NextResponse.json({
      verified: true,
      claim: updated ? serializeClaim(updated) : serializeClaim(claim),
    });
  }

  await setClaimStatus(claim.id, "failed", "token_not_found");
  const updated = await claimById(claim.id);
  return NextResponse.json({
    verified: false,
    reason: "token_not_found",
    claim: updated ? serializeClaim(updated) : serializeClaim(claim),
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
