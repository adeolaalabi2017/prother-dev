import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import {
  deleteUploadFile,
  getMediaById,
  mediaUrl,
  readUploadFile,
} from "@/lib/media";
import { axUnsafe } from "@/lib/authdb";
import { convexMediaDeleteFull } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/media/[id] — stream the stored bytes (public read; images and
 * videos are referenced from public pages). Immutable caching: media ids are
 * never reused, so browsers cache for a year.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const row = await getMediaById(id);
    if (!row) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }
    const bytes = await readUploadFile(row.storedName);
    if (!bytes) {
      return NextResponse.json(
        { error: "Media file is missing from storage." },
        { status: 404 }
      );
    }
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: `"${row.id}"`,
      },
    });
  } catch (err) {
    console.error("[api/media/[id]] read failed", err);
    return NextResponse.json(
      { error: "Could not read the media file." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/[id] — admin removal. Clears references first so no
 * listing, post, or profile keeps pointing at a dead URL: logoUrl nulled,
 * the url dropped from screenshot pipes, coverUrl nulled, avatars cleared.
 */
export async function DELETE(req: Request, ctx: RouteContext) {
  const denied = guard(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const row = await getMediaById(id);
    if (!row) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }
    const url = mediaUrl(row.id);

    // Phase 5: tool/post references clear transactionally in Convex; avatar
    // references clear in the identity store; bytes delete from disk.
    await convexMediaDeleteFull(createServerConvexClient()!, { id });
    try {
      axUnsafe(`UPDATE "User" SET image = NULL WHERE image = ?`, url);
    } catch {
      // best effort
    }
    await deleteUploadFile(row.storedName).catch(() => null);

    logAudit("media.delete", "media", id, row.originalName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/media/[id]] delete failed", err);
    return NextResponse.json(
      { error: "Could not delete the media file." },
      { status: 500 }
    );
  }
}
