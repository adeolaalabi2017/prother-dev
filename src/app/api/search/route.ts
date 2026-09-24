import { NextResponse } from "next/server";
import { shadowSearch } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/** A scored tool hit for the hero search dropdown. */
export type SearchToolHit = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  editorsPick: boolean;
  pricing: { model: string; price: string | null };
  category: { slug: string; name: string; emoji: string };
};

export type SearchCategoryHit = {
  slug: string;
  name: string;
  emoji: string;
  count: number;
};

export type SearchPostHit = {
  slug: string;
  title: string;
  excerpt: string;
  coverEmoji: string;
  coverGradient: string;
  category: string;
  readingMinutes: number;
};

export type SearchResponse = {
  q: string;
  tools: SearchToolHit[];
  categories: SearchCategoryHit[];
  posts: SearchPostHit[];
  counts: { tools: number; posts: number };
};

/**
 * GET /api/search?q=<query> — unified discovery search for the hero search
 * bar (discovery-first moat). Returns grouped hits across the three searchable
 * surfaces: live tools (directory), categories (taxonomy) and the journal.
 * Only status="live" tools are matched, same as the public directory.
 *
 * Matching is TOKEN-based (shared matcher in convex/shared.ts): the query is
 * split into tokens and every token must hit some field, so the placeholder's
 * own suggested example — “translate video” — finds HeyGen instead of
 * dead-ending.
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 64);

  try {
    const payload = await shadowSearch(createServerConvexClient()!, q);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:search] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
