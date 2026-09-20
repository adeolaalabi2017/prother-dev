/**
 * Prother shared domain logic + types (PRD §9 Feed Mechanics, §16 schema decisions).
 */
import { db } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────────
export type Badge = {
  editorsPick: boolean;
  curated: boolean;
  relaunch: boolean;
  unclaimed: boolean;
  hasApi: boolean;
  openSource: boolean;
};

export type FeedRow = {
  launchId: string;
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  votes: number;
  voted: boolean;
  maker: string;
  track: "editor_seed" | "community";
  pricing: { model: string; price: string | null; note: string | null };
  category: { slug: string; name: string; emoji: string };
  /** Discussion size — rendered as a 💬 badge on feed rows (omitted when 0). */
  comments?: number;
  badges: Badge;
};

export type Teaser = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  category: { slug: string; name: string; emoji: string };
  goesLiveInH: number;
};

export type TopWeekRow = {
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  votes: number;
  categoryEmoji: string;
};

export type ToolDetailResponse = {
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  websiteUrl: string;
  emoji: string;
  gradient: string;
  pricing: { model: string; price: string | null; note: string | null };
  category: { slug: string; name: string; emoji: string };
  maker: string;
  track: "editor_seed" | "community";
  badges: Badge;
  links: { github: string | null; docs: string | null; twitter: string | null };
  votes: number;
  voted: boolean;
  launchId: string | null;
  launchDate: string | null;
  scheduled: boolean;
  submittedAt: string;
  verified: boolean;
  standards: import("@/lib/standards").StandardCheck[];
  /** Up to 3 live tools in the same category (excludes this tool). */
  related?: RelatedToolRow[];
};

/** Mini row for the detail modal's "More like this" section. */
export type RelatedToolRow = {
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  tagline: string;
  votes: number;
};

export type FeedResponse = {
  date: string;
  dayLabel: string;
  resetsInSec: number;
  todayCount: number;
  new: FeedRow[];
  top: FeedRow[];
  tomorrow: Teaser[];
  /** Yesterday's final standings (voting closed), sorted by votes. */
  yesterday: FeedRow[];
  yesterdayLabel: string;
  /** Past-6-day archive summary (oldest → newest, excludes today) —
   *  powers the launch-week day strip in the Archive tab. */
  weekDays: WeekDay[];
  /** Today's launches per category slug — powers BROWSE chip counts. */
  categoryCounts: Record<string, number>;
  topWeek: TopWeekRow[];
  editorsPick: FeedRow | null;
  subscriberCount: number;
};

/** One past launch day in the archive day strip. */
export type WeekDay = {
  /** ISO day, e.g. "2026-09-18". */
  date: string;
  /** Human label, e.g. "Sep 18". */
  label: string;
  /** Short weekday, e.g. "Thu". */
  weekday: string;
  /** Number of tools that launched this day. */
  count: number;
};

/** Response of GET /api/feed/day?date= — one past day's final standings. */
export type DayArchiveResponse = {
  date: string;
  label: string;
  count: number;
  rows: FeedRow[];
};

// ── Submission wizard (PRD §11) — server-side helpers ───────────────────
// TAG_VOCAB / domainOf live in lib/submit.ts (client-safe, no Prisma import).
//
// NOTE: these use $queryRaw because a long-running `next dev` process can keep
// a PRE-GENERATION PrismaClient cached on globalThis (missing `db.submission`).
// $queryRaw is model-independent and always available; the Submission TABLE
// itself is created by `bun run db:push` regardless of client generation.

export type SubmissionInsert = {
  email: string;
  websiteUrl: string;
  domain: string;
  name: string;
  tagline: string;
  description: string;
  categorySlug: string;
  tags: string;
  pricingModel: string;
  startingPrice: string | null;
  pricingNote: string | null;
  hasApi: boolean;
  githubUrl: string | null;
  docsUrl: string | null;
  twitterUrl: string | null;
  logoEmoji: string;
  logoGradient: string;
  isOwner: boolean;
  confirmedLive: boolean;
  agreedStandards: boolean;
};

export async function findActiveSubmissionByDomain(
  domain: string
): Promise<{ name: string } | null> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM Submission
    WHERE domain = ${domain} AND status IN ('pending','approved')
    LIMIT 1`;
  return rows[0] ?? null;
}

export async function countSubmissionsSince(
  email: string,
  since: Date
): Promise<number> {
  const rows = await db.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*) as n FROM Submission
    WHERE email = ${email} AND createdAt >= ${since.toISOString()}`;
  return Number(rows[0]?.n ?? 0);
}

