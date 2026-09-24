/**
 * Scheduled-job bodies (plan §3.8), shared between the deployed schedule
 * (convex/crons.ts) and the manual QA triggers (convex/import.ts
 * devCampaignTick — the plan requires a manual trigger per job).
 *
 * 1. campaignLifecycle: flip adCampaigns from active to ended once past
 *    endsAt. Window state is otherwise computed on read; the cron only
 *    normalizes status.
 * 2. tokenHygiene: DEFERRED to step 7 — VerificationTokens live in SQLite
 *    (NextAuth) until the auth bridge lands; there is nothing for Convex
 *    to clean yet. This stub documents the intent and returns skipped.
 */
import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";

type Ctx = GenericMutationCtx<DataModel>;

export async function campaignLifecycleTick(ctx: Ctx): Promise<{
  ended: string[];
}> {
  const nowMs = Date.now();
  const campaigns = await ctx.db.query("adCampaigns").collect();
  const ended: string[] = [];
  for (const c of campaigns) {
    if (c.status === "active" && c.endsAt != null && c.endsAt < nowMs) {
      await ctx.db.patch(c._id, { status: "ended" });
      ended.push(c.legacyId ?? c._id);
    }
  }
  return { ended };
}

export async function tokenHygieneTick(): Promise<{
  skipped: true;
  reason: string;
}> {
  return {
    skipped: true,
    reason:
      "VerificationTokens live in SQLite (NextAuth) until the step 7 auth bridge",
  };
}
