import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EDITOR_KEY } from "@/lib/prother";
import { logAudit } from "@/lib/admin";
import { convexArbitrateClaim, convexArbitrateReview, shadowEditorQueue } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

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

  const client = createServerConvexClient()!;
  const convexErr = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

  if (parsed.data.type === "claim") {
    // Convex-only (editor cutover): the mutation owns the claim→tool
    // transfer atomically. Owner contact resolves from the queue read.
    const queue = await shadowEditorQueue(client);
    const row = queue.claims.find((c) => c.id === parsed.data.id);
    if (!row) {
      return NextResponse.json({ error: "claim_not_found" }, { status: 404 });
    }

    if (parsed.data.action === "verify") {
      const handle = row.userName.replace(/^@/, "") || row.userEmail.split("@")[0];
      try {
        const res = await convexArbitrateClaim(client, {
          claimId: row.id,
          action: "verify",
          email: row.userEmail,
          handle,
          now: Date.now(),
        });
        logAudit(
          "claim.arbitrated",
          "tool",
          res.toolSlug,
          `editor verified claim of ${res.userEmail}`
        );
        return NextResponse.json({ ok: true, decision: "verified" });
      } catch (err) {
        const m = convexErr(err);
        if (m.includes("claim_not_found")) {
          return NextResponse.json({ error: "claim_not_found" }, { status: 404 });
        }
        if (m.includes("tool_not_found")) {
          return NextResponse.json({ error: "tool_not_found" }, { status: 404 });
        }
        if (m.includes("already_claimed")) {
          return NextResponse.json({ error: "already_claimed" }, { status: 409 });
        }
        console.error("[api:editor/arbitrate] claim verify failed:", row.id, err);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    }

    // dismiss → disputed is the terminal state (failed stays retryable).
    try {
      const res = await convexArbitrateClaim(client, {
        claimId: row.id,
        action: "dismiss",
        note: parsed.data.note,
        now: Date.now(),
      });
      logAudit(
        "claim.arbitrated",
        "tool",
        res.toolSlug || row.toolSlug,
        `editor dismissed claim of ${res.userEmail}`
      );
      return NextResponse.json({ ok: true, decision: "dismissed" });
    } catch (err) {
      const m = convexErr(err);
      if (m.includes("claim_not_found")) {
        return NextResponse.json({ error: "claim_not_found" }, { status: 404 });
      }
      console.error("[api:editor/arbitrate] claim dismiss failed:", row.id, err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // ── Review moderation ───────────────────────────────────────────────────
  // Convex-only: the mutation validates existence (review_not_found).
  try {
    const res = await convexArbitrateReview(client, {
      reviewId: parsed.data.id,
      action: parsed.data.action,
      now: Date.now(),
    });
    logAudit(
      "review.moderated",
      "tool",
      res.toolLegacyId,
      res.decision === "published"
        ? `editor published filtered review ${parsed.data.id}`
        : `editor removed spam review ${parsed.data.id}`
    );
    return NextResponse.json({ ok: true, decision: res.decision });
  } catch (err) {
    const m = convexErr(err);
    if (m.includes("review_not_found")) {
      return NextResponse.json({ error: "review_not_found" }, { status: 404 });
    }
    console.error("[api:editor/arbitrate] review moderate failed:", parsed.data.id, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
