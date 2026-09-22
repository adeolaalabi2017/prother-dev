/**
 * Prother shared domain logic + types — search & discovery directory.
 * (Launch/vote machinery removed in the directory repositioning.)
 */
import { db } from "@/lib/db";
import type { ForumTopic } from "@/lib/forum-topics";

// ── Types ────────────────────────────────────────────────────────────────
export type Badge = {
  editorsPick: boolean;
  curated: boolean;
  unclaimed: boolean;
  hasApi: boolean;
  openSource: boolean;
};

/** Compact row used by the ⌘K palette / hero dropdown / related lists. */
export type ToolSummaryRow = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  editorsPick: boolean;
  pricing: { model: string; price: string | null; note: string | null };
  category: { slug: string; name: string; emoji: string };
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
  editorsPick: boolean;
};

// ── Submission wizard — server-side helpers ─────────────────────────────
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
 * Maker status tracking: list a maker's submissions with review outcome.
 * Approved rows are matched back to their Tool via the exact submissionId FK
 * (set by the editor decision route), falling back to normalized domain.
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

  // Domain → live Tool map. Approved rows carry an exact Tool.submissionId FK;
  // fall back to domain matching for tools approved before the column existed.
  const toolRows = await db.$queryRaw<
    { slug: string; websiteUrl: string; submissionId: string | null }[]
  >`
    SELECT slug, websiteUrl, submissionId FROM Tool`;
  const byDomain = new Map<string, string>();
  const bySubmissionId = new Map<string, string>();
  for (const t of toolRows) {
    if (t.submissionId && !bySubmissionId.has(t.submissionId)) {
      bySubmissionId.set(t.submissionId, t.slug);
    }
    const d = domainOf(t.websiteUrl);
    if (d && !byDomain.has(d)) byDomain.set(d, t.slug);
  }

  return subs.map((s) => {
    const toolSlug =
      s.status === "approved"
        ? bySubmissionId.get(s.id) ?? byDomain.get(s.domain) ?? null
        : null;
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
      toolSlug,
      reviewNote: s.reviewNote,
      resubmit,
    };
  });
}

// ── Editor review queue — server-side helpers ────────────────────────────

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
 * Time-decay score, now used ONLY by the forum "hot" sort
 * (score = strength / hours^1.2). Kept here for continuity.
 */
export function rankScore(votes: number, launchStart: Date, now = Date.now()): number {
  const hours = Math.max(0.5, (now - launchStart.getTime()) / 3_600_000);
  return votes / Math.pow(hours, 1.2);
}

// ── Forums — shared types ────────────────────────────────────────────────
// Constants (FORUM_TOPICS / labels) live in lib/forum-topics.ts — client-safe
// (no Prisma imports). The query implementation lives in lib/forum.ts using
// $queryRaw (stale-PrismaClient note there — a long-running `next dev` cannot
// see newly generated models, raw SQL is model-independent).

export type { ForumTopic, ForumSort } from "@/lib/forum-topics";

export type ForumThreadRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  topic: ForumTopic;
  author: string;
  pinned: boolean;
  /** baseUpvotes + anon ForumThreadVote count. */
  votes: number;
  /** True when the requesting voterKey has voted (anon voter-key scheme). */
  voted: boolean;
  replyCount: number;
  /** ISO string — JSON-safe for client components. */
  createdAt: string;
};

export type ForumReplyRow = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type ForumTopicCounts = {
  all: number;
  general: number;
  vibecoding: number;
  show: number;
  introduce: number;
};

export type ForumListResponse = {
  threads: ForumThreadRow[];
  counts: ForumTopicCounts;
};

/** GET /api/forum/[slug] payload (also passed server→client on the thread page). */
export type ForumThreadDetailResponse = {
  thread: ForumThreadRow & { updatedAt: string };
  replies: ForumReplyRow[];
  voted: boolean;
};

export { db };
