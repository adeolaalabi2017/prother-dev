import { NextResponse } from "next/server";
import {
  createMediaRow,
  isAllowedMime,
  kindForMime,
  maxBytesForMime,
  mediaUrl,
  saveUploadFile,
} from "@/lib/media";
import {
  FAVICON_MAX_BYTES,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  formatBytes,
  isFaviconMime,
} from "@/lib/media-limits";

/**
 * Shared multipart upload handler for POST /api/admin/upload and
 * POST /api/upload (Task 34; favicon support Task 35).
 *
 * Limits (mirrored client-side in lib/upload-client.ts):
 * - images: ≤2MB AFTER client-side compression (server re-enforces; the
 *   original file may be larger, the browser shrinks it before sending)
 * - videos: hard 5MB cap
 * - favicons (ICO): hard 512KB cap, stored as-is (never recompressed)
 * The client passes width/height for images so the gallery can lay out
 * without decoding every file.
 */

export type UploadResult = {
  id: string;
  url: string;
  kind: "image" | "video";
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalName: string;
};

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function handleMediaUpload(
  req: Request,
  opts: { ownerKey: string; allowedPurposes: string[] }
): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Expected multipart form data with a file field.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail(400, "Missing file.");
  }
  if (file.size === 0) return fail(400, "The selected file is empty.");

  // Mirror lib/upload-client.ts: .ico files with an empty reported type are
  // still favicons (mime inferred from the extension).
  const rawType = (file.type || "").toLowerCase();
  const mime =
    rawType ||
    (file.name.toLowerCase().endsWith(".ico") ? "image/x-icon" : "");
  if (!isAllowedMime(mime)) {
    return fail(
      415,
      "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF or ICO images and MP4, WebM, MOV videos."
    );
  }

  const kind = kindForMime(mime);
  if (!kind) return fail(415, "Unsupported file type.");

  // Per-type cap: 512KB favicons, 5MB videos, 2MB images (maxBytesForMime
  // resolves all three, so the error below can quote the exact limit).
  const cap = maxBytesForMime(mime);
  if (file.size > cap) {
    if (isFaviconMime(mime)) {
      return fail(
        413,
        `Favicons are limited to ${formatBytes(FAVICON_MAX_BYTES)}. Pick a smaller file.`
      );
    }
    return fail(
      413,
      kind === "video"
        ? `Videos are limited to ${formatBytes(VIDEO_MAX_BYTES)}. Trim or compress the clip, then try again.`
        : `Images are limited to ${formatBytes(IMAGE_MAX_BYTES)} after compression. Pick a smaller file.`
    );
  }

  const purposeRaw = String(form.get("purpose") || "gallery");
  const purpose = opts.allowedPurposes.includes(purposeRaw)
    ? purposeRaw
    : "gallery";

  // Client-measured pixel dimensions (optional, images only).
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  const w = Number.isInteger(width) && width > 0 && width <= 20000 ? width : null;
  const h =
    Number.isInteger(height) && height > 0 && height <= 20000 ? height : null;

  const bytes = Buffer.from(await file.arrayBuffer());
  const storedName = await saveUploadFile(bytes, mime);
  const row = await createMediaRow({
    kind,
    mimeType: mime,
    size: bytes.byteLength,
    originalName: file.name.slice(0, 180) || "upload",
    storedName,
    width: kind === "image" ? w : null,
    height: kind === "image" ? h : null,
    purpose,
    ownerKey: opts.ownerKey,
  });

  const result: UploadResult = {
    id: row.id,
    url: mediaUrl(row.id),
    kind: row.kind as "image" | "video",
    mimeType: row.mimeType,
    size: row.size,
    width: row.width,
    height: row.height,
    originalName: row.originalName,
  };
  return NextResponse.json({ media: result }, { status: 201 });
}
