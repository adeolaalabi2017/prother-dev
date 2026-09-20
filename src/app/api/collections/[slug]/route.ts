import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import {
  collectionBySlug,
  listCollectionItems,
  serializeCollection,
} from "@/lib/community";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(280).optional(),
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/collections/[slug] — one collection with its tool items.
 * Private collections 404 unless the viewer is the owner (F-39/40).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const collection = await collectionBySlug(slug);
  if (!collection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await getAuthUser();
  const isOwner = user != null && collection.ownerEmail === user.email;
  if (!collection.isPublic && !isOwner) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Items in manual order; tools hydrated through the ORM (old model).
  const itemRows = await listCollectionItems(collection.id);
  const toolIds = itemRows.map((i) => i.toolId);
  const tools = toolIds.length
    ? await db.tool.findMany({
        where: { id: { in: toolIds } },
        include: {
          launch: { include: { _count: { select: { votes: true } } } },
          category: { select: { slug: true, name: true, emoji: true } },
        },
      })
    : [];
  const toolById = new Map(tools.map((t) => [t.id, t]));

  const items = itemRows.flatMap((item) => {
    const t = toolById.get(item.toolId);
    if (!t) return [];
    return [
      {
        id: item.id,
        position: item.position,
        tool: {
          slug: t.slug,
          name: t.name,
          tagline: t.tagline,
          emoji: t.logoEmoji,
          gradient: t.logoGradient,
          votes: (t.launch?.baseUpvotes ?? 0) + (t.launch?._count.votes ?? 0),
          pricing: { model: t.pricingModel, price: t.startingPrice },
          category: t.category,
          maker: t.makerHandle,
          badges: {
            editorsPick: t.editorsPick,
            curated: t.curated,
            relaunch: t.relaunch,
            unclaimed: !t.claimed,
            hasApi: t.hasApi,
            openSource: t.pricingModel === "open_source",
          },
        },
      },
    ];
  });

  const base = serializeCollection(collection);
  return NextResponse.json(
    {
      collection: {
        id: base.id,
        slug: base.slug,
        name: base.name,
        description: base.description,
        isPublic: base.isPublic,
        ownerName: base.ownerName,
        ...(isOwner ? { ownerEmail: base.ownerEmail } : {}),
        isOwner,
        createdAt: base.createdAt,
        items,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * PATCH /api/collections/[slug] — owner-only metadata edit
 * (name / description / visibility).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  const collection = await collectionBySlug(slug);
  if (!collection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (collection.ownerEmail !== user.email) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 });
  }

  const { name, description, isPublic } = parsed.data;
  if (name !== undefined || description !== undefined || isPublic !== undefined) {
    await db.$executeRaw`
      UPDATE Collection
      SET name = ${name ?? collection.name},
          description = ${description ?? collection.description},
          isPublic = ${isPublic === undefined ? (collection.isPublic ? 1 : 0) : isPublic ? 1 : 0}
      WHERE id = ${collection.id}`;
  }

  const updated = await collectionBySlug(slug);
  const base = serializeCollection(updated ?? collection);
  return NextResponse.json({
    collection: { ...base, isOwner: true, ownerEmail: base.ownerEmail },
  });
}

/** DELETE /api/collections/[slug] — owner-only; 204 on success. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  const collection = await collectionBySlug(slug);
  if (!collection) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (collection.ownerEmail !== user.email) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 });
  }

  await db.$executeRaw`DELETE FROM CollectionItem WHERE collectionId = ${collection.id}`;
  await db.$executeRaw`DELETE FROM Collection WHERE id = ${collection.id}`;
  return new NextResponse(null, { status: 204 });
}
