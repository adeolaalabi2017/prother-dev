import { describe, expect, it } from "bun:test";
import { resolveToolLogoUrl } from "@/components/prother/use-tool-logos";

describe("resolveToolLogoUrl", () => {
  it("prefers the canonical local brand asset for a known slug", () => {
    expect(resolveToolLogoUrl("linear", "https://example.com/linear.png")).toBe(
      "/logos/linear.svg",
    );
  });

  it("uses a supplied listing logo when no local asset is known", () => {
    expect(
      resolveToolLogoUrl("unknown-tool", "https://cdn.example.com/tool.png"),
    ).toBe("https://cdn.example.com/tool.png");
  });

  it("rejects the retired API media URL fallback", () => {
    expect(resolveToolLogoUrl("unknown-tool", "/api/media/legacy")).toBeNull();
  });

  it("returns null when neither a local asset nor a safe fallback exists", () => {
    expect(resolveToolLogoUrl("unknown-tool", null)).toBeNull();
  });
});
