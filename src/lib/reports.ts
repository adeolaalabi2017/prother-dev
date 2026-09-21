/**
 * Community reports (Task 23) — flagging + the Admin Console moderation
 * queue. Resolution can soft-hide the reported content:
 *   thread/reply → hidden flag · tool → status "removed" · post → status "draft"
 * (reusing each surface's existing visibility rules).
 *
 * $queryRaw is deliberate (stale-PrismaClient case — see lib/forum.ts).
 */
import { db } from "@/lib/db";

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "misleading",
  "broken",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGET_TYPES = ["thread", "reply", "tool", "post", "review"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export type ReportRow = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string;
  targetHidden: boolean;
  reason: string;
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  reporter: string; // email or masked anon key
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type ReportListResponse = {
  reports: ReportRow[];
  counts: { open: number; resolved: number; dismissed: number };
};

function toIso(v: number | string | null): string | null {
  if (v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Current visibility snapshot for the target row (has a "hidden" state?). */
async function targetHiddenMap(
  targetType: string,
  ids: string[]
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (ids.length === 0) return map;
  try {
    const placeholders = ids.map(() => "?").join(",");
    if (targetType === "thread" || targetType === "reply") {
      const table = targetType === "thread" ? "ForumThread" : "ForumReply";
      const rows = await db.$queryRawUnsafe<{ id: string; hidden: number | boolean }[]>(
        `SELECT id, hidden FROM ${table} WHERE id IN (${placeholders})`, ...ids
      );
      for (const r of rows) map.set(r.id, Boolean(r.hidden));
    } else if (targetType === "tool") {
      const rows = await db.$queryRawUnsafe<{ id: string; status: string }[]>(
        `SELECT id, status FROM Tool WHERE id IN (${placeholders})`, ...ids
      );
      for (const r of rows) map.set(r.id, r.status === "removed");
    } else if (targetType === "post") {
      const rows = await db.$queryRawUnsafe<{ id: string; status: string }[]>(
        `SELECT id, status FROM Post WHERE id IN (${placeholders})`, ...ids
      );
      for (const r of rows) map.set(r.id, r.status !== "published");
    }
  } catch {
    /* cosmetic */
  }
  return map;
}

/** Canonical href the admin can open to inspect the target. */
async function targetHrefMap(
  targetType: string,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  try {
    const placeholders = ids.map(() => "?").join(",");
    if (targetType === "thread") {
      const rows = await db.$queryRawUnsafe<{ id: string; slug: string }[]>(
        `SELECT id, slug FROM ForumThread WHERE id IN (${placeholders})`, ...ids
      );
      for (const r of rows) map.set(r.id, `/forums/${r.slug}`);
    } else if (targetType === "reply") {
      const rows = await db.$queryRawUnsafe<{ id: string; slug: string }[]>(
        `SELECT fr.id, ft.slug FROM ForumReply fr JOIN ForumThread ft ON ft.id = fr.threadId
         WHERE fr.id IN (${placeholders})`, ...ids
      );
      for (const r of rows) map.set(r.id, `/forums/${r.slug}`);
    } else if (targetType === "tool") {
      const rows = await db.$queryRawUnsafe<{ id: string; slug: string }[]>(
        `SELECT id, slug FROM Tool WHERE id IN (${placeholders})`, ...ids
      );
      for (const r of rows) map.set(r.id, `/?tool=${r.slug}`);
    } else if (targetType === "post") {
      const rows = await db.$queryRawUnsafe<{ id: string; slug: string }[]>(
        `SELECT id, slug FROM Post WHERE id IN (${placeholders})`, ...ids
      );
      for (const r of rows) map.set(r.id, `/?post=${r.slug}`);
    }
  } catch {
    /* cosmetic */
  }
  return map;
}

function maskReporter(email: string | null, key: string | null): string {
  if (email) return email;
  if (!key) return "anonymous";
  // Show just enough of the anon key to correlate abuse without doxxing it.
  return key.length > 10 ? `${key.slice(0, 8)}…` : key;
}

export async function listReports(status: string): Promise<ReportListResponse> {
  const where =
    status === "open" || status === "resolved" || status === "dismissed"
      ? status
      : "";
  const rows = await db.$queryRaw<
    {
      id: string;
      targetType: string;
      targetId: string;
      targetLabel: string;
      reason: string;
      details: string | null;
      status: string;
      reporterEmail: string | null;
      reporterKey: string | null;
      resolutionNote: string | null;
      createdAt: number | string;
      resolvedAt: number | string | null;
    }[]
  >`
    SELECT id, targetType, targetId, targetLabel, reason, details, status,
           reporterEmail, reporterKey, resolutionNote, createdAt, resolvedAt
    FROM Report
    WHERE (${where} = '' OR status = ${where})
    ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, createdAt DESC
    LIMIT 300`;

  const targetIds = [...new Set(rows.map((r) => r.targetId))];
  // Mixed target types can share a queue page — compute per type.
  const byType = new Map<string, string[]>();
  for (const r of rows) {
    byType.set(r.targetType, [...(byType.get(r.targetType) ?? []), r.targetId]);
  }
  const hiddenMaps = new Map<string, Map<string, boolean>>();
  const hrefMaps = new Map<string, Map<string, string>>();
  for (const [type, ids] of byType) {
    hiddenMaps.set(type, await targetHiddenMap(type, ids));
    hrefMaps.set(type, await targetHrefMap(type, ids));
  }

  const reports: ReportRow[] = rows.map((r) => ({
    id: r.id,
    targetType: (REPORT_TARGET_TYPES.includes(r.targetType as ReportTargetType)
      ? r.targetType
      : "other") as ReportTargetType,
    targetId: r.targetId,
    targetLabel: r.targetLabel || r.targetId,
    targetHref: hrefMaps.get(r.targetType)?.get(r.targetId) ?? "",
    targetHidden: hiddenMaps.get(r.targetType)?.get(r.targetId) ?? false,
    reason: r.reason,
    details: r.details,
    status: (r.status === "resolved" || r.status === "dismissed"
      ? r.status
      : "open") as ReportRow["status"],
    reporter: maskReporter(r.reporterEmail, r.reporterKey),
    resolutionNote: r.resolutionNote,
    createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
    resolvedAt: toIso(r.resolvedAt),
  }));

  const countRows = await db.$queryRaw<{ status: string; n: number | bigint }[]>`
    SELECT status, COUNT(*) AS n FROM Report GROUP BY status`;
  const counts = { open: 0, resolved: 0, dismissed: 0 };
  for (const c of countRows) {
    const n = Number(c.n);
    if (c.status in counts) counts[c.status as keyof typeof counts] = n;
  }

  return { reports, counts };
}

/** Soft-hide the reported target using each surface's existing visibility. */
export async function hideReportTarget(
  targetType: string,
  targetId: string
): Promise<boolean> {
  try {
    if (targetType === "thread") {
      await db.$executeRaw`UPDATE ForumThread SET hidden = 1 WHERE id = ${targetId}`;
      return true;
    }
    if (targetType === "reply") {
      await db.$executeRaw`UPDATE ForumReply SET hidden = 1 WHERE id = ${targetId}`;
      return true;
    }
    if (targetType === "tool") {
      await db.$executeRaw`UPDATE Tool SET status = 'removed' WHERE id = ${targetId}`;
      return true;
    }
    if (targetType === "post") {
      await db.$executeRaw`UPDATE Post SET status = 'draft' WHERE id = ${targetId}`;
      return true;
    }
  } catch {
    return false;
  }
  return false; // review → no individual hide state yet
}

export async function resolveReport(
  id: string,
  patch: { status: "resolved" | "dismissed"; note?: string; hideTarget?: boolean }
): Promise<{ ok: true; targetType: string; targetId: string } | { ok: false; error: "not_found" }> {
  const rows = await db.$queryRaw<{ targetType: string; targetId: string }[]>`
    SELECT targetType, targetId FROM Report WHERE id = ${id} LIMIT 1`;
  const row = rows[0];
  if (!row) return { ok: false, error: "not_found" };

  if (patch.hideTarget) {
    await hideReportTarget(row.targetType, row.targetId);
  }
  await db.$executeRaw`
    UPDATE Report
    SET status = ${patch.status},
        resolutionNote = ${patch.note ?? null},
        resolvedAt = ${new Date().toISOString()}
    WHERE id = ${id}`;
  return { ok: true, targetType: row.targetType, targetId: row.targetId };
}

export async function createReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  reporterEmail?: string | null;
  reporterKey?: string | null;
}): Promise<
  | { ok: true; already: boolean; id: string }
  | { ok: false; error: "invalid_target" }
> {
  // Validate the target exists and snapshot a label for the admin queue.
  // Tool/post targets are addressed by slug in the API; we store the ROW id
  // so the admin queue's href resolver (targetHrefMap) stays consistent.
  let label: string | null = null;
  let storedId = input.targetId;
  const t = input.targetType;
  const id = input.targetId;
  try {
    if (t === "thread") {
      const r = await db.$queryRaw<{ title: string }[]>`
        SELECT title FROM ForumThread WHERE id = ${id} LIMIT 1`;
      label = r[0]?.title ?? null;
    } else if (t === "reply") {
      const r = await db.$queryRaw<{ body: string }[]>`
        SELECT body FROM ForumReply WHERE id = ${id} LIMIT 1`;
      label = r[0]?.body?.slice(0, 80) ?? null;
    } else if (t === "tool") {
      const r = await db.$queryRaw<{ id: string; name: string }[]>`
        SELECT id, name FROM Tool WHERE slug = ${id} LIMIT 1`;
      if (r[0]) { storedId = r[0].id; label = r[0].name; }
    } else if (t === "post") {
      const r = await db.$queryRaw<{ id: string; title: string }[]>`
        SELECT id, title FROM Post WHERE slug = ${id} LIMIT 1`;
      if (r[0]) { storedId = r[0].id; label = r[0].title; }
    } else if (t === "review") {
      const r = await db.$queryRaw<{ body: string }[]>`
        SELECT body FROM Review WHERE id = ${id} LIMIT 1`;
      label = r[0]?.body?.slice(0, 80) ?? null;
    }
  } catch {
    return { ok: false, error: "invalid_target" };
  }
  if (!label) return { ok: false, error: "invalid_target" };

  // One OPEN report per owner per target.
  const ownerEmail = input.reporterEmail ?? null;
  const ownerKey = ownerEmail ? null : input.reporterKey ?? null;
  const existing = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM Report
    WHERE targetType = ${t} AND targetId = ${storedId} AND status = 'open'
      AND ((${ownerEmail} IS NOT NULL AND reporterEmail = ${ownerEmail})
        OR (${ownerEmail} IS NULL AND reporterKey = ${ownerKey}))
    LIMIT 1`;
  if (existing[0]) return { ok: true, already: true, id: existing[0].id };

  const newId = crypto.randomUUID();
  await db.$executeRaw`
    INSERT INTO Report (id, reporterEmail, reporterKey, targetType, targetId,
                        targetLabel, reason, details, status, createdAt)
    VALUES (${newId}, ${ownerEmail}, ${ownerKey}, ${t}, ${storedId},
            ${label.slice(0, 120)}, ${input.reason}, ${input.details ?? null},
            'open', ${new Date().toISOString()})`;
  return { ok: true, already: false, id: newId };
}

/** Open-report counts for badges in the admin shell (never throws). */
export async function openReportCount(): Promise<number> {
  try {
    const rows = await db.$queryRaw<{ n: number | bigint }[]>`
      SELECT COUNT(*) AS n FROM Report WHERE status = 'open'`;
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}
