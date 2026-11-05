import { describe, it, expect } from "bun:test";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { sanitizeSvg } from "@/lib/sanitize-svg";

describe("Security Fixes", () => {
  describe("safeJsonLd (JSON-LD XSS Prevention)", () => {
    it("escapes < characters to prevent script tag breakout", () => {
      const malicious = {
        name: '</script><script>alert("xss")</script>',
        description: "A tool with <img src=x onerror=alert(1)> in it",
      };
      const result = safeJsonLd(malicious);

      // Must not contain any literal < characters
      expect(result).not.toContain("<");
      expect(result).not.toContain("</script>");
      // Must contain Unicode-escaped version
      expect(result).toContain("\\u003c/script>");
      expect(result).toContain("\\u003cscript>");
    });

    it("preserves valid JSON semantics after parsing", () => {
      const original = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Test Tool",
        offers: { price: "0" },
      };
      const serialized = safeJsonLd(original);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(original);
    });
  });

  describe("sanitizeSvg (SVG XSS Prevention)", () => {
    const sanitize = (svgString: string): string => {
      const bytes = new TextEncoder().encode(svgString);
      const cleaned = sanitizeSvg(bytes);
      return new TextDecoder().decode(cleaned);
    };

    it("removes <script> elements and contents", () => {
      const input = '<svg><script>alert("xss")</script><circle r="5"/></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("<script");
      expect(output).not.toContain("alert");
      expect(output).toContain("<circle");
    });

    it("removes event handler attributes (onload, onclick, onerror)", () => {
      const input = '<svg onload="alert(1)"><circle onclick="evil()" onerror="bad()"/></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("onload");
      expect(output).not.toContain("onclick");
      expect(output).not.toContain("onerror");
      expect(output).toContain("<svg");
      expect(output).toContain("<circle");
    });

    it("defangs javascript: URIs in href and xlink:href", () => {
      const input = '<svg><a href="javascript:alert(1)"><text>link</text></a></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("javascript:");
      expect(output).toContain("#sanitized");
    });

    it("removes <foreignObject> elements that could embed HTML", () => {
      const input = '<svg><foreignObject><div><iframe src="evil.com"/></div></foreignObject></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("<foreignObject");
      expect(output).not.toContain("<iframe");
    });

    it("strips XML external entities (XXE)", () => {
      const input = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg><text>&xxe;</text></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("<!DOCTYPE");
      expect(output).not.toContain("<!ENTITY");
    });

    it("defangs unquoted and XML-entity encoded javascript: URIs", () => {
      const input = '<svg><a href=javascript:alert(1)><circle r="5"/></a><a href="&#x6a;avascript:alert(2)"><text>x</text></a></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("javascript:");
      expect(output).not.toContain("&#x6a;avascript");
      expect(output).toContain("#sanitized");
    });

    it("defangs executable data: URIs and animate href tampering", () => {
      const input = '<svg><a href="data:image/svg+xml,<svg onload=alert(1)>"><text>x</text></a><animate attributeName="href" values="javascript:alert(1)"/></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("data:image/svg+xml");
      expect(output).not.toContain('attributeName="href"');
      expect(output).toContain("#sanitized");
    });

    it("defangs named entity obfuscations in URIs (&colon;, &Tab;, &NewLine;)", () => {
      const input = '<svg><a href="javascript&colon;alert(1)"><text>test1</text></a><a href="jav&Tab;ascript&colon;alert(2)"><text>test2</text></a><a href="vbscript&colon;msgbox(1)"><text>test3</text></a></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("javascript&colon;");
      expect(output).not.toContain("alert");
      expect(output).not.toContain("vbscript&colon;");
      expect(output).toContain("#sanitized");
    });

    it("removes dangerous <style> tags containing external @import or javascript", () => {
      const input = '<svg><style>@import "javascript:alert(1)";</style><circle r="10"/></svg>';
      const output = sanitize(input);
      expect(output).not.toContain("<style");
      expect(output).toContain("<circle");
    });

    it("removes <style> blocks using CSS escapes, comments, or protocol-relative url()", () => {
      for (const css of [
        "@\\69mport 'https://evil.example/x.css';",
        "@im/**/port 'https://evil.example/x.css';",
        "circle{fill:url(//tracker.example/p)}",
        "circle{fill:u\\72l(https://tracker.example/p)}",
      ]) {
        const output = sanitize(`<svg><style>${css}</style><circle r="10"/></svg>`);
        expect(output).not.toContain("<style");
        expect(output).toContain("<circle");
      }
    });

    it("drops style/presentation attributes that fetch external resources but keeps fragment refs", () => {
      const output = sanitize(
        '<svg><rect style="background:url(https://t.example/p)" width="1"/><circle fill="url(//t.example/p)" r="2"/><path fill="url(#grad)" d="M0 0"/></svg>'
      );
      expect(output).not.toContain("t.example");
      expect(output).toContain('width="1"');
      expect(output).toContain('r="2"');
      expect(output).toContain('fill="url(#grad)"');
    });

    it("keeps benign <style> blocks", () => {
      const output = sanitize('<svg><style>.a{fill:#fff}</style><circle class="a" r="10"/></svg>');
      expect(output).toContain("<style>.a{fill:#fff}</style>");
    });

    it("preserves legitimate SVG geometry", () => {
      const input = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/><path d="M10 10 H 90 V 90 H 10 Z"/></svg>';
      const output = sanitize(input);
      expect(output).toContain("<circle");
      expect(output).toContain("<path");
      expect(output).toContain('viewBox="0 0 100 100"');
    });
  });

  describe("sameDomain (Ownership Claim Hijacking Prevention)", () => {
    // Dynamic import to test pure helper
    it("rejects auto-verify for common public webmail domains", async () => {
      const { sameDomain } = await import("@/lib/community");
      // Public email provider vs website on same domain
      expect(sameDomain("attacker@gmail.com", "https://gmail.com")).toBe(false);
      expect(sameDomain("user@yahoo.com", "https://yahoo.com/app")).toBe(false);
      expect(sameDomain("user@proton.me", "https://proton.me")).toBe(false);
    });

    it("rejects auto-verify for shared multi-tenant hosting platforms", async () => {
      const { sameDomain } = await import("@/lib/community");
      expect(sameDomain("maker@github.com", "https://github.com/my-tool")).toBe(false);
      expect(sameDomain("dev@vercel.app", "https://my-tool.vercel.app")).toBe(false);
    });

    it("accepts legitimate custom apex domains", async () => {
      const { sameDomain } = await import("@/lib/community");
      expect(sameDomain("contact@cursor.com", "https://cursor.com")).toBe(true);
      expect(sameDomain("founder@linear.app", "https://linear.app/features")).toBe(true);
    });
  });

  describe("SSRF Protection (isPrivateOrBlockedHost & validateSafeUrl)", () => {
    it("blocks loopback, cloud metadata, and RFC 1918 private IP addresses", async () => {
      const { isPrivateOrBlockedHost } = await import("@/lib/ssrf");
      expect(isPrivateOrBlockedHost("localhost")).toBe(true);
      expect(isPrivateOrBlockedHost("sub.localhost")).toBe(true);
      expect(isPrivateOrBlockedHost("127.0.0.1")).toBe(true);
      expect(isPrivateOrBlockedHost("127.12.34.56")).toBe(true);
      expect(isPrivateOrBlockedHost("169.254.169.254")).toBe(true);
      expect(isPrivateOrBlockedHost("169.254.1.1")).toBe(true);
      expect(isPrivateOrBlockedHost("10.0.0.1")).toBe(true);
      expect(isPrivateOrBlockedHost("172.16.0.1")).toBe(true);
      expect(isPrivateOrBlockedHost("172.31.255.255")).toBe(true);
      expect(isPrivateOrBlockedHost("192.168.1.100")).toBe(true);
      expect(isPrivateOrBlockedHost("0.0.0.0")).toBe(true);
      expect(isPrivateOrBlockedHost("::1")).toBe(true);
      expect(isPrivateOrBlockedHost("service.local")).toBe(true);
      expect(isPrivateOrBlockedHost("database.internal")).toBe(true);
    });

    it("allows legitimate public apex and sub-domains", async () => {
      const { isPrivateOrBlockedHost } = await import("@/lib/ssrf");
      expect(isPrivateOrBlockedHost("prother.dev")).toBe(false);
      expect(isPrivateOrBlockedHost("api.github.com")).toBe(false);
      expect(isPrivateOrBlockedHost("cloudflare.com")).toBe(false);
      expect(isPrivateOrBlockedHost("8.8.8.8")).toBe(false);
    });

    it("validates safe URLs and rejects dangerous protocols / hosts", async () => {
      const { validateSafeUrl } = await import("@/lib/ssrf");
      expect(validateSafeUrl("file:///etc/passwd").ok).toBe(false);
      expect(validateSafeUrl("gopher://127.0.0.1:70").ok).toBe(false);
      expect(validateSafeUrl("ftp://ftp.example.com").ok).toBe(false);
      expect(validateSafeUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
      expect(validateSafeUrl("https://127.0.0.1:8443").ok).toBe(false);
      expect(validateSafeUrl("https://prother.dev/tools").ok).toBe(true);
    });

    it("blocks IPv4-mapped, IPv4-compatible and NAT64 IPv6 in URL-normalized hex form", async () => {
      const { isPrivateOrBlockedHost, validateSafeUrl } = await import("@/lib/ssrf");
      // WHATWG URL rewrites [::ffff:169.254.169.254] to [::ffff:a9fe:a9fe].
      expect(validateSafeUrl("http://[::ffff:169.254.169.254]/latest/meta-data").ok).toBe(false);
      expect(validateSafeUrl("http://[::ffff:127.0.0.1]/").ok).toBe(false);
      expect(isPrivateOrBlockedHost("[::ffff:7f00:1]")).toBe(true);
      expect(isPrivateOrBlockedHost("[0:0:0:0:0:ffff:a00:1]")).toBe(true);
      expect(isPrivateOrBlockedHost("[64:ff9b::a9fe:a9fe]")).toBe(true);
      expect(isPrivateOrBlockedHost("[::7f00:1]")).toBe(true);
      expect(isPrivateOrBlockedHost("[::ffff:808:808]")).toBe(false);
      expect(isPrivateOrBlockedHost("[2606:4700:4700::1111]")).toBe(false);
    });

    it("rejects public hostnames that resolve to private addresses, and fails closed on DNS errors", async () => {
      const { resolvesToPrivateAddress } = await import("@/lib/ssrf");
      expect(await resolvesToPrivateAddress("rebind.example", async () => ["127.0.0.1"])).toBe("resolves_to_private_address");
      expect(await resolvesToPrivateAddress("mixed.example", async () => ["93.184.216.34", "::ffff:a9fe:a9fe"])).toBe("resolves_to_private_address");
      expect(await resolvesToPrivateAddress("ok.example", async () => ["93.184.216.34"])).toBe("public");
      expect(await resolvesToPrivateAddress("empty.example", async () => [])).toBe("dns_lookup_failed");
      expect(await resolvesToPrivateAddress("down.example", async () => { throw new Error("x"); })).toBe("dns_lookup_failed");
    });

    it("safeFetch checks DNS on every redirect hop", async () => {
      const { safeFetch } = await import("@/lib/ssrf");
      const realFetch = globalThis.fetch;
      const calls: string[] = [];
      globalThis.fetch = (async (url: string) => {
        calls.push(String(url));
        return new Response(null, { status: 302, headers: { location: "https://internal.example/" } });
      }) as unknown as typeof fetch;
      try {
        const resolver = async (h: string) => (h === "internal.example" ? ["10.0.0.5"] : ["93.184.216.34"]);
        await expect(safeFetch("https://maker.example/", {}, 3, resolver)).rejects.toThrow(/resolves_to_private_address/);
        expect(calls).toEqual(["https://maker.example/"]);
      } finally {
        globalThis.fetch = realFetch;
      }
    });
  });

  describe("Comment rate limiter", () => {
    it("trusts only cf-connecting-ip, never X-Forwarded-For", async () => {
      const { trustedClientIp } = await import("@/lib/rate-limit");
      expect(trustedClientIp(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4" } }))).toBeNull();
      expect(trustedClientIp(new Request("http://x", { headers: { "cf-connecting-ip": "5.6.7.8" } }))).toBe("5.6.7.8");
    });

    it("cools down a key only after it is recorded", async () => {
      const { isCoolingDown, recordCooldown } = await import("@/lib/rate-limit");
      const key = `test:${crypto.randomUUID()}`;
      expect(await isCoolingDown(key, 15_000)).toBe(false);
      await recordCooldown(key, 15_000);
      expect(await isCoolingDown(key, 15_000)).toBe(true);
      expect(await isCoolingDown(key, 0)).toBe(false);
    });
  });
});
