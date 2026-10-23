/**
 * D1 ports of convex/adminCrud.ts — moderation slice (wave 4d).
 *
 * Paired reads/writes flip together per entity, same contract as the
 * admin slice 1 (src/lib/d1/admin.ts):
 * - usersTable read + userModerate write (ban/role/avatar)
 * - reportsTable read + reportResolve write (hideTarget cascades:
 *   thread/reply → hidden, tool → status removed, post → status draft)
 *
 * Semantics mirror convex/adminCrud.ts verbatim: docId(legacyId ?? id)
 * lookups on BOTH sides of target references, open-first createdAt-desc
 * ordering with a 300-row cap, and the bookmarks owner_key convention
 * ('user:' + RAW stored email, no lowercasing).
 */
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { getD1 } from "./client";
import {
  auditLogs,
  bookmarks,
  forumReplies,
  forumThreads,
  posts,
  reports,
  reviews,
  tools,
  users,
} from "./schema";

type DB = NonNullable<Awaited<ReturnType<typeof getD1>>>;
type UserRow = typeof users.$inferSelect;

function docId(d: { id: string; legacyId: string | null }): string {
  return d.legacyId ?? d.id;
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

/** Resolves a row by either id shape (legacy cuid or pk). */
async function byEitherId<
  T extends { id: string; legacyId: string | null },
>(
  db: DB,
  table:
    | typeof users
    | typeof tools
    | typeof posts
    | typeof forumThreads
    | typeof forumReplies
    | typeof reports,
  x: string,
): Promise<T | null> {
  const [row] = await db
    .select()
    .from(table)
    .where(or(eq(table.legacyId, x), eq(table.id, x)))
    .limit(1);
  return (row as T) ?? null;
}

function ciContains(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

// ── Users table + moderation ─────────────────────────────────────────────

export async function d1AdminUsers(args: {
  q: string;
  status: string;
  role: string;
}) {
  const db = await getD1();
  if (!db) return null;
  const needle = args.q.trim().toLowerCase();

  const [userRows, threads, replies, reviewRows, bookmarkRows, reportRows] =
    await Promise.all([
      db.select().from(users),
      db
        .select({
          authorId: forumThreads.authorId,
          createdAt: forumThreads.createdAt,
        })
        .from(forumThreads),
      db
        .select({
          authorId: forumReplies.authorId,
          createdAt: forumReplies.createdAt,
        })
        .from(forumReplies),
      db
        .select({ userId: reviews.userId })
        .from(reviews),
      db
        .select({ ownerKey: bookmarks.ownerKey })
        .from(bookmarks),
      db
        .select({
          reporterEmail: reports.reporterEmail,
        })
        .from(reports),
    ]);

  const matching = userRows.filter((u) => {
    if (
      needle &&
      !(
        ciContains(u.name, needle) ||
        ciContains(u.email, needle) ||
        ciContains(u.handle, needle)
      )
    )
      return false;
    if (args.status && u.status !== args.status) return false;
    if (args.role && u.role !== args.role) return false;
    return true;
  });

  const lastActivity = new Map<string, number>();
  for (const t of threads) {
    if (t.authorId)
      lastActivity.set(
        t.authorId,
        Math.max(lastActivity.get(t.authorId) ?? 0, t.createdAt),
      );
  }
  for (const r of replies) {
    if (r.authorId)
      lastActivity.set(
        r.authorId,
        Math.max(lastActivity.get(r.authorId) ?? 0, r.createdAt),
      );
  }
  const countBy = (
    rows: (string | null)[],
    id: string | null,
  ) => rows.filter((x) => x === id).length;
  const threadAuthors = threads.map((t) => t.authorId);
  const replyAuthors = replies.map((r) => r.authorId);
  const reviewUsers = reviewRows.map((r) => r.userId);
  const bookmarkKeys = bookmarkRows.map((b) => b.ownerKey);
  const reportEmails = reportRows.map((r) => r.reporterEmail);

  const uid = (u: UserRow) => docId(u);
  const rows = [...matching]
    // Deterministic tiebreak mirrors the Prisma ORDER BY (createdAt DESC,
    // id ASC) — mirrors the Convex comparator.
    .sort(
      (a, b) =>
        b.createdAt - a.createdAt ||
        (uid(a) < uid(b) ? -1 : uid(a) > uid(b) ? 1 : 0),
    )
    .slice(0, 300)
    .map((u) => ({
      id: uid(u),
      name: u.name ?? null,
      email: u.email ?? null,
      handle: u.handle ?? null,
      image: u.image ?? null,
      role: ["member", "moderator", "admin"].includes(u.role) ? u.role : "member",
      status: u.status === "banned" ? "banned" : "active",
      createdAt: isoFromMs(u.createdAt),
      threads: countBy(threadAuthors, uid(u)),
      replies: countBy(replyAuthors, uid(u)),
      reviews: countBy(reviewUsers, uid(u)),
      // Mirrors the raw SQL exactly: 'user:' concatenated with the STORED
      // email (no lowercasing — a NULL/cased email simply matches nothing).
      bookmarks: countBy(bookmarkKeys, `user:${u.email ?? ""}`),
      reportsFiled: countBy(reportEmails, u.email),
      lastActivityAt: (() => {
        const at = lastActivity.get(uid(u));
        return at ? isoFromMs(at) : null;
      })(),
    }));
  const stats = { total: userRows.length, banned: 0, moderators: 0, admins: 0 };
  for (const u of userRows) {
    if (u.status === "banned") stats.banned += 1;
    if (u.role === "moderator") stats.moderators += 1;
    if (u.role === "admin") stats.admins += 1;
  }
  return { users: rows, stats };
}

export async function d1UserModerate(args: {
  userLegacyId: string;
  role?: string;
  status?: string;
  image?: string | null;
}) {
  const db = await getD1();
  if (!db) return null;
  const user = await byEitherId<UserRow>(db, users, args.userLegacyId);
  if (!user) return null;
  // Lockout rails mirroring convex/adminCrud.ts userModerate verbatim:
  // active admin accounts can never be banned, and the last active admin
  // can never be demoted to a lower role.
  if (args.status === "banned" && user.role === "admin") {
    throw new Error("admin_protected");
  }
  if (args.role !== undefined && args.role !== "admin" && user.role === "admin") {
    const [remaining] = await db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.role, "admin"),
          ne(users.status, "banned"),
          ne(users.id, user.id),
        ),
      );
    if (Number(remaining.n) === 0) throw new Error("last_admin");
  }
  const patch: Partial<UserRow> = {};
  if (args.role !== undefined) patch.role = args.role;
  if (args.status !== undefined) patch.status = args.status;
  if (args.image !== undefined) patch.image = args.image ?? null;
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, user.id));
  }
  return { ok: true as const };
}

