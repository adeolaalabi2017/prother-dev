import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleMediaUpload } from "@/lib/media-upload";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload — signed-in user media upload (multipart).
 * Same size limits as the admin route (images ≤2MB after client-side
 * compression, videos ≤5MB hard cap). Users may upload avatars and gallery
 * files; listing media stays admin-side.
 */
export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 });
  }
  return handleMediaUpload(req, {
    ownerKey: `user:${user.email}`,
    allowedPurposes: ["avatar", "gallery"],
  });
}
