/**
 * Community reports (Task 23) — shared reason/target vocab for the
 * flagging dialog and the report API's Zod schemas.
 *
 * Data lives in Convex (convex/community.ts + adminCrud.reportResolve);
 * the Prisma queue layer that used to live here was retired with the
 * cutover.
 */

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "misleading",
  "broken",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGET_TYPES = ["thread", "reply", "tool", "post", "review"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
