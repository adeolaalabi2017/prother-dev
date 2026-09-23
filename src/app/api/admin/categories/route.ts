import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { guard, logAudit } from "@/lib/admin";
import {
  categoryFeaturesByIds,
  parseFeatureAxes,
  setCategoryFeatures,
} from "@/lib/features";

export const dynamic = "force-dynamic";

/**
 * Taxonomy management (PRD F-50 — categories CRUD, no deploys) + the
 * comparison feature axes (Task 32).
 *  GET    / — categories with tool counts + feature axes
 *  POST   / — create / update (name, emoji, order, features)
 *  DELETE /?id= — delete (blocked while tools attached)
 */

const upsertSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "lowercase-dash only"),
  name: z.string().min(2).max(60),
  emoji: z.string().min(1).max(8),
  sortOrder: z.number().int().min(0).max(99).optional(),
  /** Pipe-separated comparison axes, e.g. "Context window|Voice input". */
  features: z.string().max(400).optional(),
});

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { tools: true } } },
  });
  // POST-boot column → raw SQL merge (stale-PrismaClient rule).
  const featureMap = await categoryFeaturesByIds(categories.map((c) => c.id));
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      sortOrder: c.sortOrder,
      toolCount: c._count.tools,
      features: (featureMap.get(c.id) ?? []).join("|"),
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { id, features, ...data } = parsed.data;
  if (id) {
    try {
      const cat = await db.category.update({ where: { id }, data });
      if (features !== undefined) {
        // POST-boot column → raw SQL (stale-PrismaClient rule).
        await setCategoryFeatures(id, parseFeatureAxes(features));
      }
      logAudit("category.update", "category", id, `${cat.slug} → ${cat.name}${features !== undefined ? " + features" : ""}`);
      return NextResponse.json({ ok: true, id: cat.id });
    } catch {
      return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }
  }
  const max = await db.category.aggregate({ _max: { sortOrder: true } });
  try {
    const cat = await db.category.create({
      data: { ...data, sortOrder: data.sortOrder ?? (max._max.sortOrder ?? 0) + 1 },
    });
    if (features !== undefined) {
      await setCategoryFeatures(cat.id, parseFeatureAxes(features));
    }
    logAudit("category.create", "category", cat.id, cat.slug);
    return NextResponse.json({ ok: true, id: cat.id });
  } catch {
    return NextResponse.json(
      { error: "Slug already exists" },
      { status: 409 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const count = await db.tool.count({ where: { categoryId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `${count} tool${count === 1 ? "" : "s"} still use this category` },
      { status: 409 }
    );
  }
  const cat = await db.category.delete({ where: { id } }).catch(() => null);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  logAudit("category.delete", "category", id, cat.slug);
  return NextResponse.json({ ok: true });
}
