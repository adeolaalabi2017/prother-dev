import { NextRequest, NextResponse } from "next/server";
import { db, findActiveSubmissionByDomain } from "@/lib/prother";
import { domainOf } from "@/lib/submit";

export const dynamic = "force-dynamic";

/**
 * GET /api/submit/check?url=…
 * PRD §11 duplicate interstitial: fires on Step-1 URL blur.
 * Checks submitted queue AND existing/claimed tools (1 submission per domain).
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const domain = domainOf(url);
  if (!domain) {
    return NextResponse.json({
      valid: false,
      duplicate: null as null | {
        kind: string;
        name: string;
        slug?: string;
        votes?: number;
        maker?: string;
      },
    });
  }

  // Existing tool with the same domain wins the check.
  const tools = await db.tool.findMany({
    where: { launch: { scheduled: false } },
    include: { launch: { select: { baseUpvotes: true } } },
  });
  const hit = tools.find((t) => domainOf(t.websiteUrl) === domain);
  if (hit) {
    return NextResponse.json({
      valid: true,
      duplicate: {
        kind: "tool",
        name: hit.name,
        slug: hit.slug,
        votes: hit.launch?.baseUpvotes ?? 0,
        maker: hit.makerHandle,
      },
    });
  }

  // A pending/approved submission already queued for this domain.
  const sub = await findActiveSubmissionByDomain(domain);
  if (sub) {
    return NextResponse.json({
      valid: true,
      duplicate: { kind: "submission", name: sub.name },
    });
  }

  return NextResponse.json({ valid: true, duplicate: null });
}
