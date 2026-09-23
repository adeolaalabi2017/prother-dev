import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";
import { setToolFeatures, toolFeaturesByIds } from "@/lib/features";

export const dynamic = "force-dynamic";

/**
 * Admin listing management (PRD F-49/F-50 area) + CMS create (Task 32).
 *  GET    /api/admin/tools?q=&status=&category= — searchable table
 *  POST   /api/admin/tools — create a new listing (CMS)
 *  PATCH  /api/admin/tools — partial edit of any listing field (incl. features)
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
  /** Feature matrix values {"Context window":"200k"} — raw SQL (stale client). */
  features: z
    .record(z.string().min(1).max(60), z.string().max(120))
    .optional(),
  /** Sentinel: stamps verifiedAt = now (S-verification tick, PRD F-18 lite). */
  verify: z.literal(true).optional(),
});

/** Slugify a listing name → URL-safe unique slug. */
function slugifyName(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "tool";
  return base;
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  for (let i = 2; i < 60; i++) {
    const exists = await db.tool.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z
    .string()
    .max(60)
    .regex(/^[a-z0-9-]*$/, "lowercase-dash only")
    .optional(),
  tagline: z.string().min(5).max(60),
  description: z.string().max(2000).optional(),
  websiteUrl: z.string().url(),
  categoryId: z.string().min(1),
  pricingModel: z
    .enum(["free", "freemium", "paid", "open_source"])
    .default("freemium"),
  startingPrice: z.string().max(40).optional(),
  pricingNote: z.string().max(120).optional(),
  hasApi: z.boolean().default(false),
  logoEmoji: z.string().max(8).default("⬡"),
  logoGradient: z.string().max(80).optional(),
  tags: z.string().max(120).default(""),
  makerHandle: z.string().max(40).default("@prother"),
  status: z.enum(["live", "draft"]).default("live"),
  editorsPick: z.boolean().default(false),
  curated: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status") ?? "";
  const category = sp.get("category") ?? "";

  const where: Prisma.ToolWhereInput = {};
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
    // Explicit select — full-row Tool reads break on a stale pre-v6 cached
    // PrismaClient (it still SELECTs the dropped relaunch columns).
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      description: true,
      websiteUrl: true,
      logoEmoji: true,
      logoGradient: true,
      pricingModel: true,
      startingPrice: true,
      pricingNote: true,
      hasApi: true,
      githubUrl: true,
      docsUrl: true,
      twitterUrl: true,
      tags: true,
      track: true,
      status: true,
      pinned: true,
      editorsPick: true,
      curated: true,
      claimed: true,
      makerHandle: true,
      verifiedAt: true,
      createdAt: true,
      category: { select: { id: true, name: true, emoji: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Per-tool discussion/review counts — raw SQL (Comment joins are cheap;
  // Review is a post-boot model → $queryRaw per the lib/community note).
  const ids = tools.map((t) => t.id);
  const [commentRows, reviewRows] = await Promise.all([
    ids.length
      ? db.$queryRaw<{ toolId: string; n: number }[]>`
          SELECT toolId, COUNT(*) as n
          FROM Comment
          WHERE toolId IN (${Prisma.join(ids)})
          GROUP BY toolId`
      : Promise.resolve([] as { toolId: string; n: number }[]),
    ids.length
      ? db.$queryRaw<{ toolId: string; n: number }[]>`
          SELECT toolId, COUNT(*) as n
          FROM Review
          WHERE status = 'published' AND toolId IN (${Prisma.join(ids)})
          GROUP BY toolId`
      : Promise.resolve([] as { toolId: string; n: number }[]),
  ]);
  const commentCount = new Map(commentRows.map((r) => [r.toolId, Number(r.n)]));
  const reviewCount = new Map(reviewRows.map((r) => [r.toolId, Number(r.n)]));
  const featureMap = await toolFeaturesByIds(ids);

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
      features: featureMap.get(t.id) ?? {},
      category: t.category,
      comments: commentCount.get(t.id) ?? 0,
      reviews: reviewCount.get(t.id) ?? 0,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

/** POST — create a listing from the Admin CMS (Task 32). */
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.slice(0, 3) },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // The category must exist and stay attached (FK).
  const category = await db.category
    .findUnique({ where: { id: data.categoryId }, select: { id: true } })
    .catch(() => null);
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 400 });
  }

  const slug = await uniqueSlug(data.slug?.trim() || slugifyName(data.name));
  try {
    const tool = await db.tool.create({
      data: {
        slug,
        name: data.name,
        tagline: data.tagline,
        description: data.description || null,
        websiteUrl: data.websiteUrl,
        categoryId: data.categoryId,
        pricingModel: data.pricingModel,
        startingPrice: data.startingPrice || null,
        pricingNote: data.pricingNote || null,
        hasApi: data.hasApi,
        logoEmoji: data.logoEmoji || "⬡",
        logoGradient: data.logoGradient || "from-orange-500 to-amber-700",
        tags: data.tags,
        makerHandle: data.makerHandle,
        status: data.status,
        editorsPick: data.editorsPick,
        curated: data.curated,
        track: "editor_seed",
      },
      select: { id: true, slug: true },
    });
    logAudit("tool.create", "tool", tool.id, tool.slug);
    return NextResponse.json({ ok: true, id: tool.id, slug: tool.slug });
  } catch {
    return NextResponse.json(
      { error: "Create failed (slug conflict?)" },
      { status: 409 }
    );
  }
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
  const { id, verify, features, ...data } = parsed.data;
  if (verify) {
    (data as { verifiedAt?: Date }).verifiedAt = new Date();
  }
  if (Object.keys(data).length === 0 && features === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    let slug = "";
    if (Object.keys(data).length > 0) {
      const tool = await db.tool.update({
        where: { id },
        data,
        // Narrow return — stale cached clients SELECT dropped columns on full-row returns.
        select: { slug: true },
      });
      slug = tool.slug;
    }
    if (features !== undefined) {
      // POST-boot column → raw SQL (stale-PrismaClient rule).
      await setToolFeatures(id, features);
      if (!slug) {
        const row = await db.$queryRaw<{ slug: string }[]>`
          SELECT slug FROM Tool WHERE id = ${id}`;
        slug = row[0]?.slug ?? "";
      }
    }
    logAudit(
      "tool.update",
      "tool",
      id,
      `${slug}: ${[...Object.keys(data), ...(features !== undefined ? ["features"] : [])].join(", ")}`
    );
    return NextResponse.json({ ok: true, slug });
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
    select: { slug: true },
  }).catch(() => null);
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

  logAudit("tool.remove", "tool", id, tool.slug);
  return NextResponse.json({ ok: true, slug: tool.slug });
}
