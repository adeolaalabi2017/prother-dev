import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { shadowToolDetail } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/** GET /api/tools/[slug] — full detail for the tool preview modal (PRD §10.1).
 *  Community layer (reviews / discussion / viewer state) is additive. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sessionUser = await getAuthUser();

  try {
    const body = await shadowToolDetail(
      createServerConvexClient()!,
      slug,
      sessionUser
        ? { id: sessionUser.id, email: sessionUser.email, handle: sessionUser.handle }
        : null
    );
    if (body && "error" in body) {
      return NextResponse.json(body, {
        status: 404,
        headers: { "x-data-backend": "convex" },
      });
    }
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch (err) {
    console.error("[api:tools/[slug]] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
