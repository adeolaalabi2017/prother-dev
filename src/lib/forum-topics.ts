/**
 * Forum topic constants — CLIENT-SAFE (no Prisma imports).
 * Split out of lib/prother.ts so client components can import the labels
 * without pulling the Prisma client into the browser bundle.
 * The forum query implementation lives in lib/forum.ts (server-only).
 */

export const FORUM_TOPICS = ["general", "vibecoding", "show", "introduce"] as const;
export type ForumTopic = (typeof FORUM_TOPICS)[number];
export type ForumSort = "hot" | "new" | "top";

/** Mono chip label shown in the UI, e.g. `p/vibecoding`. */
export const FORUM_TOPIC_LABELS: Record<ForumTopic, string> = {
  general: "p/general",
  vibecoding: "p/vibecoding",
  show: "p/show",
  introduce: "p/introduce",
};

/** Tolerant parse — unknown stored values fall back to "general". */
export function asForumTopic(topic: string): ForumTopic {
  return (FORUM_TOPICS as readonly string[]).includes(topic)
    ? (topic as ForumTopic)
    : "general";
}
