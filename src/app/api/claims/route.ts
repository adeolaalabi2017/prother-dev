import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/admin";
import {
  approveClaimAndTransfer,
  insertClaim,
  latestClaimFor,
  newClaimToken,
  sameDomain,
  serializeClaim,
} from "@/lib/community";

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
  const tool = await db.tool.findUnique({
    where: { slug },
    select: { id: true, claimed: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }

  const user = await getAuthUser();
  const claim = user ? await latestClaimFor(tool.id, user.email) : null;

  return NextResponse.json(
    { claimable: !tool.claimed, claim: claim ? serializeClaim(claim) : null },
    { headers: { "Cache-Control": "no-store" } }
  );
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

  const tool = await db.tool.findUnique({
    where: { slug: parsed.data.toolSlug },
    select: { id: true, slug: true, name: true, claimed: true, websiteUrl: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }
  if (tool.claimed) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }

  // Idempotent: an in-flight (pending) or retryable (failed) claim is
  // returned as-is — Verify can retry failed claims, so no new token is cut.
  const existing = await latestClaimFor(tool.id, user.email);
  if (existing && (existing.status === "pending" || existing.status === "failed")) {
    return NextResponse.json({
      claim: serializeClaim(existing),
      verified: false,
      metaTag: `<meta name="prother-claim" content="${existing.token}">`,
      instructions: metaTagInstructions(tool.websiteUrl),
    });
  }

  // Email-domain auto-verify: signed-in email domain == listing domain.
  if (sameDomain(user.email, tool.websiteUrl)) {
    const claim = await insertClaim({
      toolId: tool.id,
      userEmail: user.email,
      userName: user.name,
      method: "email_domain",
      token: newClaimToken(),
      status: "verified",
      note: null,
      verifiedNow: true,
    });
    await approveClaimAndTransfer(claim.id, tool.id, user);
    logAudit("claim.verified", "tool", tool.slug, `email_domain auto-verify by ${user.email}`);
    return NextResponse.json(
      { claim: serializeClaim({ ...claim, status: "verified" }), verified: true, method: "email_domain" },
      { status: 201 }
    );
  }

  // Meta-tag flow: issue a unique token.
  let token = newClaimToken();
  for (let i = 0; i < 3; i++) {
    const clash = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM Claim WHERE token = ${token} LIMIT 1`;
    if (clash.length === 0) break;
    token = newClaimToken();
  }

  const claim = await insertClaim({
    toolId: tool.id,
    userEmail: user.email,
    userName: user.name,
    method: "meta_tag",
    token,
    status: "pending",
    note: null,
    verifiedNow: false,
  });

  return NextResponse.json(
    {
      claim: serializeClaim(claim),
      verified: false,
      metaTag: `<meta name="prother-claim" content="${token}">`,
      instructions: metaTagInstructions(tool.websiteUrl),
    },
    { status: 201 }
  );
}

function metaTagInstructions(websiteUrl: string): string[] {
  return [
    `Add the meta tag to the <head> of ${websiteUrl}`,
    "Deploy the change",
    "Press Verify — we fetch your page and match the token",
  ];
}
