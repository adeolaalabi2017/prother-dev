import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";
import { setToolFeatures, toolFeaturesByIds } from "@/lib/features";
import {
  setToolLogo,
  setToolScreenshots,
  toolMediaByIds,
} from "@/lib/media";
import {
  applyToolEditorial,
  editorialByToolIds,
  validateEditorialPatch,
  type ToolEditorialPatch,
} from "@/lib/tool-editorial";

export const dynamic = "force-dynamic";

/** Media library URLs only — uploads must come from /api/media. */
const MEDIA_URL = z
  .string()
  .regex(/^\/api\/media\/[A-Za-z0-9_-]+$/, "must be an uploaded media URL")
  .max(200);

/** Editorial enrichment fields (Task 35) — POST-boot columns, raw SQL only
 *  (lib/tool-editorial.ts). Shared shape for the create + patch schemas. */
const editorialSchema = {
  /** Rich description; trim + empty → null on apply (min length enforced
   *  by validateEditorialPatch). */
  longDescription: z.string().max(5000).nullable().optional(),
  useCases: z
    .array(
      z.object({ title: z.string().max(80), body: z.string().max(400) })
    )
    .max(6)
    .optional(),
  pros: z.array(z.string().max(160)).max(6).optional(),
  cons: z.array(z.string().max(160)).max(6).optional(),
  /** Directory slugs, pipe-joined on save. */
  alternatives: z
    .array(z.string().regex(/^[a-z0-9-]+$/, "lowercase-dash slug"))
    .max(6)
    .optional(),
  /** true = stamp pricingCheckedAt now, false = clear it. */
  pricingChecked: z.boolean().optional(),
} as const;

/** Pull the editorial fields out of a parsed payload into a patch object. */
function editorialPatchOf(data: {
  longDescription?: string | null;
  useCases?: { title: string; body: string }[];
  pros?: string[];
  cons?: string[];
  alternatives?: string[];
  pricingChecked?: boolean;
}): ToolEditorialPatch {
  const patch: ToolEditorialPatch = {};
  if (data.longDescription !== undefined) {
    patch.longDescription = data.longDescription;
  }
  if (data.useCases !== undefined) patch.useCases = data.useCases;
  if (data.pros !== undefined) patch.pros = data.pros;
  if (data.cons !== undefined) patch.cons = data.cons;
  if (data.alternatives !== undefined) patch.alternatives = data.alternatives;
  if (data.pricingChecked !== undefined) {
    patch.pricingChecked = data.pricingChecked;
  }
  return patch;
}

