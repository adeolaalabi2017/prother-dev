import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  countSubmissionsSince,
  createSubmission,
  db,
  findActiveSubmissionByDomain,
  pendingQueuePosition,
} from "@/lib/prother";
import { TAG_VOCAB, domainOf } from "@/lib/submit";
import { CATEGORIES } from "@/components/prother/categories";

export const dynamic = "force-dynamic"; 

/**
 * POST /api/submit — PRD §11 Submission Wizard (Track B: community submit).
 * Rate limits (adapted for the auth-less landing scope): 3 submissions per
 * email / 7 days · 1 per domain · duplicate-domain → 409 with interstitial data.
 */
const payloadSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  websiteUrl: z.string().trim().min(4),
  name: z.string().trim().min(2).max(40),
  tagline: z
    .string()
    .trim()
    .min(5, "Tagline needs at least 5 characters")
    .max(60, "Tagline must be 60 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(20, "Description needs at least 20 characters")
    .max(500, "Description must be 500 characters or fewer"),
  categorySlug: z.string().refine(
    (slug) => CATEGORIES.some((c) => c.slug === slug),
    "Pick one of the 7 categories"
  ),
  tags: z.array(z.enum(TAG_VOCAB)).max(5).default([]),
  pricingModel: z.enum(["free", "freemium", "paid", "open_source"]),
  startingPrice: z.string().trim().max(20).optional().nullable(),
  pricingNote: z.string().trim().max(120).optional().nullable(),
  hasApi: z.boolean().default(false),
  githubUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  docsUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  twitterUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  logoEmoji: z.string().trim().min(1).max(8).default("⬡"),
  logoGradient: z.string().trim().min(3).max(60).default("from-orange-500 to-amber-700"),
  isOwner: z.boolean().default(true),
  confirmedLive: z
    .boolean()
    .refine((v) => v === true, {
      message: "Confirm your tool is live and usable right now",
    }),
  agreedStandards: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must confirm you have read the Listing Standards",
    }),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }
  const data = parsed.data;

  const domain = domainOf(data.websiteUrl);
  if (!domain || !domain.includes(".")) {
    return NextResponse.json(
      { error: "Validation failed", fields: { websiteUrl: "Enter a valid website URL" } },
      { status: 422 }
    );
  }

  // Rate limit 1: one submission per domain (PRD §11).
  const tools = await db.tool.findMany({
    select: { websiteUrl: true, name: true, slug: true, makerHandle: true },
  });
  const toolHit = tools.find((t) => domainOf(t.websiteUrl) === domain);
  if (toolHit) {
    return NextResponse.json(
      {
        error: "A tool with this domain is already listed/pending review",
        duplicate: {
          kind: "tool",
          name: toolHit.name,
          slug: toolHit.slug,
          maker: toolHit.makerHandle,
        },
      },
      { status: 409 }
    );
  }
  const subHit = await findActiveSubmissionByDomain(domain);
  if (subHit) {
    return NextResponse.json(
      {
        error: "A submission for this domain is already in the queue",
        duplicate: { kind: "submission", name: subHit.name },
      },
      { status: 409 }
    );
  }

  // Rate limit 2: 3 submissions per email per 7 days (PRD §11).
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const recentCount = await countSubmissionsSince(data.email.toLowerCase(), weekAgo);
  if (recentCount >= 3) {
    return NextResponse.json(
      { error: "Weekly limit reached — 3 submissions per email per 7 days." },
      { status: 429 }
    );
  }

  // Open Source → GitHub URL required (PRD §11 step 3).
  if (data.pricingModel === "open_source" && !data.githubUrl) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fields: { githubUrl: "Open Source tools need a public GitHub URL" },
      },
      { status: 422 }
    );
  }

  const cleanUrl = /^https?:\/\//i.test(data.websiteUrl)
    ? data.websiteUrl
    : `https://${data.websiteUrl}`;

  const submission = await createSubmission({
    email: data.email.toLowerCase(),
    websiteUrl: cleanUrl,
    domain,
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    categorySlug: data.categorySlug,
    tags: data.tags.join("|"),
    pricingModel: data.pricingModel,
    startingPrice: data.startingPrice || null,
    pricingNote: data.pricingNote || null,
    hasApi: data.hasApi,
    githubUrl: data.githubUrl || null,
    docsUrl: data.docsUrl || null,
    twitterUrl: data.twitterUrl || null,
    logoEmoji: data.logoEmoji,
    logoGradient: data.logoGradient,
    isOwner: data.isOwner,
    confirmedLive: data.confirmedLive,
    agreedStandards: data.agreedStandards,
  });

  return NextResponse.json(
    { ok: true, id: submission.id, position: await pendingQueuePosition(submission.id) },
    { status: 201 }
  );
}
