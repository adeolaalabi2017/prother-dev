import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  db,
  EDITOR_KEY,
  setSubmissionStatus,
  slugifyName,
  uniqueToolSlug,
} from "@/lib/prother";

export const dynamic = "force-dynamic";

/**
 * POST /api/editor/decision — PRD §12: approve (schedule for tomorrow) or
 * reject (must cite failed standard(s), PRD §7).
 *
 * Approve closes the Track-B loop: Submission → Tool (community, claimed) +
 * Launch (scheduled=true, tomorrow UTC midnight) → shows up in the feed's
 * Tomorrow tab and launches at 00:00 UTC.
 */
const bodySchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    id: z.string().min(1),
  }),
  z.object({
    decision: z.literal("reject"),
    id: z.string().min(1),
    failedStandards: z.array(z.enum(["S1", "S2", "S3", "S4", "S5", "S6"])).min(1),
    note: z.string().trim().max(500).optional().default(""),
  }),
]);

export async function POST(req: NextRequest) {
  if (req.headers.get("x-editor-key") !== EDITOR_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const input = parsed.data;

  // Load the submission (raw — stale-client workaround documented in lib).
  const found = await db.$queryRaw<
    {
      id: string; email: string; websiteUrl: string; domain: string;
      name: string; tagline: string; description: string; categorySlug: string;
      tags: string; pricingModel: string; startingPrice: string | null;
      pricingNote: string | null; hasApi: number; githubUrl: string | null;
      docsUrl: string | null; twitterUrl: string | null; logoEmoji: string;
      logoGradient: string; isOwner: number; status: string;
    }[]
  >`
    SELECT id, email, websiteUrl, domain, name, tagline, description,
           categorySlug, tags, pricingModel, startingPrice, pricingNote,
           hasApi, githubUrl, docsUrl, twitterUrl, logoEmoji, logoGradient,
           isOwner, status
    FROM Submission WHERE id = ${input.id} LIMIT 1`;
  const sub = found[0];
  if (!sub) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (sub.status !== "pending") {
    return NextResponse.json(
      { error: `Submission already ${sub.status}` },
      { status: 409 }
    );
  }

  if (input.decision === "reject") {
    const note = `Failed: ${input.failedStandards.join(", ")}${
      input.note ? ` — ${input.note}` : ""
    }`;
    await setSubmissionStatus(sub.id, "rejected", note);
    return NextResponse.json({ ok: true, decision: "rejected", reviewNote: note });
  }

  // ── Approve: Submission → Tool + tomorrow's Launch ────────────────────
  const cat = await db.category.findUnique({ where: { slug: sub.categorySlug } });
  if (!cat) {
    return NextResponse.json(
      { error: `Unknown category "${sub.categorySlug}"` },
      { status: 409 }
    );
  }

  const baseSlug = slugifyName(sub.name);
  const slug = await uniqueToolSlug(baseSlug);

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);

  const tool = await db.tool.create({
    data: {
      slug,
      name: sub.name,
      tagline: sub.tagline,
      description: sub.description,
      websiteUrl: sub.websiteUrl,
      logoEmoji: sub.logoEmoji,
      logoGradient: sub.logoGradient,
      pricingModel: sub.pricingModel,
      startingPrice: sub.startingPrice,
      pricingNote: sub.pricingNote,
      hasApi: Boolean(sub.hasApi),
      githubUrl: sub.githubUrl,
      docsUrl: sub.docsUrl,
      twitterUrl: sub.twitterUrl,
      tags: sub.tags,
      track: "community",
      claimed: Boolean(sub.isOwner),
      makerHandle: `@${sub.email.split("@")[0]?.replace(/[^a-z0-9_-]/gi, "") || "maker"}`,
      verifiedAt: now,
      categoryId: cat.id,
      launch: {
        create: {
          launchDate: tomorrowStart, // teasers now → goes live at the 00:00 UTC rollover
          scheduled: true,
          baseUpvotes: 0,
          createdAt: now,
        },
      },
    },
  });

  await setSubmissionStatus(sub.id, "approved", null);

  return NextResponse.json({
    ok: true,
    decision: "approved",
    slug: tool.slug,
    launchDate: tomorrowStart.toISOString().slice(0, 10),
  });
}
