import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import { collectionBySlug, listCollectionItems } from "@/lib/community";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  toolSlug: z.string().min(1).max(80),
});

/**
 * POST /api/collections/[slug]/items — owner-only toggle of a tool inside
 * the collection. New items are appended (position = current item count).
 */
export async function POST(
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
  const parsed = postSchema.safeParse(raw);
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

  const tool = await db.tool.findUnique({
    where: { slug: parsed.data.toolSlug },
    select: { id: true },
  });
  if (!tool) {
    return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
  }

  const existing = (await listCollectionItems(collection.id)).find(
    (i) => i.toolId === tool.id
  );

  if (existing) {
    await db.$executeRaw`DELETE FROM CollectionItem WHERE id = ${existing.id}`;
  } else {
    const items = await listCollectionItems(collection.id);
    const position = items.length;
    await db.$executeRaw`
      INSERT INTO CollectionItem (id, collectionId, toolId, position, createdAt)
      VALUES (${crypto.randomUUID()}, ${collection.id}, ${tool.id}, ${position}, ${Date.now()})`;
  }

  const [{ n: itemCount }] = await db.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*) as n FROM CollectionItem WHERE collectionId = ${collection.id}`;

  return NextResponse.json({
    inCollection: !existing,
    itemCount: Number(itemCount),
  });
}