// ── User detail drawer + reports table ──────────────────────────────────

export type D1UserDetail = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    handle: string | null;
    image: string | null;
    role: string;
    status: string;
    createdAt: string;
    lastActivityAt: string | null;
  };
  counts: { threads: number; replies: number; reviews: number; reports: number };
  threads: {
    id: string;
    href: string;
    title: string;
    topic: string;
    hidden: boolean;
    replyCount: number;
    createdAt: string;
  }[];
  replies: {
    id: string;
    href: string;
    threadTitle: string;
    excerpt: string;
    hidden: boolean;
    createdAt: string;
  }[];
  reviews: {
    id: string;
    href: string;
    toolName: string;
    status: string;
    ease: number;
    power: number;
    value: number;
    excerpt: string;
    createdAt: string;
  }[];
  reports: {
    id: string;
    targetType: string;
    targetLabel: string;
    reason: string;
    status: string;
    createdAt: string;
  }[];
  audit: { id: string; action: string; meta: string; createdAt: string }[];
};

function excerptOf(text: string, max = 140): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export async function d1UserDetail(userId: string): Promise<D1UserDetail | null> {
  const db = await getD1();
  if (!db) return null;
  const [userRows, threadRows, replyRows, toolRows, reviewRows, reportRows, auditRows] =
    await Promise.all([
      db.select().from(users),
      db.select().from(forumThreads),
      db.select().from(forumReplies),
      db.select().from(tools),
      db.select().from(reviews),
      db.select().from(reports),
      db.select().from(auditLogs),
    ]);
  const user = userRows.find((u) => docId(u) === userId || u.legacyId === userId);
  if (!user) return null;
  const authorId = user.legacyId ?? user.id;
  const toolById = new Map(toolRows.map((t) => [t.id, t]));
  const threadById = new Map(threadRows.map((t) => [t.id, t]));

  const threadList = threadRows
    .filter((t) => t.authorId === authorId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((t) => ({
      id: docId(t),
      href: `/forums/${t.slug}`,
      title: t.title,
      topic: t.topic,
      hidden: Boolean(t.hidden),
      replyCount: t.replyCount,
      createdAt: isoFromMs(t.createdAt),
    }));
  const replyList = replyRows
    .filter((r) => r.authorId === authorId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => {
      const parent = threadById.get(r.threadId);
      return {
        id: docId(r),
        href: parent ? `/forums/${parent.slug}` : "",
        threadTitle: parent?.title ?? "",
        excerpt: excerptOf(r.body),
        hidden: Boolean(r.hidden),
        createdAt: isoFromMs(r.createdAt),
      };
    });
  const reviewList = reviewRows
    .filter((r) => r.userId === authorId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => {
      const t = toolById.get(r.toolId);
      return {
        id: docId(r),
        href: t?.slug ? `/tools/${t.slug}` : "",
        toolName: t?.name ?? "",
        status: r.status,
        ease: r.ease,
        power: r.power,
        value: r.value,
        excerpt: excerptOf(r.body),
        createdAt: isoFromMs(r.createdAt),
      };
    });
  const reportList = reportRows
    .filter((r) => r.reporterEmail === user.email)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => ({
      id: docId(r),
      targetType: r.targetType,
      targetLabel: r.targetLabel,
      reason: r.reason,
      status: r.status,
      createdAt: isoFromMs(r.createdAt),
    }));
  const auditList = auditRows
    .filter((a) => a.entityId === userId || a.legacyId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 30)
    .map((a) => ({
      id: docId(a),
      action: a.action,
      meta: a.meta,
      createdAt: isoFromMs(a.createdAt),
    }));
  const lastActivity = Math.max(
    0,
    ...threadList.map((t) => new Date(t.createdAt).getTime()),
    ...replyList.map((r) => new Date(r.createdAt).getTime()),
  );
  return {
    user: {
      id: docId(user),
      name: user.name ?? null,
      email: user.email ?? null,
      handle: user.handle ?? null,
      image: user.image ?? null,
      role: ["member", "moderator", "admin"].includes(user.role) ? user.role : "member",
      status: user.status === "banned" ? "banned" : "active",
      createdAt: isoFromMs(user.createdAt),
      lastActivityAt: lastActivity ? isoFromMs(lastActivity) : null,
    },
    counts: {
      threads: threadList.length,
      replies: replyList.length,
      reviews: reviewList.length,
      reports: reportList.length,
    },
    threads: threadList.slice(0, 50),
    replies: replyList.slice(0, 50),
    reviews: reviewList.slice(0, 50),
    reports: reportList.slice(0, 50),
    audit: auditList,
  };
}

