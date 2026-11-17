import { describe, it, expect, afterEach } from "bun:test";
import { verifyTurnstile, turnstileEnforced } from "@/lib/turnstile";
import { consumeQuota, hashIp } from "@/lib/rate-limit";
import { likeNeedle } from "@/lib/d1/admin-tools";

const ORIGINAL = process.env.TURNSTILE_SECRET_KEY;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = ORIGINAL;
});

const fakeFetch = (body: unknown, captured?: { form?: URLSearchParams }) =>
  (async (_url: unknown, init?: { body?: unknown }) => {
    if (captured) captured.form = init?.body as URLSearchParams;
    return new Response(JSON.stringify(body));
  }) as unknown as typeof fetch;

describe("verifyTurnstile", () => {
  it("passes everything when no secret is configured", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(turnstileEnforced()).toBe(false);
    expect(await verifyTurnstile(undefined, null)).toEqual({ ok: true });
  });

  it("rejects a missing token when enforced", async () => {
    process.env.TURNSTILE_SECRET_KEY = "s";
    const r = await verifyTurnstile(undefined, null, fakeFetch({ success: true }));
    expect(r.ok).toBe(false);
  });

  it("accepts a token Cloudflare confirms and sends secret, token and IP", async () => {
    process.env.TURNSTILE_SECRET_KEY = "s3cret";
    const cap: { form?: URLSearchParams } = {};
    const r = await verifyTurnstile("tok", "203.0.113.9", fakeFetch({ success: true }, cap));
    expect(r).toEqual({ ok: true });
    expect(cap.form?.get("secret")).toBe("s3cret");
    expect(cap.form?.get("response")).toBe("tok");
    expect(cap.form?.get("remoteip")).toBe("203.0.113.9");
  });

  it("rejects a token Cloudflare refuses", async () => {
    process.env.TURNSTILE_SECRET_KEY = "s";
    const r = await verifyTurnstile(
      "tok",
      null,
      fakeFetch({ success: false, "error-codes": ["invalid-input-response"] })
    );
    expect(r).toEqual({ ok: false, reason: "invalid-input-response" });
  });

  it("fails closed when siteverify is unreachable", async () => {
    process.env.TURNSTILE_SECRET_KEY = "s";
    const broken = (async () => {
      throw new Error("down");
    }) as unknown as typeof fetch;
    expect((await verifyTurnstile("tok", null, broken)).ok).toBe(false);
  });
});

describe("consumeQuota (memory fallback)", () => {
  it("allows up to the limit, then refuses", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await consumeQuota(key, 5, 60_000));
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("keeps separate keys apart", async () => {
    const a = `test:${crypto.randomUUID()}`;
    const b = `test:${crypto.randomUUID()}`;
    expect(await consumeQuota(a, 1, 60_000)).toBe(true);
    expect(await consumeQuota(a, 1, 60_000)).toBe(false);
    expect(await consumeQuota(b, 1, 60_000)).toBe(true);
  });
});

describe("hashIp", () => {
  it("is stable and never contains the raw address", async () => {
    const h = await hashIp("203.0.113.9");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await hashIp("203.0.113.9"));
    expect(h).not.toContain("203");
  });
});

describe("likeNeedle", () => {
  it("lowercases and escapes LIKE wildcards", () => {
    expect(likeNeedle("Jev")).toBe("%jev%");
    expect(likeNeedle("100%_x")).toBe("%100\\%\\_x%");
  });
});

describe("chunk", () => {
  it("splits a 200-id page into batches under D1's 100-parameter cap", async () => {
    const { chunk } = await import("@/lib/d1/admin-tools");
    const ids = Array.from({ length: 200 }, (_, i) => `t${i}`);
    const parts = chunk(ids, 90);
    expect(parts.map((p) => p.length)).toEqual([90, 90, 20]);
    expect(parts.flat()).toEqual(ids);
    expect(chunk([], 90)).toEqual([]);
  });
});

describe("describeTurnstileError", () => {
  it("names site-side problems so the owner can act", async () => {
    const { describeTurnstileError } = await import("@/lib/turnstile-errors");
    expect(describeTurnstileError("110200")).toContain("site owner");
    expect(describeTurnstileError("110100")).toContain("site owner");
  });
  it("points browser-side failures at the browser", async () => {
    const { describeTurnstileError } = await import("@/lib/turnstile-errors");
    expect(describeTurnstileError("600010")).toContain("browser");
    expect(describeTurnstileError("300030")).toContain("browser");
    expect(describeTurnstileError("script-blocked")).toContain("blocking");
    expect(describeTurnstileError("200100")).toContain("clock");
    expect(describeTurnstileError("999999")).toContain("Try again");
  });
  it("uses no em or en dashes", async () => {
    const { describeTurnstileError } = await import("@/lib/turnstile-errors");
    for (const c of ["110200", "110100", "110500", "110510", "200100", "106010", "102001", "600010", "script-blocked", "x"]) {
      expect(describeTurnstileError(c)).not.toMatch(/[–—]/);
    }
  });
});
