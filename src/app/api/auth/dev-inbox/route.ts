import { NextResponse } from "next/server";
import { DEV_LINKS_ENABLED, popDevMagicLink } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Sandbox stand-in for the transactional email inbox (F-37 magic links).
 * GET /api/auth/dev-inbox?email=<address> → { enabled, url }.
 * The URL is the full NextAuth magic link captured by sendVerificationRequest.
 * Disable with AUTH_DEV_LINKS=false once a real SMTP/Resend transport exists.
 */
export async function GET(req: Request) {
  if (!DEV_LINKS_ENABLED) {
    return NextResponse.json({ enabled: false, url: null }, { status: 404 });
  }
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }
  return NextResponse.json({ enabled: true, url: popDevMagicLink(email) });
}
