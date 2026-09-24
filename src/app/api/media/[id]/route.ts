import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import { getMediaById, mediaUrl } from "@/lib/media";
import { convexMediaDeleteFull, shadowMediaServeUrl } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/media/[id] — serve the stored bytes (public read; images and
 * videos are referenced from public pages). Storage-first: rows with a
 * Convex storage object 307-redirect to it (immutable, year-cached —
 * media ids are never reused). Pre-migration disk-only rows stream from
 * disk as before. The /api/media/{id} URL contract never changes, so all
 * existing logo/screenshot/cover/avatar references keep working.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const client = createServerConvexClient()!;
  // Storage-only serve (cutover complete): redirect to the Convex object,
  // else 404. Pre-migration disk-only rows have no bytes anymore — the
  // message tells editors to re-upload.
  const serve = await shadowMediaServeUrl(client, id).catch(() => null);
  if (serve) {
    return NextResponse.redirect(serve.url, {
      status: 307,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }
  return NextResponse.json(
    { error: "Media file is missing from storage." },
    { status: 404 }
  );
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

    // Storage object + references clear transactionally in Convex; avatar
    // references clear in the identity store (dynamic import — the native
    // SQLite binding must never load on Workers).
    await convexMediaDeleteFull(createServerConvexClient()!, { id });
    try {
      const { axUnsafe } = await import("@/lib/authdb");
      axUnsafe(`UPDATE "User" SET image = NULL WHERE image = ?`, url);
    } catch {
      // best effort
    }

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
