import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import { handleMediaUpload } from "@/lib/media-upload";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload — Admin Console media upload (multipart).
 * Body: file, purpose (tool-logo | tool-screenshot | post-cover | avatar |
 * gallery), optional width/height for images. Images arrive compressed to
 * ≤2MB by lib/upload-client.ts; videos are capped at 5MB. Both limits are
 * re-enforced server-side.
 */
export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  const res = await handleMediaUpload(req, {
    ownerKey: "admin",
    allowedPurposes: ["tool-logo", "tool-screenshot", "post-cover", "avatar", "gallery"],
  });
  if (res.status === 201) {
    try {
      const { media } = (await res.clone().json()) as {
        media?: { id?: string; originalName?: string; size?: number };
      };
      logAudit(
        "media.upload",
        "media",
        media?.id ?? "",
        `${media?.originalName ?? "file"} (${media?.size ?? 0}B)`
      );
    } catch {
      /* audit must never break the request path */
    }
  }
  return res;
}
