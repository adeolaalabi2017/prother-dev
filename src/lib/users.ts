/**
 * Community user gates — ban checks for write routes.
 *
 * Roster + moderation data lives in Convex (convex/adminCrud.ts); the
 * Prisma/auth.db management layer that used to live here was retired
 * with the Auth phase. What remains is the ban gate every community
 * write route checks.
 */
import { aq } from "@/lib/authdb";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../convex/_generated/api.js";

/** True when the account is banned — checked by every community write route.
 *  Phase 4 step 7: resolves via the Convex identity bridge first (kept fresh
 *  by NextAuth sign-in events); falls back to the micro-SQLite auth db when
 *  the bridge has no record yet or Convex is unreachable. */
export async function isUserBanned(userId: string): Promise<boolean> {
  try {
    const client = createServerConvexClient();
    if (client) {
      const state = await client.query(api.users.authState, {
        externalAuthId: userId,
      });
      if (state) return state.banned;
    }
  } catch {
    // fall through to the auth db
  }
  const rows = aq<{ status: string }>`
    SELECT status FROM "User" WHERE id = ${userId} LIMIT 1`;
  return rows[0]?.status === "banned";
}
