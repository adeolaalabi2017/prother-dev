import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import { validateEditorialPatch, type ToolEditorialPatch } from "@/lib/tool-editorial";
import {
  convexToolCreate,
  convexToolPatch,
  convexToolRemove,
  shadowAdminTools,
} from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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

/** Slug candidates for listing names (uniqueness resolves by retrying the
 *  create on the mutation's slug_taken error). */
function slugCandidates(base: string): string[] {
  return [
    base,
    ...Array.from({ length: 58 }, (_, i) => `${base}-${i + 2}`),
    `${base}-${Date.now().toString(36)}`,
  ];
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

  // Convex-only (admin cutover).
  const res = await shadowAdminTools(createServerConvexClient()!, q, status, category);
  return NextResponse.json(res, {
    headers: { "x-data-backend": "convex" },
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
  // never creates a half-listing.
  const editorialError = editorialErrorResponse(editorialPatchOf(data));
  if (editorialError) return editorialError;

  const slugBase = data.slug?.trim() || slugifyName(data.name);
  // Convex-only: one id + timestamp for the insert; slug candidates retry
  // on the mutation's slug_taken error (atomic check-and-insert).
  const toolId = crypto.randomUUID();
  const nowMs = Date.now();
  const client = createServerConvexClient()!;
  for (const slug of slugCandidates(slugBase)) {
    try {
      const res = await convexToolCreate(client, {
        id: toolId,
        slug,
        name: data.name,
        tagline: data.tagline,
        description: data.description || undefined,
        websiteUrl: data.websiteUrl,
        categoryLegacyId: data.categoryId,
        pricingModel: data.pricingModel,
        startingPrice: data.startingPrice || undefined,
        pricingNote: data.pricingNote || undefined,
        hasApi: data.hasApi,
        logoEmoji: data.logoEmoji || "⬡",
        logoGradient: data.logoGradient || "from-orange-500 to-amber-700",
        tagsPipe: data.tags,
        makerHandle: data.makerHandle,
        status: data.status,
        editorsPick: data.editorsPick,
        curated: data.curated,
        logoUrl: data.logoUrl,
        screenshotUrls: data.screenshotUrls,
        editorial: {
          longDescription: data.longDescription,
          useCases: data.useCases,
          pros: data.pros,
          cons: data.cons,
          alternatives: data.alternatives,
          pricingChecked: data.pricingChecked,
        },
        createdAt: nowMs,
      });
      logAudit("tool.create", "tool", res.id, res.slug);
      return NextResponse.json({ ok: true, id: res.id, slug: res.slug });
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      if (m.includes("slug_taken")) continue;
      if (m.includes("category_not_found")) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
      console.error("[api:admin/tools] create failed:", data.name, err);
      return NextResponse.json(
        { error: "Create failed (slug conflict?)" },
        { status: 409 }
      );
    }
  }
  return NextResponse.json(
    { error: "Create failed (slug conflict?)" },
    { status: 409 }
  );
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

  // Convex-only: single-transaction patch (media, features, editorial all
  // included). verifiedAt travels as epoch ms.
  const nowMs = Date.now();
  try {
    // verifiedAt travels as epoch ms (the patch schema holds a Date).
    const { categoryId, ...convexRest } = data as Record<string, unknown> & {
      categoryId?: string;
      verifiedAt?: Date;
    };
    delete convexRest.verifiedAt;
    const res = await convexToolPatch(createServerConvexClient()!, {
      toolLegacyId: id,
      data: {
        ...convexRest,
        ...(categoryId ? { categoryLegacyId: categoryId } : {}),
        ...(verify ? { verifiedAt: nowMs } : {}),
      },
      features,
      logoUrl,
      screenshotUrls,
      editorial: editorialPatch,
      nowMs,
    });
    logAudit(
      "tool.update",
      "tool",
      id,
      `${res.slug}: ${[
        ...Object.keys(data),
        ...(features !== undefined ? ["features"] : []),
        ...(logoUrl !== undefined ? ["logoUrl"] : []),
        ...(screenshotUrls !== undefined ? ["screenshotUrls"] : []),
        ...Object.keys(editorialPatch),
      ].join(", ")}`
    );
    return NextResponse.json({ ok: true, slug: res.slug });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    console.error("[api:admin/tools] PATCH failed:", id, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Convex-only soft-remove (status → removed, PRD §16).
  try {
    const res = await convexToolRemove(createServerConvexClient()!, { toolLegacyId: id });
    logAudit("tool.remove", "tool", id, res.slug);
    return NextResponse.json({ ok: true, slug: res.slug });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    console.error("[api:admin/tools] DELETE failed:", id, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
