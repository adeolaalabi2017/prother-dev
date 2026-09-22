import { NextRequest, NextResponse } from "next/server";
import {
  countSubmissionsByStatus,
  db,
  EDITOR_KEY,
  listPendingSubmissions,
} from "@/lib/prother";

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

  const nowMs = Date.now();

  const [pending, counts, claimRows, reviewRows] = await Promise.all([
    listPendingSubmissions(),
    countSubmissionsByStatus(),
    // Claims that a human needs to look at: pending (stuck meta-tag),
    // failed (verification bounced — "FALSE CLAIMS FAIL BY DESIGN"),
    // or disputed (a third party flagged it). Unclaimed tools only.
    db.$queryRaw<
      {
        id: string;
        toolSlug: string;
        toolName: string;
        toolEmoji: string;
        userEmail: string;
        userName: string;
        method: string;
        status: string;
        token: string;
        note: string | null;
        createdAt: number | string;
      }[]
    >`
      SELECT c.id, c.userEmail, c.userName, c.method, c.status, c.token,
             c.note, c.createdAt,
             t.slug AS toolSlug, t.name AS toolName, t.logoEmoji AS toolEmoji
      FROM Claim c
      JOIN Tool t ON t.id = c.toolId
      WHERE c.status IN ('pending', 'failed', 'disputed') AND t.claimed = 0
      ORDER BY c.createdAt ASC
      LIMIT 50`,
    // Reviews held back by the <48h account-age filter. Editors publish
    // legit ones or trash spam (F-16 soft moderation).
    db.$queryRaw<
      {
        id: string;
        toolSlug: string;
        toolName: string;
        toolEmoji: string;
        author: string;
        ease: number;
        power: number;
        value: number;
        body: string;
        createdAt: number | string;
      }[]
    >`
      SELECT r.id, r.author, r.ease, r.power, r.value, r.body, r.createdAt,
             t.slug AS toolSlug, t.name AS toolName, t.logoEmoji AS toolEmoji
      FROM Review r
      JOIN Tool t ON t.id = r.toolId
      WHERE r.status = 'filtered'
      ORDER BY r.createdAt ASC
      LIMIT 50`,
  ]);

  const ageH = (createdAt: number | string) =>
    Math.max(
      0,
      Math.round((nowMs - new Date(createdAt).getTime()) / 3_600_000)
    );

  return NextResponse.json(
    {
      ok: true,
      pending: pending.map((s) => ({
        ...s,
        // $queryRaw returns SQLite booleans as true/false — normalize explicitly.
        hasApi: Boolean(s.hasApi),
        isOwner: Boolean(s.isOwner),
        confirmedLive: Boolean(s.confirmedLive),
        agreedStandards: Boolean(s.agreedStandards),
        ageH: ageH(s.createdAt),
      })),
      counts,
      claims: claimRows.map((c) => ({
        ...c,
        ageH: ageH(c.createdAt),
      })),
      filteredReviews: reviewRows.map((r) => ({
        ...r,
        ageH: ageH(r.createdAt),
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
