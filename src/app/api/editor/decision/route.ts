import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { editorKey, slugifyName } from "@/lib/prother";
import { convexEditorDecide, shadowEditorQueue } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * POST /api/editor/decision — PRD §12: approve (listing goes live
 * immediately) or reject (must cite failed standard(s), PRD §7).
 *
 * Approve closes the Track-B loop: Submission → Tool (community track,
 * verified, live at once — no scheduled state) + the exact submissionId FK
 * so the maker tracker links back to the listing.
 */
const bodySchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    id: z.string().min(1),
  }),
  z.object({
    decision: z.literal("reject"),
    id: z.string().min(1),
    failedStandards: z.array(z.enum(["S1", "S2", "S3", "S4", "S5", "S6"])).min(1),
    note: z.string().trim().max(500).optional().default(""),
  }),
]);

export async function POST(req: NextRequest) {
  const key = editorKey();
  if (key == null || req.headers.get("x-editor-key") !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const input = parsed.data;
  const client = createServerConvexClient()!;
  const convexErr = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

  if (input.decision === "reject") {
    const note = `Failed: ${input.failedStandards.join(", ")}${
      input.note ? `: ${input.note}` : ""
    }`;
    // Convex-only (editor cutover): the mutation validates pending status.
    try {
      const res = await convexEditorDecide(client, {
        submissionId: input.id,
        decision: "reject",
        reviewNote: note,
      });
      return NextResponse.json({ ok: true, decision: "rejected", reviewNote: res.reviewNote ?? note });
    } catch (err) {
      const m = convexErr(err);
      if (m.includes("submission_not_found")) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }
      if (m.includes("already_")) {
        const status = m.includes("already_approved") ? "approved" : m.includes("already_rejected") ? "rejected" : "processed";
        return NextResponse.json({ error: `Submission already ${status}` }, { status: 409 });
      }
      console.error("[api:editor/decision] reject failed:", input.id, err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // ── Approve: Submission → Tool, live immediately ─────────────────────
  // The mutation owns the submission→Tool link atomically (validates pending
  // status + category). The route resolves the display inputs it needs
  // (name/email/categorySlug) from the Convex queue read, then retries slug
  // candidates on slug_taken (mirrors uniqueToolSlug: base, base-2 … base-49).
  const queue = await shadowEditorQueue(client);
  const sub = queue.pending.find((s) => s.id === input.id);
  if (!sub) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (sub.status !== "pending") {
    return NextResponse.json(
      { error: `Submission already ${sub.status}` },
      { status: 409 }
    );
  }

  const nowMs = Date.now();
  const toolId = crypto.randomUUID();
  const baseSlug = slugifyName(sub.name);
  const makerHandle = `@${sub.email.split("@")[0]?.replace(/[^a-z0-9_-]/gi, "") || "maker"}`;
  const candidates = [
    baseSlug,
    ...Array.from({ length: 48 }, (_, i) => `${baseSlug}-${i + 2}`),
    `${baseSlug}-${nowMs.toString(36)}`,
  ];
  for (const slug of candidates) {
    try {
      const res = await convexEditorDecide(client, {
        submissionId: sub.id,
        decision: "approve",
        toolId,
        toolSlug: slug,
        categorySlug: sub.categorySlug,
        makerHandle,
        createdAt: nowMs,
      });
      return NextResponse.json({ ok: true, decision: "approved", slug: res.slug });
    } catch (err) {
      const m = convexErr(err);
      if (m.includes("slug_taken")) continue;
      if (m.includes("submission_not_found")) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }
      if (m.includes("already_")) {
        return NextResponse.json({ error: `Submission already ${sub.status}` }, { status: 409 });
      }
      if (m.includes("unknown_category")) {
        return NextResponse.json(
          { error: `Unknown category "${sub.categorySlug}"` },
          { status: 409 }
        );
      }
      console.error("[api:editor/decision] approve failed:", sub.id, err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
