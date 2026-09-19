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
