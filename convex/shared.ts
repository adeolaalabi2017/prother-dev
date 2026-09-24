/**
 * Shared pure helpers for the Phase 3 shadow-read queries.
 *
 * Each helper is an EXACT port of the Next.js original noted above it —
 * same formulas, same edge cases — so shadow diffs surface real data
 * divergence, not reimplementation drift. Sources of truth stay in
 * src/lib/*; these copies are deleted or kept in sync at Phase 5.
 */

export function round1(n: number): number {
  return Math.round(n * 10) / 10; // lib/community.ts
}

export function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

/** PRD F-36 decay, reused by the forum "hot" sort (lib/prother.ts). */
export function rankScore(
  votes: number,
  createdMs: number,
  nowMs = Date.now(),
): number {
  const hours = Math.max(0.5, (nowMs - createdMs) / 3_600_000);
  return votes / Math.pow(hours, 1.2);
}

// ── Token matcher (lib/match.ts — verbatim semantics) ──

export function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((t) => t.length > 0),
    ),
  );
}

export function stem(token: string): string {
  if (token.length < 5) return token;
  const stripped = token.replace(/(ing|ed|es|s)$/, "");
  return stripped.length >= 3 ? stripped : token;
}

function hitsField(token: string, field: string | null | undefined): boolean {
  if (!field) return false;
  const f = field.toLowerCase();
  if (f.includes(token)) return true;
  const s = stem(token);
  return s !== token && f.includes(s);
}

export function matchTokens(
  fields: (string | null | undefined)[],
  tokens: string[],
): boolean {
  if (tokens.length === 0) return false;
  return tokens.every((tok) => fields.some((f) => hitsField(tok, f)));
}

function scoreVariant(
  v: string,
  name: string,
  tagline: string,
  tags: string,
  description: string | null,
): number {
  if (name.startsWith(v)) return 100;
  if (name.includes(v)) return 80;
  if (tagline.includes(v)) return 55;
  if (tags.includes(v)) return 40;
  if ((description ?? "").includes(v)) return 25;
  return 0;
}

export function relevanceScore(
  tokens: string[],
  fields: {
    name: string;
    tagline: string;
    tags: string;
    description: string | null;
  },
): number {
  const n = fields.name.toLowerCase();
  const tg = fields.tagline.toLowerCase();
  const tgs = fields.tags.toLowerCase();
  const d = (fields.description ?? "").toLowerCase();
  let sum = 0;
  for (const tok of tokens) {
    const s = stem(tok);
    const score = Math.max(
      scoreVariant(tok, n, tg, tgs, d),
      s !== tok ? scoreVariant(s, n, tg, tgs, d) : 0,
    );
    sum += score > 0 ? score : 10;
  }
  return sum;
}

// ── Reviews aggregate (lib/community.ts reviewStats — P3 policy) ──

export type ReviewAggregate = {
  count: number;
  ease: number;
  power: number;
  value: number;
  overall: number;
};

export function reviewAggregate(
  reviews: { ease: number; power: number; value: number }[],
): { count: number; aggregate: ReviewAggregate | null } {
  const count = reviews.length;
  if (count < 3) return { count, aggregate: null };
  const se = reviews.reduce((a, r) => a + r.ease, 0);
  const sp = reviews.reduce((a, r) => a + r.power, 0);
  const sv = reviews.reduce((a, r) => a + r.value, 0);
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

// ── Forum topics (lib/forum-topics.ts) ──

export const FORUM_TOPICS = ["general", "vibecoding", "show", "introduce"] as const;
export type ForumTopic = (typeof FORUM_TOPICS)[number];

export function asForumTopic(topic: string): ForumTopic {
  return (FORUM_TOPICS as readonly string[]).includes(topic)
    ? (topic as ForumTopic)
    : "general";
}
