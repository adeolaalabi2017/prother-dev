import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  launchId: z.string().min(6).max(64),
  voterKey: z.string().min(8).max(64),
});

/** Toggle an anonymous upvote (1 vote per visitor per launch — F-14). */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const { launchId, voterKey } = parsed.data;

  const launch = await db.launch.findUnique({ where: { id: launchId } });
  if (!launch) {
    return NextResponse.json({ error: "Launch not found" }, { status: 404 });
  }

  const existing = await db.vote.findUnique({
    where: { launchId_voterKey: { launchId, voterKey } },
  });

  if (existing) {
    await db.vote.delete({ where: { id: existing.id } });
  } else {
    await db.vote.create({ data: { launchId, voterKey } });
  }

  const [{ n: anonVotes }] = await Promise.all([
    db.vote.count({ where: { launchId } }).then((c) => ({ n: c })),
  ]);

  return NextResponse.json({
    voted: !existing,
    votes: launch.baseUpvotes + anonVotes,
  });
}
