import { describe, it, expect } from "bun:test";
import { renderApprovalEmail, renderRejectionEmail } from "@/lib/email/decision-email";

const origin = "https://prother.dev/";

describe("renderApprovalEmail", () => {
  const mail = renderApprovalEmail({ toolName: "Acme AI", slug: "acme-ai", origin });

  it("names the tool and links the live listing", () => {
    expect(mail.subject).toBe("Acme AI is live on Prother");
    expect(mail.html).toContain('href="https://prother.dev/tools/acme-ai"');
    expect(mail.text).toContain("https://prother.dev/tools/acme-ai");
    expect(mail.html).toContain('src="https://prother.dev/email/prother-mark.png"');
  });

  it("points replies at the makers inbox", () => {
    expect(mail.html).toContain("mailto:makers@prother.dev");
  });
});

describe("renderRejectionEmail", () => {
  const mail = renderRejectionEmail({
    toolName: "Acme AI",
    failedStandards: ["S5", "S1"],
    note: "Domain flagged by two resolvers",
    origin,
  });

  it("lists each failed standard with its meaning, in S order", () => {
    expect(mail.html).toContain("Live &amp; accessible");
    expect(mail.html).toContain("Safe &amp; legal");
    expect(mail.html.indexOf(">S1<")).toBeLessThan(mail.html.indexOf(">S5<"));
    expect(mail.html).not.toContain(">S3<");
    expect(mail.text).toContain("- S1 Live & accessible:");
    expect(mail.text).toContain("- S5 Safe & legal:");
    expect(mail.text).toContain("missed 2 standards");
  });

  it("includes the editor's note and the resubmit link", () => {
    expect(mail.html).toContain("Domain flagged by two resolvers");
    expect(mail.html).toContain('href="https://prother.dev/submit"');
    expect(mail.text).toContain("Editor's note: Domain flagged by two resolvers");
  });

  it("omits the note panel when there is no note", () => {
    const bare = renderRejectionEmail({ toolName: "Acme AI", failedStandards: ["S2"], origin });
    expect(bare.html).not.toContain("Editor's note");
    expect(bare.html).not.toContain("Editor&#39;s note");
    expect(bare.text).toContain("missed one standard");
  });

  it("escapes hostile tool names and notes", () => {
    const evil = renderRejectionEmail({
      toolName: "<script>alert(1)</script>",
      failedStandards: ["S4"],
      note: '"><img src=x onerror=alert(1)>',
      origin,
    });
    expect(evil.html).not.toContain("<script>");
    expect(evil.html).not.toContain("<img src=x");
  });
});

describe("copy rule", () => {
  it("has no em or en dashes in either email", () => {
    const a = renderApprovalEmail({ toolName: "Acme AI", slug: "acme-ai", origin });
    const r = renderRejectionEmail({ toolName: "Acme AI", failedStandards: ["S1", "S2", "S3", "S4", "S5", "S6"], note: "x", origin });
    for (const m of [a, r]) {
      expect(m.html).not.toMatch(/[–—]/);
      expect(m.text).not.toMatch(/[–—]/);
      expect(m.subject).not.toMatch(/[–—]/);
    }
  });
});
