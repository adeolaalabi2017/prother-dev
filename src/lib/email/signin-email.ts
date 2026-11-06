import {
  button,
  closing,
  fallbackLink,
  heading,
  inset,
  lead,
  originParts,
  renderLayout,
  small,
  strong,
  esc,
  type RenderedEmail,
} from "@/lib/email/layout";

/**
 * Branded magic-link email for Prother sign-in (sent through Resend from
 * src/lib/auth.ts). Shell and brand rules live in ./layout.ts.
 */

export type SignInEmail = RenderedEmail;

export function renderSignInEmail({
  url,
  email,
  expiresInMinutes = 15,
  origin,
}: {
  url: string;
  email: string;
  expiresInMinutes?: number;
  origin?: string;
}): SignInEmail {
  const { base } = originParts(origin);
  const mins = `${expiresInMinutes} minutes`;
  const subject = "Sign in to Prother";

  const body = [
    heading("Sign in to Prother"),
    lead(`Tap the button to sign in as ${strong(email)}. No password needed.`),
    button(url, "Sign in to Prother"),
    inset([
      { label: "Expires", value: `${mins} after it was sent` },
      { label: "Single use", value: "Opening it a second time shows an error" },
    ]),
    small(esc("Button not working? Paste this link into your browser:")),
    fallbackLink(url),
    closing(
      esc(
        "Didn't ask to sign in? You can ignore this email. Nobody can get into your account without this link."
      )
    ),
  ].join("\n            ");

  const html = renderLayout({
    title: subject,
    preheader: `Your sign-in link for Prother. It works once and expires in ${mins}.`,
    body,
    origin,
  });

  const text = [
    "Sign in to Prother",
    "",
    `Open this link to sign in as ${email}. No password needed.`,
    "",
    url,
    "",
    `The link expires ${mins} after it was sent and works once. Opening it a second time shows an error.`,
    "",
    "Didn't ask to sign in? You can ignore this email. Nobody can get into your account without this link.",
    "",
    `Prother: the curated directory for AI tools. ${base}`,
  ].join("\n");

  return { subject, html, text };
}
