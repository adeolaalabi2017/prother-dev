import { NextResponse } from "next/server";
import { shadowCompareMatrix } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

/** Max tools per comparison (mirrors lib/compare MAX_COMPARE_TOOLS). */
const MAX_COMPARE_TOOLS = 4;

export const dynamic = "force-dynamic";

/**
 * GET /api/compare/matrix?category=<slug>&tools=<slug,slug,…>
 *
 * Category-scoped feature comparison (Task 32). Returns the category's
 * feature axes, every live tool as picker options, and full rows for the
 * selected tools (max 4). No auth — public read, mirrors /api/compare.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const category = sp.get("category")?.trim() || "";
  if (!category) {
    return NextResponse.json({ error: "category_required" }, { status: 400 });
  }

  const tools = (sp.get("tools") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE_TOOLS);

  // Convex-only (compare cutover).
  try {
    const res = await shadowCompareMatrix(
      createServerConvexClient()!,
      category,
      tools,
    );
    if ("error" in res) {
      return NextResponse.json(res, {
        status: res.error === "category_required" ? 400 : 404,
        headers: { "x-data-backend": "convex" },
      });
    }
    return NextResponse.json(res, {
      headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
    });
  } catch {
    return NextResponse.json({ error: "matrix_failed" }, { status: 500 });
  }
}
