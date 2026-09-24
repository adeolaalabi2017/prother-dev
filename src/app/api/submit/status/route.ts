import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { shadowSubmissionsByEmail } from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/submit/status?email=<email> — maker-facing submission tracking
 * (PRD §11 "status tracking"). Returns the maker's submissions with review
 * outcome: pending (queue position), approved (tool slug of the live
 * listing), or rejected (cited standards in reviewNote).
 *
 * Scope note: email-only lookup is the auth-lite stand-in for the landing
 * scope — makers only ever see their own submissions' status, which they
 * already know the email for. NextAuth gates full accounts in Phase 2.
 */
const querySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(200),
});

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  const parsed = querySchema.safeParse({ email });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the email you submitted with." },
      { status: 400 }
    );
  }

  // Convex-only (submit cutover): maker status from the Convex read.
  const res = await shadowSubmissionsByEmail(
    createServerConvexClient()!,
    parsed.data.email,
  );
  return NextResponse.json(res, {
    headers: { "Cache-Control": "no-store", "x-data-backend": "convex" },
  });
}
