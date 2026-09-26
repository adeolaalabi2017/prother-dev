/**
 * One-time launch purge: delete every account except the owner's, plus all
 * user-attributable content (reviews, threads, comments, collections,
 * follows, bookmarks, submissions, claims, reports, media, auth rows) and
 * the never-sold demo ad campaigns.
 *
 * Kept unconditionally: tools, categories, journal posts, site settings,
 * integrations, analytics aggregates, audit trail, anonymous (anon:) rows.
 *
 * Fail-closed: throws unless the protected account exists; executes deletes
 * only when execute=true AND confirm="PURGE". Otherwise returns dry-run
 * counts without touching a row.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";

const norm = (s?: string | null) =>
  (s ?? "").trim().replace(/^@/, "").toLowerCase();

export const purgeUsers = mutation({
  args: {
    protectedEmail: v.string(),
    confirm: v.string(),
    execute: v.boolean(),
  },
  handler: async (ctx, a) => {
    const keepEmail = a.protectedEmail.trim().toLowerCase();
    const users = await ctx.db.query("users").collect();
    const kept = users.filter(
      (u) => (u.email ?? "").toLowerCase() === keepEmail
    );
    if (kept.length === 0) {
      throw new Error("protected account not found — refusing to purge");
    }
    if (a.execute && a.confirm !== "PURGE") {
      throw new Error("confirmation mismatch — refusing to purge");
    }

    const purged = users.filter(
      (u) => (u.email ?? "").toLowerCase() !== keepEmail
    );
    const keeper = kept[0];
    const keeperIds = new Set(
      [keeper.email, keeper.legacyId, String(keeper._id)].filter(
        Boolean
      ) as string[]
    );
    const keeperNames = new Set(
      [keeper.handle, keeper.name]
        .map((s) => norm(s))
        .filter(Boolean)
    );
    const emails = new Set(
      purged.map((u) => (u.email ?? "").toLowerCase()).filter(Boolean)
    );
    const legacyIds = new Set(
      purged.flatMap((u) => {
        const ids = [u.legacyId, String(u._id)];
        return ids.filter(Boolean) as string[];
      })
    );
    const handles = new Set(
      purged.flatMap((u) => [norm(u.handle), norm(u.name)])
    );
    const userKeys = new Set([...emails].map((e) => `user:${e}`));

    const counts: Record<string, number> = {};
    const bump = (k: string, n = 1) => {
      counts[k] = (counts[k] ?? 0) + n;
    };
    const wipe = async (
      table:
        | "users"
        | "reviews"
        | "comments"
        | "forumThreads"
        | "forumReplies"
        | "forumThreadVotes"
        | "collections"
        | "collectionItems"
        | "follows"
        | "bookmarks"
        | "submissions"
        | "claims"
        | "reports"
        | "media"
        | "authAccounts"
        | "authSessions"
        | "authVerificationTokens"
        | "adCampaigns",
      ids: string[],
      key: string
    ) => {
      bump(key, ids.length);
      if (!a.execute) return;
      for (const id of ids) {
        await ctx.db.delete(id as never);
      }
    };

    // ── users + auth rows ──
    await wipe(
      "users",
      purged.map((u) => String(u._id)),
      "users"
    );
    const accounts = await ctx.db.query("authAccounts").collect();
    await wipe(
      "authAccounts",
      accounts
        .filter((r) => legacyIds.has(r.userLegacyId))
        .map((r) => String(r._id)),
      "authAccounts"
    );
    const sessions = await ctx.db.query("authSessions").collect();
    await wipe(
      "authSessions",
      sessions
        .filter((r) => legacyIds.has(r.userLegacyId))
        .map((r) => String(r._id)),
      "authSessions"
    );
    const tokens = await ctx.db.query("authVerificationTokens").collect();
    await wipe(
      "authVerificationTokens",
      tokens
        .filter((t) =>
          emails.has((t.identifier ?? "").toLowerCase().split(":")[0])
        )
        .map((t) => String(t._id)),
      "authVerificationTokens"
    );

    // ── reviews / comments: keep-only-keeper (catches unattributed and
    // system-authored seed rows no user row ever matched) ──
    const reviews = await ctx.db.query("reviews").collect();
    const deadReviewIds = new Set<string>();
    await wipe(
      "reviews",
      reviews
        .filter((r) => !keeperIds.has(r.userId))
        .map((r) => {
          deadReviewIds.add(String(r._id));
          return String(r._id);
        }),
      "reviews"
    );
    const comments = await ctx.db.query("comments").collect();
    await wipe(
      "comments",
      comments
        .filter(
          (c) =>
            !keeperNames.has(norm(c.author)) &&
            !keeperIds.has(norm(c.author))
        )
        .map((c) => String(c._id)),
      "comments"
    );

    // ── forum: keep-only-keeper threads (system/seed rows like @prother
    // match no user), keeper replies survive only on kept threads, and ALL
    // thread votes go (anonymous voter keys, seed-era ballots) ──
    const threads = await ctx.db.query("forumThreads").collect();
    const deadThreadIds = new Set<string>();
    const deadThreadSlugs = new Set<string>();
    const keptThreadIds = new Set<string>();
    await wipe(
      "forumThreads",
      threads
        .filter((t) => {
          const mine =
            (t.authorId && keeperIds.has(t.authorId)) ||
            keeperNames.has(norm(t.author));
          if (mine) {
            keptThreadIds.add(String(t._id));
            return false;
          }
          return true;
        })
        .map((t) => {
          deadThreadIds.add(String(t._id));
          deadThreadSlugs.add(t.slug);
          return String(t._id);
        }),
      "forumThreads"
    );
    const replies = await ctx.db.query("forumReplies").collect();
    await wipe(
      "forumReplies",
      replies
        .filter((r) => {
          if (deadThreadIds.has(String(r.threadId))) return true;
          if (!keptThreadIds.has(String(r.threadId))) return true;
          return !(
            (r.authorId && keeperIds.has(r.authorId)) ||
            keeperNames.has(norm(r.author))
          );
        })
        .map((r) => String(r._id)),
      "forumReplies"
    );
    const votes = await ctx.db.query("forumThreadVotes").collect();
    await wipe(
      "forumThreadVotes",
      votes.map((x) => String(x._id)),
      "forumThreadVotes"
    );

    // ── tools: recompute denormalized counters from surviving rows ──
    const tools = await ctx.db.query("tools").collect();
    const remainingReviews = a.execute
      ? await ctx.db.query("reviews").collect()
      : reviews;
    const remainingComments = a.execute
      ? await ctx.db.query("comments").collect()
      : comments;
    const reviewCountByTool = new Map<string, number>();
    for (const r of remainingReviews) {
      const k = String(r.toolId);
      reviewCountByTool.set(k, (reviewCountByTool.get(k) ?? 0) + 1);
    }
    const commentCountByTool = new Map<string, number>();
    for (const c of remainingComments) {
      const k = String(c.toolId);
      commentCountByTool.set(k, (commentCountByTool.get(k) ?? 0) + 1);
    }
    let toolsRecomputed = 0;
    for (const t of tools) {
      const k = String(t._id);
      const reviewCount = reviewCountByTool.get(k) ?? 0;
      const commentCount = commentCountByTool.get(k) ?? 0;
      if (t.reviewCount !== reviewCount || t.commentCount !== commentCount) {
        toolsRecomputed += 1;
        if (a.execute) {
          await ctx.db.patch(t._id, { reviewCount, commentCount });
        }
      }
    }
    bump("toolsRecomputed", toolsRecomputed);

    // ── collections + items / follows / bookmarks ──
    const collections = await ctx.db.query("collections").collect();
    const deadCollectionIds = new Set<string>();
    const deadCollectionSlugs = new Set<string>();
    await wipe(
      "collections",
      collections
        .filter((c) => emails.has(c.ownerEmail.toLowerCase()))
        .map((c) => {
          deadCollectionIds.add(String(c._id));
          deadCollectionSlugs.add(c.slug);
          return String(c._id);
        }),
      "collections"
    );
    const items = await ctx.db.query("collectionItems").collect();
    await wipe(
      "collectionItems",
      items
        .filter((i) => deadCollectionIds.has(String(i.collectionId)))
        .map((i) => String(i._id)),
      "collectionItems"
    );
    const follows = await ctx.db.query("follows").collect();
    await wipe(
      "follows",
      follows
        .filter((f) => emails.has(f.userEmail.toLowerCase()))
        .map((f) => String(f._id)),
      "follows"
    );
    const bookmarks = await ctx.db.query("bookmarks").collect();
    await wipe(
      "bookmarks",
      bookmarks
        .filter((b) => userKeys.has(b.ownerKey))
        .map((b) => String(b._id)),
      "bookmarks"
    );

    // ── submissions / claims / reports ──
    const submissions = await ctx.db.query("submissions").collect();
    await wipe(
      "submissions",
      submissions
        .filter((s) => emails.has(s.email.toLowerCase()))
        .map((s) => String(s._id)),
      "submissions"
    );
    const claims = await ctx.db.query("claims").collect();
    await wipe(
      "claims",
      claims
        .filter((c) => emails.has(c.userEmail.toLowerCase()))
        .map((c) => String(c._id)),
      "claims"
    );
    const reports = await ctx.db.query("reports").collect();
    await wipe(
      "reports",
      reports
        .filter(
          (r) =>
            (r.reporterEmail && emails.has(r.reporterEmail.toLowerCase())) ||
            (r.targetType === "thread" &&
              (deadThreadSlugs.has(r.targetId) ||
                deadThreadIds.has(r.targetId))) ||
            (r.targetType === "review" && deadReviewIds.has(r.targetId)) ||
            (r.targetType === "collection" &&
              (deadCollectionSlugs.has(r.targetId) ||
                deadCollectionIds.has(r.targetId)))
        )
        .map((r) => String(r._id)),
      "reports"
    );

    // ── media rows + blobs of purged uploaders ──
    const media = await ctx.db.query("media").collect();
    const deadMedia = media.filter((m) => userKeys.has(m.ownerKey));
    bump("media", deadMedia.length);
    if (a.execute) {
      for (const m of deadMedia) {
        if (m.storageId) {
          await ctx.storage.delete(m.storageId).catch(() => {});
        }
        await ctx.db.delete(m._id);
      }
    }

    // ── never-sold demo campaigns (monetization paused, nothing real) ──
    const campaigns = await ctx.db.query("adCampaigns").collect();
    await wipe(
      "adCampaigns",
      campaigns.map((c) => String(c._id)),
      "adCampaigns"
    );

    return {
      executed: a.execute,
      keptEmail: keepEmail,
      purgedHandles: purged.map((u) => u.handle ?? u.email ?? String(u._id)),
      counts,
    };
  },
});
