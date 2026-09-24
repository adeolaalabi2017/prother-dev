/**
 * Prother shared domain logic + types — search & discovery directory.
 * (Launch/vote machinery removed in the directory repositioning.)
 */
import { db } from "@/lib/db";
import type { ForumTopic } from "@/lib/forum-topics";
import type { AlternativeRow, ToolUseCase } from "@/lib/tool-editorial";

// ── Types ────────────────────────────────────────────────────────────────
export type Badge = {
  editorsPick: boolean;
  curated: boolean;
  unclaimed: boolean;
  hasApi: boolean;
  openSource: boolean;
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

export type ToolDetailResponse = {
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  websiteUrl: string;
  emoji: string;
  gradient: string;
  /** Uploaded logo image URL; null → render the emoji tile (Task 34). */
  logoUrl?: string | null;
  /** Uploaded screenshots, newest first; empty when none (Task 34). */
  screenshots?: string[];
  pricing: { model: string; price: string | null; note: string | null };
  /** toolCount: live listings in the category (Task 35, detail route only). */
  category: { slug: string; name: string; emoji: string; toolCount?: number };
  maker: string;
  track: "editor_seed" | "community";
  badges: Badge;
  links: { github: string | null; docs: string | null; twitter: string | null };
  submittedAt: string;
  verified: boolean;
  standards: import("@/lib/standards").StandardCheck[];
  /** Up to 3 live tools in the same category (excludes this tool). */
  related?: RelatedToolRow[];
  /** Rich editorial description, paragraphs separated by blank lines. */
  longDescription?: string | null;
  /** Editorial use cases ({title, body}). */
  useCases?: ToolUseCase[];
  /** Editorial strengths. */
  pros?: string[];
  /** Editorial limitations. */
  cons?: string[];
  /** Alternative listings resolved from the editorial slug list, order preserved. */
  alternatives?: AlternativeRow[];
  /** Pricing fact-checked stamp (ISO string), null when never checked. */
  pricingCheckedAt?: string | null;
  /** Editorial content last update (ISO string), null when never edited. */
  contentUpdatedAt?: string | null;
};

/**
 * Admin/editor gate key. `ADMIN_KEY` (fallback: legacy `EDITOR_KEY`) must be
 * set in production — when it is absent there is NO valid key and every
 * guarded route 401s (fail closed). Local dev falls back to "ember-dev"
 * so the console works without extra setup. Never commit a real key:
 * production sets it via `wrangler secret put` / server env.
 */
export function editorKey(): string | null {
  const v = (process.env.ADMIN_KEY ?? process.env.EDITOR_KEY ?? "").trim();
  if (v) return v;
  if (process.env.NODE_ENV === "production") return null;
  return "ember-dev";
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

// ── Forums — shared shapes (re-exported for components) ────────────────────
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

export type ForumListResponse = {
  threads: ForumThreadRow[];
  counts: { all: number; general: number; vibecoding: number; show: number; introduce: number };
};

export { db };
