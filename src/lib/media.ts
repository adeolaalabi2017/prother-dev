import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api.js";
import { extForMime } from "@/lib/media-limits";

// Re-export the pure limit constants/type guards so server consumers import
// from one module while the browser bundle uses lib/media-limits.ts directly
// (this file must never be pulled into client code: node builtins + Prisma).
export {
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  VIDEO_MAX_BYTES,
  VIDEO_MIME_TYPES,
  isAllowedMime,
  kindForMime,
  maxBytesForMime,
} from "@/lib/media-limits";

/**
 * Media library helpers (Task 34).
 *
 * Media and the Tool.logoUrl / Tool.screenshotUrls / Post.coverUrl columns are
 * POST-boot schema: the long-running dev server can hold a cached pre-v8
 * PrismaClient that does not know them, so EVERY read/write here goes through
 * raw SQL (same rule as Category.features — see lib/features.ts and the
 * stale-PrismaClient note in lib/forum.ts). Standalone scripts may use the
 * ORM freely.
 *
 * Files live in <projectRoot>/uploads/ (outside public/, gitignored) and are
 * served by GET /api/media/[id] so the storage layout never leaks and cache
 * headers stay under our control.
 */

// ── Limits (client + server enforced; Task 34 brief) ─────────────────────
// Values + type guards live in lib/media-limits.ts (client-safe); server
// enforcement happens in lib/media-upload.ts.

// ── Storage ──────────────────────────────────────────────────────────────
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/** Stored filenames are server-generated: <ms>-<uuid>.<ext>. Reject anything
 *  else so the file reader can never be walked out of uploads/.
 *  ico joins the allowlist with the Task 35 favicon support (lib/media-limits). */
const STORED_NAME_RE = /^[0-9]+-[0-9a-f-]{36}\.(jpg|png|webp|gif|ico|mp4|webm|mov)$/;

export function isValidStoredName(name: string): boolean {
  return STORED_NAME_RE.test(name);
}