export async function createSubmission(
  data: SubmissionInsert
): Promise<{ id: string }> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO Submission (
      id, email, websiteUrl, domain, name, tagline, description,
      categorySlug, tags, pricingModel, startingPrice, pricingNote,
      hasApi, githubUrl, docsUrl, twitterUrl, logoEmoji, logoGradient,
      isOwner, confirmedLive, agreedStandards, status, createdAt
    ) VALUES (
      ${crypto.randomUUID()}, ${data.email}, ${data.websiteUrl}, ${data.domain},
      ${data.name}, ${data.tagline}, ${data.description}, ${data.categorySlug},
      ${data.tags}, ${data.pricingModel}, ${data.startingPrice}, ${data.pricingNote},
      ${data.hasApi ? 1 : 0}, ${data.githubUrl}, ${data.docsUrl}, ${data.twitterUrl},
      ${data.logoEmoji}, ${data.logoGradient}, ${data.isOwner ? 1 : 0},
      ${data.confirmedLive ? 1 : 0}, ${data.agreedStandards ? 1 : 0},
      'pending', ${new Date().toISOString()}
    )
    RETURNING id`;
  return rows[0]!;
}

export async function pendingQueuePosition(id: string): Promise<number> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM Submission WHERE status = 'pending' ORDER BY createdAt ASC`;
  const idx = rows.findIndex((r) => r.id === id);
  return idx >= 0 ? idx + 1 : rows.length;
}

/**
 * Maker status tracking (PRD §11): list a maker's submissions with review
 * outcome. Approved rows are matched back to their Tool by normalized domain
 * (the decision route derives the Tool from the submission, no FK column).
 */
