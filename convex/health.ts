/**
 * Convex smoke-test module (Phase 1).
 *
 * `health:check` proves the deployment is reachable and the schema tables
 * are queryable. Pre-import (Phase 2) the counts are 0; post-import they
 * must match the SQLite baselines in /tmp/convex-baseline/.
 */
import { query } from "./_generated/server";

export const check = query({
  args: {},
  handler: async (ctx) => {
    const [categories, tools] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db.query("tools").collect(),
    ]);
    return {
      ok: true,
      time: Date.now(),
      counts: { categories: categories.length, tools: tools.length },
    };
  },
});
