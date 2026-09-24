import { NextResponse } from "next/server";
import { z } from "zod";
import { slugifyName } from "@/lib/prother";
import { getAuthUser } from "@/lib/auth";
import { convexCollectionCreate, shadowCollectionsMine } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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

function toCard(c: {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  itemCount: number;
  covers: string[];
  ownerName?: string;
}): CollectionCard {
  const card: CollectionCard = {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    isPublic: c.isPublic,
    itemCount: c.itemCount,
    covers: c.covers,
  };
  if (c.isPublic && c.ownerName) card.ownerName = c.ownerName;
  return card;
}

/**
 * GET /api/collections — the viewer's collections ("mine", F-39) plus
 * featured public collections (F-40). Anonymous → mine: [].
 */
export async function GET() {
  const user = await getAuthUser();

  try {
    const res = await shadowCollectionsMine(
      createServerConvexClient()!,
      user?.email
    );
    return NextResponse.json(
      {
        mine: res.mine.map(toCard),
        featured: res.featured.map(toCard),
      },
      { headers: { "Cache-Control": "no-store", "x-data-backend": "convex" } }
    );
  } catch (err) {
    console.error("[api:collections] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
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

  const client = createServerConvexClient()!;
  // Slug from the name with -2/-3 suffixes on collision.
  const base = slugifyName(name);
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const existing = await shadowCollectionDetail(client, slug).catch(() => null);
    if (!existing || "error" in existing) break;
    slug = `${base}-${i}`;
  }

  try {
    const c = await convexCollectionCreate(client, {
      id: crypto.randomUUID(),
      slug,
      name,
      description,
      isPublic,
      ownerEmail: user.email,
      ownerName: user.name,
      createdAt: Date.now(),
    });
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
  } catch (err) {
    console.error("[api:collections] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
