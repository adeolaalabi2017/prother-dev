/**
 * Tool listing discussion (comments) — shared row shapes.
 *
 * The Prisma data layer that used to live here was retired with the Convex
 * cutover (convex/community.ts owns comment reads/writes).
 *
 * Client components import ONLY the types (erased at build time).
 */

export type CommentRow = {
  id: string;
  author: string;
  body: string;
  isMaker: boolean;
  /** ISO timestamp. */
  createdAt: string;
};
