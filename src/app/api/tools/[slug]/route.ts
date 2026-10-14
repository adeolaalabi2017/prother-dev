import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { shadowToolDetail } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";
import { getGithubStats } from "@/lib/github";

export const dynamic = "force-dynamic";

/** GET /api/tools/[slug] - full detail for the tool preview modal (PRD §10.1).
 *  Community layer (reviews / discussion / viewer state) is additive.
 *  GitHub repo stats ride along when the listing has a githubUrl; null on
 *  any failure so the overlay hides those cells instead of faking numbers. */
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
    const github = await getGithubStats(
      (body as { links?: { github?: string | null } }).links?.github ?? null,
    );
    return NextResponse.json(
      { ...body, github },
      {
        headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
      }
    );
  } catch (err) {
    console.error("[api:tools/[slug]] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
