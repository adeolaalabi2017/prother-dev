import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { convexAuthUserByHandle, convexAuthUserById, convexAuthUserPatch } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile — the signed-in user's editable profile
 * (name, @handle, bio, avatar image URL). Auth phase (option C): the
 * identity store is the shared Convex `users` table (same row the admin
 * roster and ban checks read).
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  try {
    const profile = await convexAuthUserById(createServerConvexClient()!, user.id);
    if (!profile) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    const { id, name, handle, bio, image, coverImage, role, createdAt } = profile;
    return NextResponse.json({ profile: { id, name, handle, bio, image, coverImage, role, createdAt } });
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
  coverImage?: unknown;
};

const HANDLE_RE = /^[a-zA-Z0-9_-]{2,24}$/;
const MEDIA_URL_RE = /^\/api\/media\/[A-Za-z0-9_-]+$/;

/**
 * PATCH /api/user/profile — edit the signed-in user's profile.
 * Body (all optional): name (2-40), handle (2-24, unique), bio (≤200),
 * image (an /api/media/... URL from /api/upload, or null to clear),
 * coverImage (banner /api/media/... URL, or null to clear).
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
    coverImage?: string | null;
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

  if (body.coverImage !== undefined) {
    if (body.coverImage === null || body.coverImage === "") {
      data.coverImage = null;
    } else {
      const coverImage = String(body.coverImage);
      if (!MEDIA_URL_RE.test(coverImage)) {
        return NextResponse.json(
          { error: "Banner must be a file uploaded through /api/upload." },
          { status: 400 }
        );
      }
      data.coverImage = coverImage;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 400 }
    );
  }

  try {
    const client = createServerConvexClient()!;
    // Handle uniqueness is enforced in the identity store.
    if (data.handle !== undefined) {
      const clash = await convexAuthUserByHandle(client, data.handle);
      if (clash && clash.id !== user.id) {
        return NextResponse.json(
          { error: `The handle @${data.handle} is already taken.` },
          { status: 409 }
        );
      }
    }
    const updated = await convexAuthUserPatch(client, {
      id: user.id,
      name: data.name,
      handle: data.handle,
      bio: data.bio,
      image: data.image,
      coverImage: data.coverImage,
    });
    // The users row IS the directory profile (shared table) — no bridge
    // sync needed; the admin roster and ban checks read this same row.
    const { id, name, handle, bio, image, coverImage, role, createdAt } = updated;
    return NextResponse.json({ profile: { id, name, handle, bio, image, coverImage, role, createdAt } });
  } catch (err) {
    console.error("[api/user/profile] patch failed", err);
    return NextResponse.json(
      { error: "Could not save the profile." },
      { status: 500 }
    );
  }
}
