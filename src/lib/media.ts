import { randomUUID } from "node:crypto";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api.js";

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
// Bytes live in Convex file storage (Workers-safe). The pre-migration disk
// layer (uploads/ + save/read/deleteUploadFile) was removed with the
// storage cutover — rows carry storageId, served via mediaServeUrl.

// ── Rows (Convex-backed; shapes mirror the old raw-SQL layer) ────────────
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

// ISO-wire createdAt may arrive as ms-epoch or ISO — normalize to ISO.
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

/** Convex client or null when unconfigured (all callers are server-side). */
function cx() {
  return createServerConvexClient();
}

/** Persist a Media row, putting the validated bytes straight into Convex
 *  storage (Workers-safe). Storage is required — a failed put is a 500,
 *  never a silent disk-only row. */
export async function createMediaRow(input: {
  kind: "image" | "video";
  mimeType: string;
  size: number;
  originalName: string;
  width?: number | null;
  height?: number | null;
  purpose?: string;
  ownerKey?: string;
  bytes: Buffer;
}): Promise<MediaRow> {
  const client = cx()!;
  const id = `m_${randomUUID()}`;
  const createdAt = Date.now();
  const uploadUrl: string = await client.mutation(api.media.mediaUploadUrl, {});
  const put = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": input.mimeType },
    body: new Uint8Array(input.bytes),
  });
  if (!put.ok) throw new Error(`storage put ${put.status}`);
  const { storageId } = (await put.json()) as { storageId: string };
  const row = await client.mutation(api.media.mediaCreate, {
    id,
    kind: input.kind,
    mimeType: input.mimeType,
    size: input.size,
    originalName: input.originalName,
    width: input.width ?? null,
    height: input.height ?? null,
    purpose: input.purpose ?? "gallery",
    ownerKey: input.ownerKey ?? "",
    createdAt,
    storageId: storageId as never,
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

/** Total stored bytes across the library (quota surface for the gallery). */
export async function totalMediaBytes(): Promise<number> {
  const res = await cx()!.query(
    api.media.mediaTable,
    { take: 1 }
  );
  return res.totalBytes;
}

// ── Tool / Post media columns (Convex-backed) ────────────────────────────
export type ToolMedia = { logoUrl: string | null; screenshotUrls: string[] };

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
