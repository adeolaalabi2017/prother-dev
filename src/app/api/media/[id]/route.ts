import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import {
  deleteMedia,
  getMediaById,
  mediaUrl,
  parseMediaUrls,
  readUploadFile,
  setToolScreenshots,
  toolMediaByIds,
} from "@/lib/media";
import { db } from "@/lib/prother";

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

    // Clear Tool.logoUrl + Post.coverUrl references.
    await db.$executeRaw`UPDATE Tool SET logoUrl = NULL WHERE logoUrl = ${url}`;
    await db.$executeRaw`UPDATE Post SET coverUrl = NULL WHERE coverUrl = ${url}`;

    // Drop the url from any Tool.screenshotUrls pipe.
    const tools = await db.$queryRaw<{
      id: string;
      screenshotUrls: string | null;
    }[]>`
      SELECT id, screenshotUrls FROM Tool
      WHERE screenshotUrls LIKE ${"%" + url + "%"}`;
    if (tools.length > 0) {
      const mediaMap = await toolMediaByIds(tools.map((t) => t.id));
      for (const t of tools) {
        const remaining = parseMediaUrls(t.screenshotUrls).filter(
          (u) => u !== url
        );
        await setToolScreenshots(t.id, remaining);
      }
      void mediaMap;
    }

    // Remove avatar references on users.
    await db.user.updateMany({ data: { image: null }, where: { image: url } });

    const ok = await deleteMedia(id);
    if (!ok) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
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
