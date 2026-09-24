import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleMediaUpload } from "@/lib/media-upload";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload — signed-in user avatar uploads (profile pictures).
 * Session auth; restricted to the avatar purpose so user uploads cannot
 * mint tool/post/branding assets. Files land in Convex storage (disk
 * mirror during transition); the response carries /api/media/{id} for
 * the profile PATCH avatar field.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  // Strict purpose gate (the shared handler falls back to "gallery" for
  // unknown purposes — user uploads must only ever mint avatars). The
  // parsed form is passed through (request bodies parse exactly once).
  const form = await req.formData().catch(() => null);
  if (!form || String(form.get("purpose") || "avatar") !== "avatar") {
    return NextResponse.json(
      { error: "Only avatar uploads are allowed here." },
      { status: 400 }
    );
  }
  try {
    return await handleMediaUpload(req, {
      ownerKey: `user:${user.email}`,
      allowedPurposes: ["avatar"],
      form,
    });
  } catch (err) {
    console.error("[api:upload] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
