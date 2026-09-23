import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, EDITOR_KEY } from "@/lib/prother";
import { logAudit } from "@/lib/admin";
import { approveClaimAndTransfer } from "@/lib/community";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("claim"),
    id: z.string().min(1),
    action: z.enum(["verify", "dismiss"]),
    note: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("review"),
    id: z.string().min(1),
    action: z.enum(["publish", "spam"]),
  }),
]);

/**
 * POST /api/editor/arbitrate — moderation desk decisions (editor gate):
 * - claim verify  → same transfer path as automated verification (F-30)
 * - claim dismiss → mark disputed so the claimant sees the rejection
 * - review publish → release a <48h-filtered review (F-16)
 * - review spam   → remove the review outright
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("x-editor-key") !== EDITOR_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  if (parsed.data.type === "claim") {
    const claim = await db.$queryRaw<
      { id: string; toolId: string; userEmail: string; userName: string }[]
    >`
      SELECT id, toolId, userEmail, userName FROM Claim
      WHERE id = ${parsed.data.id} LIMIT 1`;
    const row = claim[0];
    if (!row) {
      return NextResponse.json({ error: "claim_not_found" }, { status: 404 });
    }

    if (parsed.data.action === "verify") {
      const tool = await db.$queryRaw<
        { id: string; slug: string; claimed: number | boolean }[]
      >`
        SELECT id, slug, claimed FROM Tool WHERE id = ${row.toolId} LIMIT 1`;
      const toolRow = tool[0];
      if (!toolRow) {
        return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
      }
      if (toolRow.claimed) {
        return NextResponse.json({ error: "already_claimed" }, { status: 409 });
      }
      await approveClaimAndTransfer(row.id, row.toolId, {
        email: row.userEmail,
        handle: row.userName.replace(/^@/, "") || row.userEmail.split("@")[0],
      });
      logAudit(
        "claim.arbitrated",
        "tool",
        toolRow.slug,
        `editor verified claim of ${row.userEmail}`
      );
      return NextResponse.json({ ok: true, decision: "verified" });
    }

    // dismiss → disputed is the terminal state (failed stays retryable).
    await db.$executeRaw`
      UPDATE Claim SET status = 'disputed', note = ${parsed.data.note ?? "Editor dismissed: ownership not established"}
      WHERE id = ${row.id}`;
    logAudit(
      "claim.arbitrated",
      "tool",
      row.toolId,
      `editor dismissed claim of ${row.userEmail}`
    );
    return NextResponse.json({ ok: true, decision: "dismissed" });
  }

  // ── Review moderation ───────────────────────────────────────────────────
  const review = await db.$queryRaw<{ id: string; toolId: string }[]>`
    SELECT id, toolId FROM Review WHERE id = ${parsed.data.id} LIMIT 1`;
  if (!review[0]) {
    return NextResponse.json({ error: "review_not_found" }, { status: 404 });
  }

  if (parsed.data.action === "publish") {
    await db.$executeRaw`
      UPDATE Review SET status = 'published', updatedAt = ${Date.now()}
      WHERE id = ${parsed.data.id}`;
    logAudit(
      "review.moderated",
      "tool",
      review[0].toolId,
      `editor published filtered review ${parsed.data.id}`
    );
    return NextResponse.json({ ok: true, decision: "published" });
  }

  await db.$executeRaw`DELETE FROM Review WHERE id = ${parsed.data.id}`;
  logAudit(
    "review.moderated",
    "tool",
    review[0].toolId,
    `editor removed spam review ${parsed.data.id}`
  );
  return NextResponse.json({ ok: true, decision: "spam" });
}
