/**
 * Community engagement shared helpers (reviews / claims / follows /
 * collections / compare) used across the community API routes.
 *
 * RAW-SQL NOTE: the community models (Review, Claim, Collection,
 * CollectionItem, Follow, Comparison) were pushed to SQLite AFTER the
 * long-running dev server booted — its require-cached PrismaClient predates
 * them (same stale-client situation documented in lib/discussion.ts).
 * Every query against those models therefore goes through $queryRaw
 * (model-independent). Old models (Tool, Category, User, AuditLog, Comment)
 * keep using the ORM.
 *
 * SQLite DateTime storage is INTEGER ms-epoch (verified) — raw inserts write
 * Date.now() integers so ORM reads and SQL comparisons stay consistent.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { domainOf } from "@/lib/submit";

// ── Tool community columns (makerEmail) ─────────────────────────
// This Tool column was pushed AFTER the dev server booted, so it may be
// missing from its require-cached PrismaClient — it goes through $queryRaw
// (same reason as the community models above).

export type ToolCommunityFields = {
  makerEmail: string | null;
};

const TOOL_FIELDS = "makerEmail";

type ToolFieldsRow = {
  slug: string;
  makerEmail: string | null;
};

function mapToolFields(r: ToolFieldsRow): ToolCommunityFields {
  return { makerEmail: r.makerEmail };
}

export async function toolCommunityFields(toolId: string): Promise<ToolCommunityFields> {
  const rows = await db.$queryRaw<ToolFieldsRow[]>`
    SELECT ${Prisma.raw(TOOL_FIELDS)} FROM Tool WHERE id = ${toolId} LIMIT 1`;
  return mapToolFields(rows[0] ?? { slug: "", makerEmail: null });
}

export async function toolCommunityFieldsBySlugs(
  slugs: string[]
): Promise<Map<string, ToolCommunityFields>> {
  if (slugs.length === 0) return new Map();
  const rows = await db.$queryRaw<ToolFieldsRow[]>`
    SELECT slug, ${Prisma.raw(TOOL_FIELDS)} FROM Tool
    WHERE slug IN (${Prisma.join(slugs)})`;
  return new Map(rows.map((r) => [r.slug, mapToolFields(r)]));
}

/** Rights transfer after a verified claim — raw (makerEmail is a new column). */
export async function transferToolRights(
  toolId: string,
  user: { email: string; handle: string }
): Promise<void> {
  await db.$executeRaw`
    UPDATE Tool
    SET claimed = 1, makerEmail = ${user.email}, makerHandle = ${`@${user.handle}`},
        verifiedAt = ${Date.now()}
    WHERE id = ${toolId}`;
}

