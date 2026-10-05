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

    it("preserves legitimate SVG geometry", () => {
      const input = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/><path d="M10 10 H 90 V 90 H 10 Z"/></svg>';
      const output = sanitize(input);
      expect(output).toContain("<circle");
      expect(output).toContain("<path");
      expect(output).toContain('viewBox="0 0 100 100"');
    });
  });
});
