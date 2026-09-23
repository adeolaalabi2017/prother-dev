import { NextResponse } from "next/server";
import { buildCompareMatrix, MAX_COMPARE_TOOLS } from "@/lib/compare";

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

  try {
    const matrix = await buildCompareMatrix(category, tools);
    if (!matrix) {
      return NextResponse.json({ error: "category_not_found" }, { status: 404 });
    }
    return NextResponse.json(matrix, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "matrix_failed" }, { status: 500 });
  }
}