// ── Small utils ──────────────────────────────────────────────────────────

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** SQLite raw reads may return ms-number or (legacy) ISO-string timestamps. */
export function toIso(v: number | string | null | undefined): string {
  if (v == null) return new Date(0).toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/** UTC midnight of "today" — useful for day-anchored stats. */
export function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/** Canonical domain match helper (delegates to lib/submit). */
export function sameDomain(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = a ? domainOf(a) : null;
  const dbb = b ? domainOf(b) : null;
  return da != null && dbb != null && da === dbb;
}

// ── Reviews (F-16) ───────────────────────────────────────────────────────

export type ReviewAggregate = {
  count: number;
  ease: number;
  power: number;
  value: number;
  overall: number;
};

export type ReviewStats = { count: number; aggregate: ReviewAggregate | null };

/**
 * Published review count + the 3-dimension aggregate. Aggregate unlocks at
 * ≥3 published reviews (P3 policy); each dim is avg rounded to 1dp and
 * overall is the average of the three dims.
 */
export async function reviewStats(toolId: string): Promise<ReviewStats> {
  const rows = await db.$queryRaw<{ n: number; se: number; sp: number; sv: number }[]>`
    SELECT COUNT(*) as n,
           COALESCE(SUM(ease), 0)  as se,
           COALESCE(SUM(power), 0) as sp,
           COALESCE(SUM(value), 0) as sv
    FROM Review
    WHERE toolId = ${toolId} AND status = 'published'`;
  const r = rows[0];
  const count = Number(r?.n ?? 0);
  if (count < 3) return { count, aggregate: null };
  const se = Number(r!.se);
  const sp = Number(r!.sp);
  const sv = Number(r!.sv);
  return {
    count,
    aggregate: {
      count,
      ease: round1(se / count),
      power: round1(sp / count),
      value: round1(sv / count),
      overall: round1((se + sp + sv) / (3 * count)),
    },
  };
}

export type ReviewRow = {
  id: string;
  toolId: string;
  userId: string;
  author: string;
  ease: number;
  power: number;
  value: number;
  body: string;
  status: string;
  createdAt: number | string;
  updatedAt: number | string;
};

function mapReviewRow(r: {
  id: string;
  toolId: string;
  userId: string;
  author: string;
  ease: number;
  power: number;
  value: number;
  body: string;
  status: string;
  createdAt: number | string;
  updatedAt: number | string;
}): ReviewRow {
  return { ...r, ease: Number(r.ease), power: Number(r.power), value: Number(r.value) };
}

export async function listPublishedReviews(toolId: string, limit = 200): Promise<ReviewRow[]> {
  const rows = await db.$queryRaw<ReviewRow[]>`
    SELECT id, toolId, userId, author, ease, power, value, body, status, createdAt, updatedAt
    FROM Review
    WHERE toolId = ${toolId} AND status = 'published'
    ORDER BY createdAt DESC
    LIMIT ${limit}`;
  return rows.map(mapReviewRow);
}

export async function reviewByUser(toolId: string, userId: string): Promise<ReviewRow | null> {
  const rows = await db.$queryRaw<ReviewRow[]>`
    SELECT id, toolId, userId, author, ease, power, value, body, status, createdAt, updatedAt
    FROM Review
    WHERE toolId = ${toolId} AND userId = ${userId}
    LIMIT 1`;
  return rows[0] ? mapReviewRow(rows[0]) : null;
}

export async function upsertReviewRow(input: {
  toolId: string;
  userId: string;
  author: string;
  ease: number;
  power: number;
  value: number;
  body: string;
  status: string;
  /** Dual-write overrides (Phase 4 step 3) — shared id/timestamps. */
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}): Promise<ReviewRow> {
  const existing = await reviewByUser(input.toolId, input.userId);
  const now = input.updatedAt ?? Date.now();
  if (existing) {
    await db.$executeRaw`
      UPDATE Review
      SET ease = ${input.ease}, power = ${input.power}, value = ${input.value},
          body = ${input.body}, status = ${input.status}, updatedAt = ${now}
      WHERE id = ${existing.id}`;
  } else {
    const created = input.createdAt ?? now;
    await db.$executeRaw`
      INSERT INTO Review (id, toolId, userId, author, ease, power, value, body, status, createdAt, updatedAt)
      VALUES (${input.id ?? crypto.randomUUID()}, ${input.toolId}, ${input.userId}, ${input.author},
              ${input.ease}, ${input.power}, ${input.value}, ${input.body}, ${input.status},
              ${created}, ${now})`;
  }
  return (await reviewByUser(input.toolId, input.userId))!;
}

/** Serialized review for API responses. */
export function serializeReview(r: ReviewRow, mine: boolean) {
  return {
    id: r.id,
    author: r.author,
    ease: r.ease,
    power: r.power,
    value: r.value,
    body: r.body,
    status: r.status,
    createdAt: toIso(r.createdAt),
    mine,
  };
}

/** Review maker self-block (F-16): claimed owner OR same registrable domain. */
export function isReviewMaker(
  tool: { claimed: boolean; makerEmail: string | null; websiteUrl: string },
  user: { email: string }
): boolean {
  return (tool.claimed && tool.makerEmail === user.email) || sameDomain(user.email, tool.websiteUrl);
}

// ── Claims ────────────────────────────────────────────────────────────────

export type ClaimRow = {
  id: string;
  toolId: string;
  userEmail: string;
  userName: string;
  method: string;
  token: string;
  status: string;
  note: string | null;
  createdAt: number | string;
  verifiedAt: number | string | null;
};

export function serializeClaim(c: ClaimRow) {
  return {
    id: c.id,
    status: c.status,
    method: c.method,
    token: c.token,
    note: c.note,
    createdAt: toIso(c.createdAt),
    verifiedAt: c.verifiedAt == null ? null : toIso(c.verifiedAt),
  };
}

const CLAIM_COLS = "id, toolId, userEmail, userName, method, token, status, note, createdAt, verifiedAt";

export async function latestClaimFor(toolId: string, userEmail: string): Promise<ClaimRow | null> {
  const rows = await db.$queryRaw<ClaimRow[]>`
    SELECT ${Prisma.raw(CLAIM_COLS)}
    FROM Claim
    WHERE toolId = ${toolId} AND userEmail = ${userEmail}
    ORDER BY createdAt DESC
    LIMIT 1`;
  return rows[0] ?? null;
}

export async function claimById(id: string): Promise<ClaimRow | null> {
  const rows = await db.$queryRaw<ClaimRow[]>`
    SELECT ${Prisma.raw(CLAIM_COLS)} FROM Claim WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

/** "prother-" + 24 hex chars (from a UUID). Collision-checked by caller loop. */
export function newClaimToken(): string {
  return `prother-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function insertClaim(input: {
  toolId: string;
  userEmail: string;
  userName: string;
  method: "meta_tag" | "email_domain";
  token: string;
  status: "pending" | "verified" | "failed";
  note: string | null;
  verifiedNow: boolean;
  /** Dual-write overrides (Phase 5) — shared id/timestamps. */
  id?: string;
  createdAt?: number;
}): Promise<ClaimRow> {
  const now = input.createdAt ?? Date.now();
  const id = input.id ?? crypto.randomUUID();
  await db.$executeRaw`
    INSERT INTO Claim (id, toolId, userEmail, userName, method, token, status, note, createdAt, verifiedAt)
    VALUES (${id}, ${input.toolId}, ${input.userEmail}, ${input.userName}, ${input.method},
            ${input.token}, ${input.status}, ${input.note}, ${now}, ${input.verifiedNow ? now : null})`;
  return (await claimById(id))!;
}

export async function setClaimStatus(
  id: string,
  status: "verified" | "failed",
  note: string | null
): Promise<void> {
  await db.$executeRaw`
    UPDATE Claim SET status = ${status}, note = ${note},
           verifiedAt = ${status === "verified" ? Date.now() : null}
    WHERE id = ${id}`;
}

/**
 * Verify a claim AND transfer listing rights in one transaction:
 * claim → verified, tool → claimed + makerEmail/makerHandle/verifiedAt.
 * (Tool update is raw — makerEmail is a post-boot column.)
 */
export async function approveClaimAndTransfer(
  claimId: string,
  toolId: string,
  user: { email: string; handle: string }
): Promise<void> {
  await db.$transaction([
    db.$executeRaw`
      UPDATE Claim SET status = 'verified', verifiedAt = ${Date.now()}, note = NULL
      WHERE id = ${claimId}`,
    db.$executeRaw`
      UPDATE Tool
      SET claimed = 1, makerEmail = ${user.email}, makerHandle = ${`@${user.handle}`},
          verifiedAt = ${Date.now()}
      WHERE id = ${toolId}`,
  ]);
}

// ── Follows ──────────────────────────────────────────────────────────────

export type FollowRecord = {
  id: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  createdAt: string;
};

export async function listFollows(userEmail: string): Promise<FollowRecord[]> {
  const rows = await db.$queryRaw<{
    id: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
    createdAt: number | string;
  }[]>`
    SELECT id, targetType, targetId, targetLabel, createdAt
    FROM Follow
    WHERE userEmail = ${userEmail}
    ORDER BY createdAt DESC
    LIMIT 500`;
  return rows.map((r) => ({ ...r, createdAt: toIso(r.createdAt) }));
}

export async function isFollowing(
  userEmail: string,
  targetType: string,
  targetId: string
): Promise<boolean> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM Follow
    WHERE userEmail = ${userEmail} AND targetType = ${targetType} AND targetId = ${targetId}
    LIMIT 1`;
  return rows.length > 0;
}

/** Toggle a follow → returns whether the target is now followed. */
export async function toggleFollow(
  userEmail: string,
  targetType: string,
  targetId: string,
  targetLabel: string
): Promise<boolean> {
  const existing = await isFollowing(userEmail, targetType, targetId);
  if (existing) {
    await db.$executeRaw`
      DELETE FROM Follow
      WHERE userEmail = ${userEmail} AND targetType = ${targetType} AND targetId = ${targetId}`;
    return false;
  }
  await db.$executeRaw`
    INSERT INTO Follow (id, userEmail, targetType, targetId, targetLabel, createdAt)
    VALUES (${crypto.randomUUID()}, ${userEmail}, ${targetType}, ${targetId}, ${targetLabel}, ${Date.now()})`;
  return true;
}

// ── Collections ───────────────────────────────────────────────────────────

export type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerEmail: string;
  ownerName: string;
  createdAt: number | string;
};

export function serializeCollection(c: CollectionRow) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    isPublic: Boolean(c.isPublic),
    ownerEmail: c.ownerEmail,
    ownerName: c.ownerName,
    createdAt: toIso(c.createdAt),
  };
}

const COLLECTION_COLS =
  "id, slug, name, description, isPublic, ownerEmail, ownerName, createdAt";

export async function collectionBySlug(slug: string): Promise<CollectionRow | null> {
  const rows = await db.$queryRaw<CollectionRow[]>`
    SELECT ${Prisma.raw(COLLECTION_COLS)} FROM Collection WHERE slug = ${slug} LIMIT 1`;
  return rows[0] ?? null;
}

export async function insertCollection(input: {
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerEmail: string;
  ownerName: string;
  /** Dual-write overrides (Phase 4 step 3) — shared id/timestamp. */
  id?: string;
  createdAt?: number;
}): Promise<CollectionRow> {
  await db.$executeRaw`
    INSERT INTO Collection (id, slug, name, description, isPublic, ownerEmail, ownerName, createdAt)
    VALUES (${input.id ?? crypto.randomUUID()}, ${input.slug}, ${input.name}, ${input.description},
            ${input.isPublic ? 1 : 0}, ${input.ownerEmail}, ${input.ownerName}, ${input.createdAt ?? Date.now()})`;
  return (await collectionBySlug(input.slug))!;
}

/** slugifyName + "-2"/"-3"… on collision (same policy as lib/prother). */
export async function uniqueCollectionSlug(base: string): Promise<string> {
  const taken = await db.$queryRaw<{ slug: string }[]>`
    SELECT slug FROM Collection WHERE slug LIKE ${base + "%"}`;
  const used = new Set(taken.map((t) => t.slug));
  if (!used.has(base)) return base;
  for (let i = 2; i < 50; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

export type CollectionSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
  itemCount: number;
  covers: string[];
};

/** Attach itemCount + first-3 item tool emojis (covers) to collection rows. */
export async function decorateCollections(rows: CollectionRow[]): Promise<CollectionSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [counts, covers] = await Promise.all([
    db.$queryRaw<{ collectionId: string; n: number }[]>`
      SELECT collectionId, COUNT(*) as n
      FROM CollectionItem
      WHERE collectionId IN (${Prisma.join(ids)})
      GROUP BY collectionId`,
    db.$queryRaw<{ collectionId: string; logoEmoji: string }[]>`
      SELECT ci.collectionId, t.logoEmoji
      FROM CollectionItem ci
      JOIN Tool t ON t.id = ci.toolId
      WHERE ci.collectionId IN (${Prisma.join(ids)})
      ORDER BY ci.collectionId, ci.position ASC, ci.createdAt ASC`,
  ]);
  const countMap = new Map(counts.map((c) => [c.collectionId, Number(c.n)]));
  const coverMap = new Map<string, string[]>();
  for (const c of covers) {
    const list = coverMap.get(c.collectionId) ?? [];
    if (list.length < 3) list.push(c.logoEmoji);
    coverMap.set(c.collectionId, list);
  }
  return rows.map((r) => ({
    ...serializeCollection(r),
    itemCount: countMap.get(r.id) ?? 0,
    covers: coverMap.get(r.id) ?? [],
  }));
}

export type CollectionItemRow = {
  id: string;
  position: number;
  toolId: string;
};

export async function listCollectionItems(collectionId: string): Promise<CollectionItemRow[]> {
  return db.$queryRaw<{ id: string; position: number; toolId: string }[]>`
    SELECT id, position, toolId
    FROM CollectionItem
    WHERE collectionId = ${collectionId}
    ORDER BY position ASC, createdAt ASC
    LIMIT 200`;
}

// ── Comparison ───────────────────────────────────────────────────────────

export async function bumpComparison(aSlug: string, bSlug: string): Promise<void> {
  await db.$executeRaw`
    INSERT INTO Comparison (id, aSlug, bSlug, views, createdAt)
    VALUES (${crypto.randomUUID()}, ${aSlug}, ${bSlug}, 1, ${Date.now()})
    ON CONFLICT(aSlug, bSlug) DO UPDATE SET views = views + 1`;
}

export async function popularComparisons(limit = 5) {
  return db.$queryRaw<{
    aSlug: string;
    bSlug: string;
    views: number;
    aName: string;
    aEmoji: string;
    bName: string;
    bEmoji: string;
  }[]>`
    SELECT c.aSlug, c.bSlug, c.views,
           a.name as aName, a.logoEmoji as aEmoji,
           b.name as bName, b.logoEmoji as bEmoji
    FROM Comparison c
    JOIN Tool a ON a.slug = c.aSlug
    JOIN Tool b ON b.slug = c.bSlug
    ORDER BY c.views DESC, c.createdAt DESC
    LIMIT ${limit}`;
}
