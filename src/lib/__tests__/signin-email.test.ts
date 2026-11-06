import { describe, it, expect } from "bun:test";
import { renderSignInEmail } from "@/lib/email/signin-email";

const URL_WITH_QUERY =
  "https://prother.dev/api/auth/callback/email?callbackUrl=https%3A%2F%2Fprother.dev%2F&token=abc123&email=maker%40example.com";

describe("renderSignInEmail", () => {
  const mail = renderSignInEmail({
    url: URL_WITH_QUERY,
    email: "maker@example.com",
    expiresInMinutes: 15,
    origin: "https://prother.dev/",
  });

  it("uses the Prother subject and brand mark", () => {
    expect(mail.subject).toBe("Sign in to Prother");
    expect(mail.html).toContain('src="https://prother.dev/email/prother-mark.png"');
    expect(mail.html).toContain(">prother.dev</a>");
  });

  it("puts the escaped magic link in both the button and the fallback", () => {
    const escaped = URL_WITH_QUERY.replace(/&/g, "&amp;");
    expect(mail.html.split(`href="${escaped}"`).length - 1).toBe(2);
    expect(mail.html).not.toContain(`href="${URL_WITH_QUERY}"`);
  });

  it("quotes the expiry and single-use behaviour", () => {
    expect(mail.html).toContain("15 minutes after it was sent");
    expect(mail.text).toContain("expires 15 minutes after it was sent and works once");
  });

  it("ships a plain-text part with the raw link", () => {
    expect(mail.text).toContain(URL_WITH_QUERY);
    expect(mail.text).toContain("maker@example.com");
  });

  it("escapes a hostile address and link", () => {
    const evil = renderSignInEmail({
      url: 'https://prother.dev/x?"><script>alert(1)</script>',
      email: '"><img src=x onerror=alert(1)>@example.com',
      origin: "https://prother.dev",
    });
    expect(evil.html).not.toContain("<script>");
    expect(evil.html).not.toContain("<img src=x");
    expect(evil.html).toContain("&lt;script&gt;");
  });

  it("follows the copy rule: no em or en dashes", () => {
    expect(mail.html).not.toMatch(/[–—]/);
    expect(mail.text).not.toMatch(/[–—]/);
  });
});