/** 400 { errors } when the editorial patch fails shared validation. */
function editorialErrorResponse(patch: ToolEditorialPatch) {
  const errors = validateEditorialPatch(patch);
  return errors.length > 0
    ? NextResponse.json({ errors }, { status: 400 })
    : null;
}

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
  /** Uploaded logo image (POST-boot column → raw SQL, lib/media.ts). */
  logoUrl: MEDIA_URL.nullable().optional(),
  /** Uploaded screenshots, 12 max (POST-boot column → raw SQL). */
  screenshotUrls: z.array(MEDIA_URL).max(12).optional(),
  /** Editorial enrichment (POST-boot columns → raw SQL, Task 35). */
  ...editorialSchema,
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
  /** Uploaded media (POST-boot columns → raw SQL after create). */
  logoUrl: MEDIA_URL.nullable().optional(),
  screenshotUrls: z.array(MEDIA_URL).max(12).optional(),
  /** Editorial enrichment (POST-boot columns → raw SQL, Task 35). */
  ...editorialSchema,
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
  // POST-boot media columns → raw SQL (stale-PrismaClient rule).
  const mediaMap = await toolMediaByIds(ids);
  // POST-boot editorial columns → raw SQL (lib/tool-editorial.ts).
  const editorialMap = await editorialByToolIds(ids);

  return NextResponse.json({
    tools: tools.map((t) => {
      const ed = editorialMap.get(t.id);
      return {
        // Base fields (name/slug/tagline/...): Task 34-c — the spread was
        // accidentally dropped when the media fields below were added, which
        // blanked every row in the Admin Listings table.
        ...t,
        features: featureMap.get(t.id) ?? {},
        logoUrl: mediaMap.get(t.id)?.logoUrl ?? null,
        screenshotUrls: mediaMap.get(t.id)?.screenshotUrls ?? [],
        // Editorial enrichment (Task 35) — arrays pre-parsed for the console.
        longDescription: ed?.longDescription ?? null,
        useCases: ed?.useCases ?? [],
        pros: ed?.pros ?? [],
        cons: ed?.cons ?? [],
        alternatives: ed?.alternativeSlugs ?? [],
        pricingCheckedAt: ed?.pricingCheckedAt
          ? ed.pricingCheckedAt.toISOString()
          : null,
        contentUpdatedAt: ed?.contentUpdatedAt
          ? ed.contentUpdatedAt.toISOString()
          : null,
        category: t.category,
        comments: commentCount.get(t.id) ?? 0,
        reviews: reviewCount.get(t.id) ?? 0,
        createdAt: t.createdAt.toISOString(),
      };
    }),
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

  // Editorial enrichment (Task 35) — validated up front so an invalid patch
  // never creates a half-listing; applied AFTER create (raw SQL below).
  const editorialPatch = editorialPatchOf(data);
  const editorialError = editorialErrorResponse(editorialPatch);
  if (editorialError) return editorialError;

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
    // POST-boot media columns → raw SQL (stale-PrismaClient rule).
    if (data.logoUrl !== undefined) {
      await setToolLogo(tool.id, data.logoUrl);
    }
    if (data.screenshotUrls !== undefined) {
      await setToolScreenshots(tool.id, data.screenshotUrls);
    }
    // POST-boot editorial columns → raw SQL (stale-PrismaClient rule).
    if (Object.keys(editorialPatch).length > 0) {
      await applyToolEditorial(tool.id, editorialPatch);
    }
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
  const { id, verify, features, logoUrl, screenshotUrls, ...rest } = parsed.data;
  // Editorial enrichment (Task 35): pulled out BEFORE the ORM update so the
  // post-boot columns only ever go through raw SQL (lib/tool-editorial.ts).
  const {
    longDescription,
    useCases,
    pros,
    cons,
    alternatives,
    pricingChecked,
    ...data
  } = rest;
  const editorialPatch = editorialPatchOf({
    longDescription,
    useCases,
    pros,
    cons,
    alternatives,
    pricingChecked,
  });
  if (verify) {
    (data as { verifiedAt?: Date }).verifiedAt = new Date();
  }
  if (
    Object.keys(data).length === 0 &&
    features === undefined &&
    logoUrl === undefined &&
    screenshotUrls === undefined &&
    Object.keys(editorialPatch).length === 0
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  // Invalid editorial fields fail the whole patch before anything is written.
  const editorialError = editorialErrorResponse(editorialPatch);
  if (editorialError) return editorialError;

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
    // POST-boot media columns → raw SQL (stale-PrismaClient rule).
    if (logoUrl !== undefined) {
      await setToolLogo(id, logoUrl);
      if (!slug) {
        const row = await db.$queryRaw<{ slug: string }[]>`
          SELECT slug FROM Tool WHERE id = ${id}`;
        slug = row[0]?.slug ?? "";
      }
    }
    if (screenshotUrls !== undefined) {
      await setToolScreenshots(id, screenshotUrls);
      if (!slug) {
        const row = await db.$queryRaw<{ slug: string }[]>`
          SELECT slug FROM Tool WHERE id = ${id}`;
        slug = row[0]?.slug ?? "";
      }
    }
    // POST-boot editorial columns → raw SQL (stale-PrismaClient rule).
    if (Object.keys(editorialPatch).length > 0) {
      await applyToolEditorial(id, editorialPatch);
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
      `${slug}: ${[
        ...Object.keys(data),
        ...(features !== undefined ? ["features"] : []),
        ...(logoUrl !== undefined ? ["logoUrl"] : []),
        ...(screenshotUrls !== undefined ? ["screenshotUrls"] : []),
        ...Object.keys(editorialPatch),
      ].join(", ")}`
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
