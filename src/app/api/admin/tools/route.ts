import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Admin listing management (PRD F-49/F-50 area).
 *  GET    /api/admin/tools?q=&status=&category= — searchable table
 *  PATCH  /api/admin/tools — partial edit of any listing field
 *  DELETE /api/admin/tools?id= — soft delete (status → removed, PRD §16)
 */

const STATUSES = ["live", "draft", "pending_review", "approved", "removed"] as const;

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60).optional(),
  tagline: z.string().min(5).max(60).optional(),
  description: z.string().max(2000).nullable().optional(),
  websiteUrl: z.string().url().optional(),
  logoEmoji: z.string().max(8).optional(),
  logoGradient: z.string().max(80).optional(),
  pricingModel: z.enum(["free", "freemium", "paid", "open_source"]).optional(),
  startingPrice: z.string().max(40).nullable().optional(),
  pricingNote: z.string().max(120).nullable().optional(),
  hasApi: z.boolean().optional(),
  githubUrl: z.string().url().nullable().optional(),
  docsUrl: z.string().url().nullable().optional(),
  twitterUrl: z.string().url().nullable().optional(),
  tags: z.string().max(120).optional(),
  status: z.enum(STATUSES).optional(),
  pinned: z.number().int().min(0).max(3).optional(),
  editorsPick: z.boolean().optional(),
  curated: z.boolean().optional(),
  claimed: z.boolean().optional(),
  makerHandle: z.string().max(40).optional(),
  categoryId: z.string().min(1).optional(),
  /** Sentinel: stamps verifiedAt = now (S-verification tick, PRD F-18 lite). */
  verify: z.literal(true).optional(),
});

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status") ?? "";
  const category = sp.get("category") ?? "";

  const where: Parameters<typeof db.tool.findMany>[0]["where"] = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { tagline: { contains: q } },
      { slug: { contains: q } },
    ];
  }
  if (status && status !== "all") where.status = status;
  if (category) where.categoryId = category;

  const tools = await db.tool.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, emoji: true, slug: true } },
      launch: { include: { _count: { select: { votes: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    tools: tools.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      websiteUrl: t.websiteUrl,
      logoEmoji: t.logoEmoji,
      logoGradient: t.logoGradient,
      pricingModel: t.pricingModel,
      startingPrice: t.startingPrice,
      pricingNote: t.pricingNote,
      hasApi: t.hasApi,
      githubUrl: t.githubUrl,
      docsUrl: t.docsUrl,
      twitterUrl: t.twitterUrl,
      tags: t.tags,
      track: t.track,
      status: t.status,
      pinned: t.pinned,
      editorsPick: t.editorsPick,
      curated: t.curated,
      claimed: t.claimed,
      makerHandle: t.makerHandle,
      verifiedAt: t.verifiedAt?.toISOString() ?? null,
      category: t.category,
      votes: (t.launch?.baseUpvotes ?? 0) + (t.launch?._count.votes ?? 0),
      launchDate: t.launch?.launchDate.toISOString() ?? null,
      scheduled: t.launch?.scheduled ?? false,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.slice(0, 3) },
      { status: 400 }
    );
  }
  const { id, verify, ...data } = parsed.data;
  if (verify) {
    (data as { verifiedAt?: Date }).verifiedAt = new Date();
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const tool = await db.tool.update({ where: { id }, data });
    logAudit(
      "tool.update",
      "tool",
      id,
      `${tool.slug}: ${Object.keys(data).join(", ")}`
    );
    return NextResponse.json({ ok: true, slug: tool.slug });
  } catch {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Soft delete per PRD §16 — history/reviews survive, soft-404 UX.
  const tool = await db.tool.update({
    where: { id },
    data: { status: "removed" },
  }).catch(() => null);
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

  logAudit("tool.remove", "tool", id, tool.slug);
  return NextResponse.json({ ok: true, slug: tool.slug });
}
