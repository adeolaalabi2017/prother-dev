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
    const [threads, replies, votes] = await Promise.all([
      ctx.db.query("forumThreads").collect(),
      ctx.db.query("forumReplies").collect(),
      ctx.db.query("forumThreadVotes").collect(),
    ]);

    const visible = threads.filter((t) => !t.hidden);
    const inTopic =
      topic === "all" ? visible : visible.filter((t) => t.topic === topic);

    const replyCount = new Map<string, number>();
    for (const r of replies) {
      if (r.hidden) continue;
      replyCount.set(r.threadId, (replyCount.get(r.threadId) ?? 0) + 1);
    }
    const voteCount = new Map<string, number>();
    for (const vt of votes) {
      voteCount.set(vt.threadId, (voteCount.get(vt.threadId) ?? 0) + 1);
    }
    const votedSet = new Set(
      voterKey ? votes.filter((vt) => vt.voterKey === voterKey).map((vt) => vt.threadId) : [],
    );

    const rows = inTopic.map((t) => ({
      // Row id is the Prisma cuid (legacyId) — matches ForumThreadRow.id.
      id: t.legacyId ?? t._id,
      slug: t.slug,
      title: t.title,
      body: t.body,
      topic: asForumTopic(t.topic),
      author: t.author,
      pinned: t.pinned,
      votes: t.baseUpvotes + (voteCount.get(t._id) ?? 0),
      voted: votedSet.has(t._id),
      replyCount: replyCount.get(t._id) ?? 0,
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