// ── Reports table + resolve ──────────────────────────────────────────────

function maskReporter(email?: string | null, key?: string | null): string {
  if (email) return email;
  if (!key) return "anonymous";
  return key.length > 10 ? `${key.slice(0, 8)}…` : key;
}

export async function d1AdminReports(status: string) {
  const db = await getD1();
  if (!db) return null;
  const where =
    status === "open" || status === "resolved" || status === "dismissed"
      ? status
      : "";

  const [reportRows, threadRows, replyRows, toolRefs, postRefs] =
    await Promise.all([
      db.select().from(reports),
      db
        .select({
          id: forumThreads.id,
          legacyId: forumThreads.legacyId,
          slug: forumThreads.slug,
          hidden: forumThreads.hidden,
        })
        .from(forumThreads),
      db
        .select({
          id: forumReplies.id,
          legacyId: forumReplies.legacyId,
          hidden: forumReplies.hidden,
          threadId: forumReplies.threadId,
        })
        .from(forumReplies),
      db
        .select({ id: tools.id, slug: tools.slug, status: tools.status })
        .from(tools),
      db
        .select({ id: posts.id, slug: posts.slug, status: posts.status })
        .from(posts),
    ]);

  type Target = { slug?: string; hidden?: boolean; href?: string };
  const byLegacy = new Map<string, Target>();
  for (const t of threadRows) {
    byLegacy.set(docId(t), { slug: t.slug, hidden: t.hidden === 1, href: `/forums/${t.slug}` });
  }
  const threadSlug = new Map(threadRows.map((t) => [t.id, t.slug]));
  for (const r of replyRows) {
    const parent = threadSlug.get(r.threadId);
    byLegacy.set(docId(r), {
      hidden: r.hidden === 1,
      href: parent ? `/forums/${parent}` : "",
    });
  }
  for (const t of toolRefs) {
    byLegacy.set(t.id, {
      slug: t.slug,
      hidden: t.status === "removed",
      href: `/?tool=${t.slug}`,
    });
  }
  for (const p of postRefs) {
    byLegacy.set(p.id, {
      slug: p.slug,
      hidden: p.status !== "published",
      href: `/?post=${p.slug}`,
    });
  }

  const rows = reportRows
    .filter((r) => !where || r.status === where)
    .sort(
      (a, b) =>
        (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) ||
        b.createdAt - a.createdAt,
    )
    .slice(0, 300)
    .map((r) => {
      const target = byLegacy.get(r.targetId);
      return {
        id: docId(r),
        targetType: ["thread", "reply", "tool", "post", "review"].includes(
          r.targetType,
        )
          ? r.targetType
          : "other",
        targetId: r.targetId,
        targetLabel: r.targetLabel || r.targetId,
        targetHref: target?.href ?? "",
        targetHidden: target?.hidden ?? false,
        reason: r.reason,
        details: r.details ?? null,
        status:
          r.status === "resolved" || r.status === "dismissed"
            ? r.status
            : "open",
        reporter: maskReporter(r.reporterEmail, r.reporterKey),
        resolutionNote: r.resolutionNote ?? null,
        createdAt: isoFromMs(r.createdAt),
        resolvedAt:
          r.resolvedAt != null ? isoFromMs(r.resolvedAt) : null,
      };
    });
  const counts = { open: 0, resolved: 0, dismissed: 0 };
  for (const r of reportRows) {
    if (r.status === "open") counts.open += 1;
    else if (r.status === "resolved") counts.resolved += 1;
    else if (r.status === "dismissed") counts.dismissed += 1;
  }
  return { reports: rows, counts };
}

