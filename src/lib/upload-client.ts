import imageCompression from "browser-image-compression";
import {
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  IMAGE_SOURCE_MAX_BYTES,
  VIDEO_ACCEPT,
  VIDEO_MAX_BYTES,
  formatBytes,
  isAllowedMime,
  kindForMime,
} from "@/lib/media-limits";

/**
 * Browser-side media preparation + upload (Task 34).
 *
 * Client-side compression BEFORE upload, per the brief: browser-image-
 * compression runs in the visitor's browser and shrinks JPEG/PNG/WebP images
 * to 2MB max, so the server never stores or processes oversized originals.
 * Videos are capped at 5MB and rejected before any bytes are sent.
 *
 * This module is browser-only by construction (it is imported by client
 * components); the server re-validates every limit in lib/media-upload.ts.
 */

export { IMAGE_ACCEPT, IMAGE_MAX_BYTES, VIDEO_ACCEPT, VIDEO_MAX_BYTES, formatBytes };

export type PreparedMedia = {
  file: File;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
  /** True when browser-image-compression actually rewrote the file. */
  compressed: boolean;
  originalSize: number;
};

/** Dimensions without rendering into the DOM (falls back to null). */
async function measureImage(file: File): Promise<{
  width: number | null;
  height: number | null;
}> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return { width: null, height: null };
  }
}

const COMPRESSION_TARGET_MB = (IMAGE_MAX_BYTES - 48 * 1024) / (1024 * 1024); // headroom under the 2MB cap

/**
 * Validate + (for images over the cap) compress a picked file.
 * Throws Error with a user-facing message when the file can never fit.
 */
export async function prepareMedia(file: File): Promise<PreparedMedia> {
  const mime = (file.type || "").toLowerCase();
  if (!isAllowedMime(mime)) {
    throw new Error(
      "Unsupported file type. Use JPEG, PNG, WebP or GIF images, or MP4, WebM, MOV videos."
    );
  }
  const kind = kindForMime(mime);
  if (!kind) throw new Error("Unsupported file type.");
  if (file.size === 0) throw new Error("The selected file is empty.");

  if (kind === "video") {
    if (file.size > VIDEO_MAX_BYTES) {
      throw new Error(
        `Videos are limited to ${formatBytes(VIDEO_MAX_BYTES)}. This clip is ${formatBytes(file.size)}. Trim or compress it, then try again.`
      );
    }
    return {
      file,
      kind,
      width: null,
      height: null,
      compressed: false,
      originalSize: file.size,
    };
  }

  // ── Image path ────────────────────────────────────────────────────────
  if (file.size > IMAGE_SOURCE_MAX_BYTES) {
    throw new Error(
      `Pick an image under ${formatBytes(IMAGE_SOURCE_MAX_BYTES)}. This one is ${formatBytes(file.size)}.`
    );
  }

  // GIFs: compression would kill the animation, so they must fit as-is.
  if (mime === "image/gif") {
    if (file.size > IMAGE_MAX_BYTES) {
      throw new Error(
        `Animated GIFs are limited to ${formatBytes(IMAGE_MAX_BYTES)} (they are not recompressed). This one is ${formatBytes(file.size)}.`
      );
    }
    const dims = await measureImage(file);
    return { file, kind: "image", ...dims, compressed: false, originalSize: file.size };
  }

  let working = file;
  let compressed = false;

  if (working.size > IMAGE_MAX_BYTES) {
    working = await imageCompression(working, {
      maxSizeMB: COMPRESSION_TARGET_MB,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      initialQuality: 0.85,
    });
    compressed = true;
  }
  // Noisy PNGs sometimes stay above the cap after the first pass; a JPEG
  // re-encode with a lower quality always lands under it.
  if (working.size > IMAGE_MAX_BYTES) {
    working = await imageCompression(working, {
      maxSizeMB: COMPRESSION_TARGET_MB,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      initialQuality: 0.72,
      fileType: "image/jpeg",
    });
    compressed = true;
  }
  if (working.size > IMAGE_MAX_BYTES) {
    throw new Error(
      `Could not compress this image under ${formatBytes(IMAGE_MAX_BYTES)}. Please resize it and try again.`
    );
  }

  const outType = (working.type || mime).toLowerCase();
  const outName =
    outType !== mime && working.name.toLowerCase().endsWith(".png")
      ? `${working.name.replace(/\.png$/i, "")}.jpg`
      : working.name;

  const finalFile =
    outType !== mime || outName !== working.name
      ? new File([working], outName, { type: outType })
      : working;

  const dims = await measureImage(finalFile);
  return {
    file: finalFile,
    kind: "image",
    ...dims,
    compressed,
    originalSize: file.size,
  };
}

export type UploadEndpoints = "admin" | "user";

export type UploadResult = {
  id: string;
  url: string;
  kind: "image" | "video";
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalName: string;
  /** True when browser-image-compression rewrote the file before upload. */
  compressed: boolean;
};

export type UploadStage =
  | { phase: "compressing"; percent: number }
  | { phase: "uploading" }
  | { phase: "done" };

/**
 * Prepare (compress if needed) then POST the file.
 * endpoint "admin" → POST /api/admin/upload with the x-editor-key header;
 * endpoint "user"  → POST /api/upload (session cookie auth).
 */
export async function uploadMedia(
  input: File,
  opts: {
    endpoint: UploadEndpoints;
    purpose: string;
    editorKey?: string;
    onStage?: (stage: UploadStage) => void;
  }
): Promise<UploadResult> {
  opts.onStage?.({ phase: "compressing", percent: 0 });
  const prepared = await prepareMedia(input);
  opts.onStage?.({ phase: "compressing", percent: 100 });
  opts.onStage?.({ phase: "uploading" });

  const form = new FormData();
  form.append("file", prepared.file);
  form.append("purpose", opts.purpose);
  if (prepared.width) form.append("width", String(prepared.width));
  if (prepared.height) form.append("height", String(prepared.height));

  const headers: Record<string, string> = {};
  if (opts.endpoint === "admin") {
    if (!opts.editorKey) throw new Error("Unlock the Admin Console first.");
    headers["x-editor-key"] = opts.editorKey;
  }

  const res = await fetch(
    opts.endpoint === "admin" ? "/api/admin/upload" : "/api/upload",
    { method: "POST", headers, body: form }
  );

  let payload: { media?: UploadResult; error?: string } | null = null;
  try {
    payload = (await res.json()) as { media?: UploadResult; error?: string };
  } catch {
    /* non-JSON error body */
  }

  if (!res.ok || !payload?.media) {
    throw new Error(
      payload?.error ??
        `Upload failed (${res.status}). Check your connection and try again.`
    );
  }
  opts.onStage?.({ phase: "done" });
  return { ...payload.media, compressed: prepared.compressed };
}
