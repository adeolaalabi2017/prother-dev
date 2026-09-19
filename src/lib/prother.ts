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
  /** Today's launches per category slug — powers BROWSE chip counts. */
  categoryCounts: Record<string, number>;
  topWeek: TopWeekRow[];
  editorsPick: FeedRow | null;
  subscriberCount: number;
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
  const { domainOf } = await import("@/lib/submit");
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
    }[]
  >`
    SELECT id, name, tagline, domain, logoEmoji, logoGradient,
           status, reviewNote, createdAt
    FROM Submission
    WHERE email = ${email}
    ORDER BY createdAt DESC
    LIMIT 20`;

  // Live queue snapshot for pending positions (oldest-first, same as editors see).
  const queue = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM Submission WHERE status = 'pending' ORDER BY createdAt ASC`;
  const positionOf = new Map(queue.map((q, i) => [q.id, i + 1]));

  // Domain → launched Tool map (Tool.websiteUrl is stored as submitted).
  const tools = await db.tool.findMany({
    select: {
      slug: true,
      websiteUrl: true,
      launch: { select: { launchDate: true, scheduled: true } },
    },
  });
  const byDomain = new Map<
    string,
    { slug: string; launchDate: string; scheduled: boolean }
  >();
  for (const t of tools) {
    const d = domainOf(t.websiteUrl);
    if (d && !byDomain.has(d)) {
      byDomain.set(d, {
        slug: t.slug,
        launchDate: t.launch?.launchDate.toISOString() ?? "",
        scheduled: t.launch?.scheduled ?? false,
      });
    }
  }

  return subs.map((s) => {
    const tool = byDomain.get(s.domain);
    const live =
      s.status === "approved" &&
      !!tool?.launchDate &&
      new Date(tool.launchDate).getTime() <= Date.now();
    return {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      domain: s.domain,
      emoji: s.logoEmoji,
      gradient: s.logoGradient,
      status: s.status as "pending" | "approved" | "rejected",
      createdAt: s.createdAt,
      queuePosition: s.status === "pending" ? positionOf.get(s.id) ?? null : null,
      toolSlug: s.status === "approved" ? tool?.slug ?? null : null,
      launchDate: s.status === "approved" ? tool?.launchDate ?? null : null,
      live,
      reviewNote: s.reviewNote,
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
