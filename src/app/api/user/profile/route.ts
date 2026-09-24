import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { aq, axUnsafe } from "@/lib/authdb";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../../../../convex/_generated/api.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile — the signed-in user's editable profile
 * (name, @handle, bio, avatar image URL). Phase 5: identity store is the
 * micro-SQLite auth db (same columns, same shapes).
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  try {
    const rows = aq<{
      id: string;
      name: string | null;
      handle: string | null;
      bio: string | null;
      image: string | null;
      role: string;
      createdAt: string;
    }>`
      SELECT id, name, handle, bio, image, role, createdAt
      FROM "User" WHERE id = ${user.id} LIMIT 1`;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    return NextResponse.json({ profile: row });
  } catch (err) {
    console.error("[api/user/profile] get failed", err);
    return NextResponse.json(
      { error: "Could not load the profile." },
      { status: 500 }
    );
  }
}

type PatchBody = {
  name?: unknown;
  handle?: unknown;
  bio?: unknown;
  image?: unknown;
};

const HANDLE_RE = /^[a-zA-Z0-9_-]{2,24}$/;
const MEDIA_URL_RE = /^\/api\/media\/[A-Za-z0-9_-]+$/;

/**
 * PATCH /api/user/profile — edit the signed-in user's profile.
 * Body (all optional): name (2-40), handle (2-24, unique), bio (≤200),
 * image (an /api/media/... URL from /api/upload, or null to clear).
 */
export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: {
    name?: string;
    handle?: string;
    bio?: string | null;
    image?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 40) {
      return NextResponse.json(
        { error: "Name must be 2 to 40 characters." },
        { status: 400 }
      );
    }
    data.name = name;
  }

  if (body.handle !== undefined) {
    const handle = String(body.handle).trim().replace(/^@/, "");
    if (!HANDLE_RE.test(handle)) {
      return NextResponse.json(
        { error: "Handles are 2-24 characters: letters, numbers, dashes, underscores." },
        { status: 400 }
      );
    }
    // Uniqueness is re-checked against the identity store at write time
    // below (kept separate so validation errors stay ordered).
    data.handle = handle;
  }

  if (body.bio !== undefined) {
    const bio = String(body.bio).slice(0, 200);
    data.bio = bio.trim() ? bio : null;
  }

  if (body.image !== undefined) {
    if (body.image === null || body.image === "") {
      data.image = null;
    } else {
      const image = String(body.image);
      if (!MEDIA_URL_RE.test(image)) {
        return NextResponse.json(
          { error: "Avatar must be a file uploaded through /api/upload." },
          { status: 400 }
        );
      }
      data.image = image;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 400 }
    );
  }

  try {
    // Handle uniqueness is enforced in the identity store.
    if (data.handle !== undefined) {
      const clash = aq<{ id: string }>`
        SELECT id FROM "User" WHERE handle = ${data.handle} LIMIT 1`;
      if (clash[0] && clash[0].id !== user.id) {
        return NextResponse.json(
          { error: `The handle @${data.handle} is already taken.` },
          { status: 409 }
        );
      }
    }
    const sets: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) {
      sets.push(`"name" = ?`);
      values.push(data.name);
    }
    if (data.handle !== undefined) {
      sets.push(`"handle" = ?`);
      values.push(data.handle);
    }
    if (data.bio !== undefined) {
      sets.push(`"bio" = ?`);
      values.push(data.bio);
    }
    if (data.image !== undefined) {
      sets.push(`"image" = ?`);
      values.push(data.image);
    }
    axUnsafe(`UPDATE "User" SET ${sets.join(", ")} WHERE "id" = ?`, ...values, user.id);
    // Sync the directory profile immediately (same fields the sign-in
    // bridge patches — no waiting for the next login).
    try {
      const client = createServerConvexClient();
      if (client) {
        await client.mutation(api.users.ensureFromAuth, {
          id: user.id,
          email: user.email,
          name: data.name,
          handle: data.handle,
          image: data.image,
          bio: data.bio,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("[profile] convex sync failed:", user.id, err);
    }
    const updated = aq<{
      id: string;
      name: string | null;
      handle: string | null;
      bio: string | null;
      image: string | null;
      role: string;
      createdAt: string;
    }>`
      SELECT id, name, handle, bio, image, role, createdAt
      FROM "User" WHERE id = ${user.id} LIMIT 1`[0];
    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("[api/user/profile] patch failed", err);
    return NextResponse.json(
      { error: "Could not save the profile." },
      { status: 500 }
    );
  }
}
