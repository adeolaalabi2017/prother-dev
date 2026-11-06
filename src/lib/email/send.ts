import type { RenderedEmail } from "@/lib/email/layout";

/**
 * Send one transactional email through Resend. Never throws: returns false
 * (and logs) when the key is missing or the send fails, so callers can treat
 * email as best-effort after their real work has been saved.
 */
export async function sendEmail(
  to: string,
  mail: RenderedEmail,
  tag: string,
  opts: { replyTo?: string } = {}
): Promise<boolean> {
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) {
    console.log(`[prother:email] ${tag}: RESEND_API_KEY unset, not sent to ${to}`);
    return false;
  }
  try {
    const { Resend } = await import("resend");
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM || "Prother <noreply@prother.dev>",
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    if (error) throw new Error(`${error.name}: ${error.message}`);
    return true;
  } catch (err) {
    console.error(`[prother:email] ${tag}: resend send failed:`, to, err);
    return false;
  }
}
