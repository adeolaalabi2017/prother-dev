import { NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { listMedia, totalMediaBytes } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * GET /api/media — admin media library listing (newest first).
 * Query: kind=image|video, purpose=tool-logo|..., take=1..500.
 * Response: { media: MediaRow[], totalBytes, count }.
 */
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const kind =
    kindParam === "image" || kindParam === "video" ? kindParam : null;
  const purpose = url.searchParams.get("purpose");
  const take = Number(url.searchParams.get("take") ?? "120");

  try {
    const media = await listMedia({
      kind,
      purpose: purpose || null,
      take: Number.isFinite(take) ? take : 120,
    });
    const totalBytes = await totalMediaBytes();
    return NextResponse.json({ media, count: media.length, totalBytes });
  } catch (err) {
    console.error("[api/media] list failed", err);
    return NextResponse.json(
      { error: "Could not load the media library." },
      { status: 500 }
    );
  }
}
