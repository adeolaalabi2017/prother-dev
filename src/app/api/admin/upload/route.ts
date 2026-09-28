import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/admin";
import { handleMediaUpload } from "@/lib/media-upload";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload — multipart file upload for the admin media
 * library, tool/post editors, and branding (logo/favicon). Editor-key
 * gated; files land in Convex storage (disk mirror during transition)
 * and the response carries the stable /api/media/{id} URL.
 */
const ADMIN_PURPOSES = [
  "gallery",
  "tool-logo",
  "tool-screenshot",
  "post-cover",
  "avatar",
  "branding",
];

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    return await handleMediaUpload(req, {
      ownerKey: "admin",
      allowedPurposes: ADMIN_PURPOSES,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "server_error";
    console.error("[api:admin/upload] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
