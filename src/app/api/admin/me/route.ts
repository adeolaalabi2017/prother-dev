import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createServerConvexClient } from "@/lib/convex";
import { api } from "../../../../../convex/_generated/api.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me — NextAuth P2 identity probe for the admin gate.
 * Returns the signed-in user's admin eligibility so the console can offer
 * "unlock as @handle" without the shared key. No admin data leaks here:
 * only role/handle/email of the caller's own session.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ authed: false });

  let role: string | null = null;
  let handle: string | null = null;
  let status: string | null = null;
  const client = createServerConvexClient();
  if (client) {
    try {
      const st = await client.query(api.users.roleByEmail, { email: user.email });
      if (st) {
        role = st.role;
        handle = st.handle;
        status = st.status;
      }
    } catch {
      // fall through: authed but unverified role
    }
  }
  return NextResponse.json(
    { authed: true, email: user.email, handle, role, status },
    { headers: { "Cache-Control": "no-store" } }
  );
}