export async function listSubmissionsByEmail(
  email: string
): Promise<import("@/lib/submit").SubmissionStatusItem[]> {
  const { domainOf, TAG_VOCAB, PRICING_MODELS } = await import(
    "@/lib/submit"
  );
  const subs = await db.$queryRaw<
    {
      id: string;
      name: string;
      tagline: string;
      domain: string;
      logoEmoji: string;
      logoGradient: string;
      status: string;
      reviewNote: string | null;
      createdAt: string;
      websiteUrl: string;
      description: string;
      categorySlug: string;
      tags: string;
      pricingModel: string;
      startingPrice: string | null;
      pricingNote: string | null;
      hasApi: number;
      githubUrl: string | null;
      docsUrl: string | null;
      twitterUrl: string | null;
    }[]
  >`
    SELECT id, name, tagline, domain, logoEmoji, logoGradient,
           status, reviewNote, createdAt,
           websiteUrl, description, categorySlug, tags, pricingModel,
           startingPrice, pricingNote, hasApi, githubUrl, docsUrl, twitterUrl
    FROM Submission
    WHERE email = ${email}
    ORDER BY createdAt DESC
    LIMIT 20`;

  // Live queue snapshot for pending positions (oldest-first, same as editors see).
  const queue = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM Submission WHERE status = 'pending' ORDER BY createdAt ASC`;
  const positionOf = new Map(queue.map((q, i) => [q.id, i + 1]));

  // Domain → launched Tool map (Tool.websiteUrl is stored as submitted).
  // Approved rows now carry an exact Tool.submissionId FK (set by the editor
  // decision route) — resolve via the FK first, fall back to domain matching
  // for tools approved before the column existed.
  // NOTE: $queryRaw (not ORM) — a long-running dev server's require cache
  // binds the PRE-generation PrismaClient, which doesn't know submissionId.
  const toolRows = await db.$queryRaw<
    {
      slug: string;
      websiteUrl: string;
      submissionId: string | null;
      launchDate: number | string | null;
      scheduled: number | boolean | null;
    }[]
  >`
    SELECT t.slug, t.websiteUrl, t.submissionId, l.launchDate, l.scheduled
    FROM Tool t LEFT JOIN Launch l ON l.toolId = t.id`;
  const toInfo = (r: (typeof toolRows)[number]) => ({
    slug: r.slug,
    launchDate:
      r.launchDate == null
        ? ""
        : typeof r.launchDate === "number"
          ? new Date(r.launchDate).toISOString()
          : String(r.launchDate),
    scheduled: Boolean(r.scheduled),
  });
  const byDomain = new Map<
    string,
    { slug: string; launchDate: string; scheduled: boolean }
  >();
  const bySubmissionId = new Map<
    string,
    { slug: string; launchDate: string; scheduled: boolean }
  >();
  for (const t of toolRows) {
    const info = toInfo(t);
    if (t.submissionId && !bySubmissionId.has(t.submissionId)) {
      bySubmissionId.set(t.submissionId, info);
    }
    const d = domainOf(t.websiteUrl);
    if (d && !byDomain.has(d)) {
      byDomain.set(d, info);
    }
  }

  return subs.map((s) => {
    const tool = bySubmissionId.get(s.id) ?? byDomain.get(s.domain);
    const live =
      s.status === "approved" &&
      !!tool?.launchDate &&
      new Date(tool.launchDate).getTime() <= Date.now();

    const status = s.status as "pending" | "approved" | "rejected";

    // Rejected rows carry a prefill payload so the tracker can re-open the
    // wizard pre-filled ("Resubmit with fixes"). Confirm checkboxes are
    // deliberately excluded — the maker re-attests after fixing the issues.
    let resubmit: import("@/lib/submit").SubmitPrefill | null = null;
    if (status === "rejected") {
      const pricingModel = PRICING_MODELS.some((p) => p.value === s.pricingModel)
        ? (s.pricingModel as import("@/lib/submit").PricingModel)
        : "freemium";
      resubmit = {
        email,
        websiteUrl: s.websiteUrl,
        name: s.name,
        tagline: s.tagline,
        description: s.description,
        categorySlug: s.categorySlug,
        tags: s.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => (TAG_VOCAB as readonly string[]).includes(t))
          .slice(0, 5) as import("@/lib/submit").TagVocab[],
        pricingModel,
        startingPrice: s.startingPrice ?? "",
        pricingNote: s.pricingNote ?? "",
        hasApi: Boolean(s.hasApi),
        githubUrl: s.githubUrl ?? "",
        docsUrl: s.docsUrl ?? "",
        twitterUrl: s.twitterUrl ?? "",
        logoEmoji: s.logoEmoji,
        logoGradient: s.logoGradient,
      };
    }

    return {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      domain: s.domain,
      emoji: s.logoEmoji,
      gradient: s.logoGradient,
      status,
      createdAt: s.createdAt,
      queuePosition: status === "pending" ? positionOf.get(s.id) ?? null : null,
      toolSlug: status === "approved" ? tool?.slug ?? null : null,
      launchDate: status === "approved" ? tool?.launchDate ?? null : null,
      live,
      reviewNote: s.reviewNote,
      resubmit,
    };
  });
}

// ── Editor review queue (PRD §12 adaptation — demo passcode gate) ───────

/** Demo stand-in for real auth (NextAuth ships in the stack for Phase 2). */
export const EDITOR_KEY = "ember-dev";

export type SubmissionRow = {
  id: string;
  email: string;
  websiteUrl: string;
  domain: string;
  name: string;
  tagline: string;
  description: string;
  categorySlug: string;
  tags: string;
  pricingModel: string;
  startingPrice: string | null;
  pricingNote: string | null;
  hasApi: number;
  githubUrl: string | null;
  docsUrl: string | null;
  twitterUrl: string | null;
  logoEmoji: string;
  logoGradient: string;
  isOwner: number;
  confirmedLive: number;
  agreedStandards: number;
  status: string;
  createdAt: string;
};

export async function listPendingSubmissions(): Promise<SubmissionRow[]> {
  return db.$queryRaw<SubmissionRow[]>`
    SELECT id, email, websiteUrl, domain, name, tagline, description,
           categorySlug, tags, pricingModel, startingPrice, pricingNote,
           hasApi, githubUrl, docsUrl, twitterUrl, logoEmoji, logoGradient,
           isOwner, confirmedLive, agreedStandards, status, createdAt
    FROM Submission
    WHERE status = 'pending'
    ORDER BY createdAt ASC`;
}

export async function countSubmissionsByStatus(): Promise<Record<string, number>> {
  const rows = await db.$queryRaw<{ status: string; n: number }[]>`
    SELECT status, COUNT(*) as n FROM Submission GROUP BY status`;
  const out: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

export async function setSubmissionStatus(
  id: string,
  status: "approved" | "rejected",
  reviewNote: string | null
): Promise<void> {
  await db.$queryRaw`
    UPDATE Submission SET status = ${status}, reviewNote = ${reviewNote}
    WHERE id = ${id}`;
}

/** Unique slug for an approved tool (name → slug, -2/-3 on collision). */
export function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "tool"
  );
}

export async function uniqueToolSlug(base: string): Promise<string> {
  const taken = await db.tool.findMany({
    select: { slug: true },
    where: { slug: { startsWith: base } },
  });
  const takenSet = new Set(taken.map((t) => t.slug));
  if (!takenSet.has(base)) return base;
  for (let i = 2; i < 50; i++) {
    if (!takenSet.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Attach per-tool discussion sizes to feed rows (mutates rows in place —
 * `top`/`new` share the same row objects). Lazy import avoids a cycle;
 * $queryRaw inside (stale-PrismaClient note in lib/discussion.ts).
 */
export async function attachCommentCounts(
  rowSets: FeedRow[][],
  slugToToolId: Map<string, string>
): Promise<void> {
  const { commentCountsByTool } = await import("@/lib/discussion");
  const counts = await commentCountsByTool([...slugToToolId.values()]);
  if (counts.size === 0) return;
  for (const set of rowSets) {
    for (const r of set) {
      const toolId = slugToToolId.get(r.slug);
      const n = toolId ? counts.get(toolId) ?? 0 : 0;
      if (n > 0) r.comments = n;
    }
  }
}

// ── Ranking (PRD F-36): score = weighted_upvotes / hours^1.2 ────────────
export function rankScore(votes: number, launchStart: Date, now = Date.now()): number {
  const hours = Math.max(0.5, (now - launchStart.getTime()) / 3_600_000);
  return votes / Math.pow(hours, 1.2);
}

export function secondsUntilUtcMidnight(now = new Date()): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  );
  return Math.max(0, Math.floor((next - now.getTime()) / 1000));
}

// ── Demo day re-anchor ───────────────────────────────────────────────────
// The seed pins its launch batch to the day it ran. On a long-lived demo
// database the calendar moves on, "today" goes empty and the homepage reads
// "0 launches today" with an empty feed. Once per server day — and only when
// today genuinely has no live launches — shift the entire Launch timeline
// forward by whole days so the newest live batch lands on today again.
// Votes, comments, reviews and the week archive all ride along unchanged;
// scheduled teasers keep their +1-day offset from the batch.
let anchoredForDay: string | null = null;

export async function ensureDemoDayAnchored(now = new Date()): Promise<boolean> {
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const key = todayStart.toISOString().slice(0, 10);
  // Fast path: already checked/shifted for this calendar day.
  if (anchoredForDay === key) return false;

  const dayMs = 86_400_000;
  const todayLive = await db.launch.count({
    where: {
      scheduled: false,
      launchDate: { gte: todayStart, lt: new Date(todayStart.getTime() + dayMs) },
    },
  });
  if (todayLive > 0) {
    anchoredForDay = key;
    return false;
  }

  const latest = await db.launch.findFirst({
    where: { scheduled: false },
    orderBy: { launchDate: "desc" },
    select: { launchDate: true },
  });
  if (!latest) {
    anchoredForDay = key;
    return false;
  }

  const d = latest.launchDate;
  const latestDayStart = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const deltaMs = todayStart.getTime() - latestDayStart.getTime();
  if (deltaMs <= 0) {
    anchoredForDay = key;
    return false;
  }

  // Shift the whole timeline forward. SQLite stores Prisma DateTimes as
  // ms-since-epoch INTEGERs, so plain integer addition is exact. Tool
  // .originalLaunchDate follows to keep re-launch histories coherent.
  await db.$executeRaw`UPDATE Launch SET launchDate = launchDate + ${deltaMs}`;
  await db.$executeRaw`UPDATE Tool SET originalLaunchDate = originalLaunchDate + ${deltaMs} WHERE originalLaunchDate IS NOT NULL`;
  anchoredForDay = key;
  return true;
}

// ── Serialization helpers ────────────────────────────────────────────────
type ToolWithLaunch = Awaited<ReturnType<typeof db.tool.findMany>>[number] & {
  launch: { baseUpvotes: number; launchDate: Date; id: string } | null;
};
type CatRow = { slug: string; name: string; emoji: string };

function votesOf(t: ToolWithLaunch): number {
  return t.launch?.baseUpvotes ?? 0;
}

export function toFeedRow(
  t: ToolWithLaunch,
  cat: CatRow,
  votedSet: Set<string>
): FeedRow {
  return {
    launchId: t.launch?.id ?? t.id,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    emoji: t.logoEmoji,
    gradient: t.logoGradient,
    votes: votesOf(t),
    voted: t.launch ? votedSet.has(t.launch.id) : false,
    maker: t.makerHandle,
    track: t.track === "community" ? "community" : "editor_seed",
    pricing: { model: t.pricingModel, price: t.startingPrice, note: t.pricingNote },
    category: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
    badges: {
      editorsPick: t.editorsPick,
      curated: t.curated,
      relaunch: t.relaunch,
      unclaimed: !t.claimed,
      hasApi: t.hasApi,
      openSource: t.pricingModel === "open_source",
    },
  };
}

export { db };
