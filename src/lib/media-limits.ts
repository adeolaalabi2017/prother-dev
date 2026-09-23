/**
 * Media limits + type helpers (Task 34) — pure, dependency-free constants
 * shared by SERVER enforcement (lib/media.ts) and CLIENT pre-upload
 * compression (lib/upload-client.ts). Keep this file free of node builtins
 * and Prisma imports so it can ship in the browser bundle.
 *
 * Policy from the Task 34 brief (extended in Task 35 with favicon support):
 * - images: client-side compression (browser-image-compression) shrinks
 *   JPEG/PNG/WebP to 2MB max in the visitor's browser before anything is
 *   sent to the server
 * - videos: hard 5MB cap, rejected before upload
 * - favicons (ICO): hard 512KB cap, never recompressed (ico files must stay
 *   byte-exact multi-resolution containers)
 * - the same limits apply to users and admins (server re-enforces both)
 */

/** Images must land at or under this size (2MB, post-compression). */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
/** Hard video cap (5MB). */
export const VIDEO_MAX_BYTES = 5 * 1024 * 1024;
/** Hard favicon cap (512KB) — ICO files are stored as-is, never recompressed. */
export const FAVICON_MAX_BYTES = 512 * 1024;
/** Sanity cap for the ORIGINAL image before compression starts (30MB). */
export const IMAGE_SOURCE_MAX_BYTES = 30 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const FAVICON_MIME_TYPES = [
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;
export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type AllowedMime =
  | (typeof IMAGE_MIME_TYPES)[number]
  | (typeof FAVICON_MIME_TYPES)[number]
  | (typeof VIDEO_MIME_TYPES)[number];

export function maxBytesForMime(mime: string): number {
  if (isFaviconMime(mime)) return FAVICON_MAX_BYTES;
  return mime.startsWith("video/") ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (
    (IMAGE_MIME_TYPES as readonly string[]).includes(mime) ||
    (FAVICON_MIME_TYPES as readonly string[]).includes(mime) ||
    (VIDEO_MIME_TYPES as readonly string[]).includes(mime)
  );
}

export function isFaviconMime(mime: string): boolean {
  return (FAVICON_MIME_TYPES as readonly string[]).includes(mime);
}

export function isImageMime(mime: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function isVideoMime(mime: string): boolean {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

export function kindForMime(mime: string): "image" | "video" | null {
  if (isImageMime(mime)) return "image";
  if (isFaviconMime(mime)) return "image";
  if (isVideoMime(mime)) return "video";
  return null;
}

const IMAGE_EXTS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};
const VIDEO_EXTS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Disk extension for a stored upload, or null when the mime is unknown. */
export function extForMime(mime: string): string | null {
  return IMAGE_EXTS[mime] ?? VIDEO_EXTS[mime] ?? null;
}

/** Human-readable accept attribute for file inputs. */
export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif";
export const FAVICON_ACCEPT = "image/png,image/webp,image/x-icon,.ico";
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
