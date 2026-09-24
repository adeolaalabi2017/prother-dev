/**
 * Bookmarks — shared shapes + owner-namespace helper.
 *
 * The Prisma data layer that used to live here was retired with the Convex
 * cutover (convex/community.ts owns bookmark reads/writes). What remains
 * are the store-independent pieces still imported by the API route and
 * client components.
 */

export const BOOKMARK_TARGET_TYPES = ["tool", "thread", "post"] as const;
export type BookmarkTargetType = (typeof BOOKMARK_TARGET_TYPES)[number];

export type BookmarkItem = {
  id: string;
  targetType: BookmarkTargetType;
  targetId: string;
  targetLabel: string;
  targetHref: string;
  createdAt: string;
};

export function bookmarkOwnerKey(opts: {
  email?: string | null;
  visitorKey?: string | null;
}): string | null {
  if (opts.email) return `user:${opts.email.toLowerCase()}`;
  if (opts.visitorKey) return `anon:${opts.visitorKey}`;
  return null;
}
