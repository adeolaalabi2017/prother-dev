import { NextResponse } from "next/server";
import { z } from "zod";
import { db, slugifyName } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import {
  decorateCollections,
  insertCollection,
  serializeCollection,
  uniqueCollectionSlug,
} from "@/lib/community";
import type { CollectionRow } from "@/lib/community";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(280).optional(),
  isPublic: z.boolean(),
});

/** Shape shared by GET rows and the POST response (owner fields trimmed). */
type CollectionCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  itemCount: number;
  covers: string[];
  ownerName?: string;
};

function toCard(c: Awaited<ReturnType<typeof decorateCollections>>[number]): CollectionCard {
  const card: CollectionCard = {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    isPublic: c.isPublic,
    itemCount: c.itemCount,
    covers: c.covers,
  };
  if (c.isPublic) card.ownerName = c.ownerName;
  return card;
}

/**
 * GET /api/collections — the viewer's collections ("mine", F-39) plus
 * featured public collections (F-40). Anonymous → mine: [].
 */
export async function GET() {
  const user = await getAuthUser();

  const [mineRows, featuredRows] = await Promise.all([
    user
      ? db.$queryRaw<CollectionRow[]>`
          SELECT id, slug, name, description, isPublic, ownerEmail, ownerName, createdAt
          FROM Collection
          WHERE ownerEmail = ${user.email}
          ORDER BY createdAt DESC
          LIMIT 100`
      : Promise.resolve([] as CollectionRow[]),
    db.$queryRaw<CollectionRow[]>`
      SELECT id, slug, name, description, isPublic, ownerEmail, ownerName, createdAt
      FROM Collection
      WHERE isPublic = 1
      ORDER BY createdAt DESC
      LIMIT 24`,
  ]);

  const [mineDeco, featuredDeco] = await Promise.all([
    decorateCollections(mineRows),
    decorateCollections(featuredRows),
  ]);

  // Featured = the six fullest public collections (newest as tiebreak).
  const featured = [...featuredDeco]
    .sort((a, b) => b.itemCount - a.itemCount || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map(toCard);

  return NextResponse.json(
    { mine: mineDeco.map(toCard), featured },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * POST /api/collections — create a collection (F-39). Slug derived from the
 * name with -2/-3 suffixes on collision.
 */
export async function POST(req: Request) {
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

  const { name, isPublic } = parsed.data;
  const description = parsed.data.description ?? "";
  const slug = await uniqueCollectionSlug(slugifyName(name));

  const row = await insertCollection({
    slug,
    name,
    description,
    isPublic,
    ownerEmail: user.email,
    ownerName: user.name,
  });

  const c = serializeCollection(row);
  return NextResponse.json(
    {
      collection: {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        isPublic: c.isPublic,
        itemCount: 0,
        covers: [],
      },
    },
    { status: 201 }
  );
}
