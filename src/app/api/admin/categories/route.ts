import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, logAudit } from "@/lib/admin";
import {
  convexCategoryDelete,
  convexCategoryUpsert,
  shadowAdminCategories,
} from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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

  // Convex-only (admin cutover).
  const res = await shadowAdminCategories(createServerConvexClient()!);
  return NextResponse.json(res, {
    headers: { "x-data-backend": "convex" },
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
  const client = createServerConvexClient()!;
  const convexErr = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);
  if (id) {
    // Convex-only: verify the row exists first (the mutation's upsert
    // would otherwise create on unknown ids; Prisma returned 400).
    try {
      const table = await shadowAdminCategories(client);
      const existing = table.categories.find((c) => c.id === id);
      if (!existing) {
        return NextResponse.json({ error: "Update failed" }, { status: 400 });
      }
      await convexCategoryUpsert(client, {
        legacyId: id,
        slug: data.slug,
        name: data.name,
        emoji: data.emoji,
        sortOrder: data.sortOrder,
        featuresPipe: features,
      });
      logAudit("category.update", "category", id, `${data.slug} → ${data.name}${features !== undefined ? " + features" : ""}`);
      return NextResponse.json({ ok: true, id });
    } catch (err) {
      const m = convexErr(err);
      if (m.includes("slug_taken")) {
        return NextResponse.json({ error: "Update failed" }, { status: 400 });
      }
      console.error("[api:admin/categories] update failed:", id, err);
      return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }
  }
  // Create path: shared id + max+1 sortOrder resolved from the Convex table.
  const sharedId = crypto.randomUUID();
  try {
    const table = await shadowAdminCategories(client);
    const maxSort = table.categories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    const res = await convexCategoryUpsert(client, {
      legacyId: sharedId,
      slug: data.slug,
      name: data.name,
      emoji: data.emoji,
      sortOrder: data.sortOrder ?? maxSort + 1,
      featuresPipe: features,
    });
    logAudit("category.create", "category", res.id, data.slug);
    return NextResponse.json({ ok: true, id: res.id });
  } catch (err) {
    const m = convexErr(err);
    if (m.includes("slug_taken")) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    }
    console.error("[api:admin/categories] create failed:", data.slug, err);
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

  // Convex-only: the mutation enforces the attached-tools guard itself.
  try {
    const res = await convexCategoryDelete(createServerConvexClient()!, { legacyId: id });
    logAudit("category.delete", "category", id, res.slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("has_tools:")) {
      const count = Number(m.split(":")[1] ?? 0);
      return NextResponse.json(
        { error: `${count} tool${count === 1 ? "" : "s"} still use this category` },
        { status: 409 }
      );
    }
    if (m.includes("not_found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[api:admin/categories] delete failed:", id, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