/** Write bytes to uploads/ under a generated name; returns the stored name. */
export async function saveUploadFile(
  bytes: Buffer,
  mime: string
): Promise<string> {
  const ext = extForMime(mime);
  if (!ext) throw new Error(`Unsupported media type: ${mime}`);
  await mkdir(UPLOADS_DIR, { recursive: true });
  const storedName = `${Date.now()}-${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOADS_DIR, storedName), bytes);
  return storedName;
}

/** Read a stored file back (path-traversal safe). Null when missing. */
export async function readUploadFile(
  storedName: string
): Promise<Buffer | null> {
  if (!isValidStoredName(storedName)) return null;
  try {
    return await readFile(path.join(UPLOADS_DIR, storedName));
  } catch {
    return null;
  }
}

export async function deleteUploadFile(storedName: string): Promise<void> {
  if (!isValidStoredName(storedName)) return;
  try {
    await unlink(path.join(UPLOADS_DIR, storedName));
  } catch {
    /* already gone — deletion is idempotent */
  }
}

// ── Rows (raw SQL — stale-PrismaClient rule) ─────────────────────────────
export type MediaRow = {
  id: string;
  kind: string;
  mimeType: string;
  size: number;
  originalName: string;
  storedName: string;
  width: number | null;
  height: number | null;
  purpose: string;
  ownerKey: string;
  createdAt: string; // ISO
};

/** Canonical public URL for a media row (theme/origin independent). */
export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

// Prisma $queryRaw returns SQLite DATETIME columns as JS Date objects at
// runtime (the declared number|string type is incomplete), so accept Date
// explicitly or every row would fall through to the epoch fallback.
function toIso(v: number | string | Date | null): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n) && v.trim() !== "") return new Date(n).toISOString();
    return new Date(v).toISOString();
  }
  return new Date(0).toISOString();
}

const MEDIA_COLS =
  "id, kind, mimeType, size, originalName, storedName, width, height, purpose, ownerKey, createdAt";

/** Convex client or null when unconfigured (all callers are server-side). */
function cx() {
  return createServerConvexClient();
}

/** Persist a Media row after the bytes are already on disk. */
export async function createMediaRow(input: {
  kind: "image" | "video";
  mimeType: string;
  size: number;
  originalName: string;
  storedName: string;
  width?: number | null;
  height?: number | null;
  purpose?: string;
  ownerKey?: string;
}): Promise<MediaRow> {
  const client = cx()!;
  const id = `m_${randomUUID()}`;
  const createdAt = Date.now();
  const row = await client.mutation(api.media.mediaCreate, {
    id,
    kind: input.kind,
    mimeType: input.mimeType,
    size: input.size,
    originalName: input.originalName,
    storedName: input.storedName,
    width: input.width ?? null,
    height: input.height ?? null,
    purpose: input.purpose ?? "gallery",
    ownerKey: input.ownerKey ?? "",
    createdAt,
  });
  return { ...row, createdAt: toIso(row.createdAt) };
}

export async function getMediaById(id: string): Promise<MediaRow | null> {
  const row = await cx()!.query(api.media.mediaById, { id });
  return row ? { ...row, createdAt: toIso(row.createdAt) } : null;
}

/** Newest-first library listing with optional filters. */
export async function listMedia(opts: {
  kind?: "image" | "video" | null;
  purpose?: string | null;
  take?: number;
}): Promise<MediaRow[]> {
  const take = Math.min(Math.max(opts.take ?? 120, 1), 500);
  const res = await cx()!.query(api.media.mediaTable, {
    kind: opts.kind ?? undefined,
    purpose: opts.purpose ?? undefined,
    take,
  });
  return res.media.map((r) => ({ ...r, createdAt: toIso(r.createdAt) }));
}

/** Delete the row + its bytes. Returns false when the id is unknown. */
export async function deleteMedia(id: string): Promise<boolean> {
  const row = await getMediaById(id);
  if (!row) return false;
  await cx()!.mutation(api.media.mediaDeleteFull, { id });
  await deleteUploadFile(row.storedName);
  return true;
}

/** Total bytes on disk across the library (quota surface for the gallery). */
export async function totalMediaBytes(): Promise<number> {
  const res = await cx()!.query(
    api.media.mediaTable,
    { take: 1 }
  );
  return res.totalBytes;
}

// ── Tool / Post media columns (POST-boot: raw SQL only) ──────────────────
export type ToolMedia = { logoUrl: string | null; screenshotUrls: string[] };

/** Parse the pipe-separated screenshot list (deduped, order kept). */
export function parseMediaUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

/** logoUrl + screenshotUrls for the given tool ids: Map<toolId, ToolMedia>. */
export async function toolMediaByIds(ids: string[]): Promise<Map<string, ToolMedia>> {
  if (ids.length === 0) return new Map();
  const rows = await cx()!.query(api.media.toolMediaBatch, { legacyIds: ids });
  return new Map(
    rows.map((r) => [
      r.id,
      { logoUrl: r.logoUrl, screenshotUrls: r.screenshotUrls },
    ])
  );
}

export async function setToolLogo(id: string, url: string | null): Promise<void> {
  await cx()!.mutation(api.adminCrud.toolPatch, {
    toolLegacyId: id,
    data: {},
    logoUrl: url,
    nowMs: Date.now(),
  });
}

export async function setToolScreenshots(id: string, urls: string[]): Promise<void> {
  await cx()!.mutation(api.adminCrud.toolPatch, {
    toolLegacyId: id,
    data: {},
    screenshotUrls: urls,
    nowMs: Date.now(),
  });
}

/** coverUrl for the given post ids: Map<postId, string | null>. */
export async function postCoversByIds(ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const rows = await cx()!.query(api.media.postCoversBatch, { legacyIds: ids });
  return new Map(rows.map((r) => [r.id, r.coverUrl]));
}

export async function setPostCover(id: string, url: string | null): Promise<void> {
  await cx()!.mutation(api.adminCrud.postPatch, {
    postLegacyId: id,
    data: { updatedAt: Date.now() },
    coverUrl: url,
  });
}
