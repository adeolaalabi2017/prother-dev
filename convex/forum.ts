/**
 * Convex read: forum thread list with per-topic counts.
 * Shadows GET /api/forum — mirrors lib/forum.ts forumListPayload exactly:
 * hidden filter, non-hidden reply counts, all-vote counts, voterKey set,
 * new/top/hot sorts (hot = F-36 rankScore decay, pinned first), and the
 * known-topic counts guard.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { asForumTopic, rankScore, type ForumTopic } from "./shared";
import { isoFromMs } from "./shared";

export const list = query({
  args: {
    topic: v.string(),
    sort: v.union(v.literal("hot"), v.literal("new"), v.literal("top")),
    voterKey: v.optional(v.string()),
  },
  handler: async (ctx, { topic, sort, voterKey }) => {
    // I/O HOTFIX: was collect(all threads + all replies + all votes) per
    // forum page. Now: index-scoped thread fetch (max 100) + denormalized
    // replyCount/voteCount on the thread doc. Voted set resolved per-thread
    // only when voterKey is present.
    const threads =
      topic === "all"
        ? await ctx.db.query("forumThreads").withIndex("by_created").take(100)
        : await ctx.db
            .query("forumThreads")
            .withIndex("by_topic_created", (i) => i.eq("topic", topic))
            .take(100);

    const visible = threads.filter((t) => !t.hidden);
    const inTopic =
      topic === "all" ? visible : visible.filter((t) => t.topic === topic);

    let votedSet = new Set<string>();
    if (voterKey) {
      const checks = await Promise.all(
        inTopic.slice(0, 50).map((t) =>
          ctx.db
            .query("forumThreadVotes")
            .withIndex("by_thread_voter", (i) =>
              i.eq("threadId", t._id).eq("voterKey", voterKey),
            )
            .first(),
        ),
      );
      checks.forEach((row, idx) => {
        if (row) votedSet.add(inTopic[idx]!._id);
      });
    }

    const rows = inTopic.map((t) => ({
      // Row id is the Prisma cuid (legacyId) — matches ForumThreadRow.id.
      id: t.legacyId ?? t._id,
      slug: t.slug,
      title: t.title,
      body: t.body,
      topic: asForumTopic(t.topic),
      author: t.author,
      pinned: t.pinned,
      votes: t.baseUpvotes + (t.voteCount ?? 0),
      voted: votedSet.has(t._id),
      replyCount: t.replyCount ?? 0,
      createdAt: isoFromMs(t.createdAt),
      // Rowid proxy for full-tie order parity (stripped before return).
      _c: t._creationTime,
    }));

    const pinnedFirst = (
      a: (typeof rows)[number],
      b: (typeof rows)[number],
    ) => Number(b.pinned) - Number(a.pinned);
    const byNewest = (
      a: (typeof rows)[number],
      b: (typeof rows)[number],
    ) =>
      b.createdAt.localeCompare(a.createdAt) || a._c - b._c;

    if (sort === "new") {
      rows.sort(byNewest);
    } else if (sort === "top") {
      rows.sort(
        (a, b) =>
          pinnedFirst(a, b) || b.votes - a.votes || byNewest(a, b),
      );
    } else {
      const now = Date.now();
      const score = (t: (typeof rows)[number]) =>
        rankScore(t.votes, new Date(t.createdAt).getTime(), now);
      rows.sort(
        (a, b) =>
          pinnedFirst(a, b) || score(b) - score(a) || byNewest(a, b),
      );
    }
    const stripped = rows.map(({ _c, ...rest }) => {
      void _c;
      return rest;
    });

    const counts: Record<"all" | ForumTopic, number> = {
      all: 0,
      general: 0,
      vibecoding: 0,
      show: 0,
      introduce: 0,
    };
    for (const t of visible) {
      counts.all += 1;
      const parsed = asForumTopic(t.topic);
      if (t.topic === parsed) counts[parsed] += 1;
    }

    return { threads: stripped, counts };
  },
});
