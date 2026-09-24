import { NextRequest, NextResponse } from "next/server";
import { EDITOR_KEY } from "@/lib/prother";
import { shadowEditorQueue } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/editor/queue — PRD §12 editor console data (demo passcode gate).
 * Pending submissions oldest-first (PRD fairness), plus the moderation desk:
 * ownership claims awaiting arbitration (F-30) and reviews held back by the
 * <48h soft-moderation filter (F-16).
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("x-editor-key") !== EDITOR_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Convex-only (editor cutover): pending oldest-first + moderation desk.
  const res = await shadowEditorQueue(createServerConvexClient()!);
  return NextResponse.json(res, {
    headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
  });
}
