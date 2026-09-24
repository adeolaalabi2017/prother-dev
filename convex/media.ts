/**
 * Convex media library (Phase 5): metadata lives here, bytes stay on disk
 * served by /api/media/[id] (fs reads are runtime-local; see lib/media.ts).
 *
 * Reads mirror lib/media.ts shapes exactly (MediaRow with ISO createdAt).
 * mediaDeleteFull clears every reference (tool logo/screenshots, post
 * covers) transactionally; the route clears NextAuth avatars (micro-SQLite)
 * and deletes the bytes separately.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isoFromMs } from "./shared";

function docId<T extends { legacyId?: string; _id: string }>(d: T): string {
  return d.legacyId ?? d._id;
}

function serialize(r: {
  legacyId?: string;
  _id: string;
  kind: string;
  mimeType: string;
  size: number;
  originalName: string;
  storedName?: string;
  width?: number;
  height?: number;
  purpose: string;
  ownerKey: string;
  createdAt: number;
}) {
  return {
    id: docId(r),
    kind: r.kind,
    mimeType: r.mimeType,
    size: r.size,
    originalName: r.originalName,
    storedName: r.storedName ?? "",
    width: r.width ?? null,
    height: r.height ?? null,
    purpose: r.purpose,
    ownerKey: r.ownerKey,
    createdAt: isoFromMs(r.createdAt),
  };
}

export const mediaTable = query({
  args: {
    kind: v.optional(v.string()),
    purpose: v.optional(v.string()),
    take: v.number(),
  },
  handler: async (ctx, { kind, purpose, take }) => {
    const rows = await ctx.db.query("media").collect();
    const filtered = rows.filter(
      (r) =>
        (!kind || r.kind === kind) && (!purpose || r.purpose === purpose),
    );
    const limited = [...filtered]
      .sort((a, b) => b.createdAt - a.createdAt || a._creationTime - b._creationTime)
      .slice(0, Math.min(Math.max(take, 1), 500));
    return {
      media: limited.map(serialize),
      totalBytes: rows.reduce((s, r) => s + r.size, 0),
    };
  },
});

export const mediaById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const rows = await ctx.db.query("media").collect();
    const row = rows.find((r) => docId(r) === id);
    return row ? serialize(row) : null;
  },
});

/** Batch tool media columns by Prisma cuid (lib/media.ts toolMediaByIds). */
export const toolMediaBatch = query({
  args: { legacyIds: v.array(v.string()) },
  handler: async (ctx, { legacyIds }) => {
    const set = new Set(legacyIds);
    const tools = (await ctx.db.query("tools").collect()).filter((t) =>
      set.has(docId(t)),
    );
    return tools.map((t) => ({
      id: docId(t),
      logoUrl: t.logoUrl ?? null,
      screenshotUrls: t.screenshotUrls,
    }));
  },
});

/** Batch post covers by Prisma cuid (lib/media.ts postCoversByIds). */
export const postCoversBatch = query({
  args: { legacyIds: v.array(v.string()) },
  handler: async (ctx, { legacyIds }) => {
    const set = new Set(legacyIds);
    const posts = (await ctx.db.query("posts").collect()).filter((p) =>
      set.has(docId(p)),
    );
    return posts.map((p) => ({ id: docId(p), coverUrl: p.coverUrl ?? null }));
  },
});

export const mediaCreate = mutation({
  args: {
    id: v.string(),
    kind: v.string(),
    mimeType: v.string(),
    size: v.number(),
    originalName: v.string(),
    storedName: v.string(),
    width: v.optional(v.union(v.number(), v.null())),
    height: v.optional(v.union(v.number(), v.null())),
    purpose: v.string(),
    ownerKey: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, a) => {
    const id = await ctx.db.insert("media", {
      kind: a.kind,
      mimeType: a.mimeType,
      size: a.size,
      originalName: a.originalName,
      storedName: a.storedName,
      width: a.width ?? undefined,
      height: a.height ?? undefined,
      purpose: a.purpose,
      ownerKey: a.ownerKey,
      legacyId: a.id,
      createdAt: a.createdAt,
    });
    return serialize((await ctx.db.get(id))!);
  },
});

/** Delete the row + clear tool/post references (avatars + bytes: route). */
export const mediaDeleteFull = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const rows = await ctx.db.query("media").collect();
    const row = rows.find((r) => docId(r) === id);
    if (!row) return null;
    const url = `/api/media/${docId(row)}`;
    const [tools, posts] = await Promise.all([
      ctx.db.query("tools").collect(),
      ctx.db.query("posts").collect(),
    ]);
    for (const t of tools) {
      const patch: Record<string, unknown> = {};
      if (t.logoUrl === url) patch.logoUrl = undefined;
      if (t.screenshotUrls.includes(url)) {
        patch.screenshotUrls = t.screenshotUrls.filter((u) => u !== url);
      }
      if (Object.keys(patch).length > 0) await ctx.db.patch(t._id, patch as never);
    }
    for (const p of posts) {
      if (p.coverUrl === url) await ctx.db.patch(p._id, { coverUrl: undefined });
    }
    await ctx.db.delete(row._id);
    return serialize(row);
  },
});
