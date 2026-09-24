/**
 * Convex scheduled jobs (Phase 4 step 5, plan §3.8).
 *
 * - campaignLifecycle: daily 01:00 UTC — end expired ad campaigns.
 * - tokenHygiene: deferred to step 7 (see convex/cronlib.ts).
 *
 * Manual QA triggers live in convex/import.ts (devCampaignTick) as the
 * plan requires.
 */
import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api.js";
import { campaignLifecycleTick } from "./cronlib";

export const tickCampaigns = internalMutation({
  args: {},
  handler: async (ctx) => campaignLifecycleTick(ctx),
});

const crons = cronJobs();

crons.daily(
  "campaign-lifecycle",
  { hourUTC: 1, minuteUTC: 0 },
  internal.crons.tickCampaigns,
  {},
);

export default crons;
