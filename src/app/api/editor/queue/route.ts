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
 * Pending submissions oldest-first (PRD fairness) + capacity chips.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("x-editor-key") !== EDITOR_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const dayAfter = new Date(todayStart.getTime() + 2 * 86_400_000);

  const [pending, counts, todayLive, tomorrowScheduled] = await Promise.all([
    listPendingSubmissions(),
    countSubmissionsByStatus(),
    db.launch.count({ where: { scheduled: false, launchDate: { gte: todayStart, lt: tomorrowStart } } }),
    db.launch.count({ where: { scheduled: true, launchDate: { gte: tomorrowStart, lt: dayAfter } } }),
  ]);

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
        ageH: Math.max(
          0,
          Math.round((now.getTime() - new Date(s.createdAt).getTime()) / 3_600_000)
        ),
      })),
      counts,
      capacity: { today: todayLive, tomorrow: tomorrowScheduled, floor: 5, cap: 15 },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
