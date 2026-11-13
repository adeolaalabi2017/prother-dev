/**
 * Cloudflare Turnstile server-side check for public forms (submit wizard).
 *
 * Enforced only when TURNSTILE_SECRET_KEY is set (wrangler secret), so the
 * code can ship before the widget keys exist. The client widget renders only
 * when NEXT_PUBLIC_TURNSTILE_SITE_KEY is baked into the build. Set the site
 * key first (CI variable TURNSTILE_SITE_KEY), deploy, then add the secret:
 * a secret without a rendered widget would reject every submission.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnforced(): boolean {
  return (process.env.TURNSTILE_SECRET_KEY ?? "").trim().length > 0;
}

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(
  token: unknown,
  remoteIp: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<TurnstileResult> {
  const secret = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secret) return { ok: true };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: "missing-token" };
  }
  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);
  try {
    const res = await fetchImpl(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success === true) return { ok: true };
    return { ok: false, reason: (data["error-codes"] ?? ["failed"]).join(",") };
  } catch (err) {
    // Fail closed: an unverifiable token is treated as a failed challenge.
    console.error("[turnstile] siteverify failed:", err);
    return { ok: false, reason: "verify-unavailable" };
  }
}
