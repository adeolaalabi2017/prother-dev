import { describe, it, expect } from "bun:test";
import { bucketDays } from "@/lib/d1/admin-overview";

const today = Date.UTC(2026, 10, 13); // 2026-11-13 00:00 UTC

describe("bucketDays", () => {
  it("puts today in slot 13 and 13 days ago in slot 0", () => {
    const out = bucketDays(
      [
        { day: "2026-11-13", n: 4 },
        { day: "2026-10-31", n: 2 },
        { day: "2026-11-07", n: 653 },
      ],
      today
    );
    expect(out).toHaveLength(14);
    expect(out[13]).toBe(4);
    expect(out[0]).toBe(2);
    expect(out[7]).toBe(653);
    expect(out.reduce((a, b) => a + b, 0)).toBe(659);
  });

  it("ignores days outside the window", () => {
    const out = bucketDays(
      [
        { day: "2026-10-30", n: 9 },
        { day: "2026-11-14", n: 9 },
      ],
      today
    );
    expect(out.every((v) => v === 0)).toBe(true);
  });

  it("coerces string counts from D1", () => {
    const out = bucketDays([{ day: "2026-11-12", n: "3" as unknown as number }], today);
    expect(out[12]).toBe(3);
  });
});