export async function d1ReportResolve(args: {
  reportLegacyId: string;
  status: string;
  note?: string;
  hideTarget?: boolean;
  nowMs: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const report = await byEitherId<typeof reports.$inferSelect>(
    db,
    reports,
    args.reportLegacyId,
  );
  if (!report) return null;
  if (args.hideTarget) {
    if (report.targetType === "thread" || report.targetType === "reply") {
      if (report.targetType === "thread") {
        const row = await byEitherId(db, forumThreads, report.targetId);
        if (row) await db.update(forumThreads).set({ hidden: 1 }).where(eq(forumThreads.id, row.id));
      } else {
        const reply = await byEitherId(db, forumReplies, report.targetId);
        if (reply) await db.update(forumReplies).set({ hidden: 1 }).where(eq(forumReplies.id, reply.id));
      }
    } else if (report.targetType === "tool") {
      const target = await byEitherId(db, tools, report.targetId);
      if (target) {
        await db.update(tools).set({ status: "removed" }).where(eq(tools.id, target.id));
      }
    } else if (report.targetType === "post") {
      const target = await byEitherId(db, posts, report.targetId);
      if (target) {
        await db.update(posts).set({ status: "draft" }).where(eq(posts.id, target.id));
      }
    }
  }
  await db
    .update(reports)
    .set({ status: args.status, resolutionNote: args.note ?? null, resolvedAt: args.nowMs })
    .where(eq(reports.id, report.id));
  return { targetType: report.targetType, targetId: report.targetId };
}
