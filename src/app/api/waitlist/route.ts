import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  source: z.string().trim().max(40).optional().default("waitlist"),
});

export async function GET() {
  const count = await db.subscriber.count();
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const { email, source } = parsed.data;

  try {
    const existing = await db.subscriber.findUnique({ where: { email } });
    if (existing) {
      const count = await db.subscriber.count();
      return NextResponse.json({ count, alreadySubscribed: true });
    }
    await db.subscriber.create({ data: { email, source } });
  } catch {
    // Unique-race fallback
    const count = await db.subscriber.count();
    return NextResponse.json({ count, alreadySubscribed: true });
  }

  const count = await db.subscriber.count();
  return NextResponse.json({ count, alreadySubscribed: false });
}
