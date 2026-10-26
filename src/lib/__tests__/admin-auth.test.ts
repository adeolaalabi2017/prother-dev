import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

/**
 * Admin-gate tests for src/lib/admin.ts (AGENTS.md §4 fail-closed invariant).
 *
 * The gate combines a constant-time shared key (`x-editor-key` = ADMIN_KEY)
 * with RoleChecked NextAuth sessions (role "admin" + status "active").
 * Everything here is hermetic: @/lib/auth and @/lib/convex are stubbed so no
 * NextAuth runtime or Convex deployment is needed.
 */

const authState = { user: null as null | { email: string; handle: string } };

mock.module("@/lib/auth", () => ({
  getAuthUser: async () => authState.user,
}));

let roleByEmailResult: { role: string; status: string; handle: string } | null =
  null;

mock.module("@/lib/convex", () => ({
  createServerConvexClient: () => ({
    query: async () => roleByEmailResult,
  }),
}));

import {
  isAdmin,
  guard,
  unauthorized,
  sessionAdmin,
  adminActor,
} from "@/lib/admin";

const reqWith = (key?: string): Request =>
  new Request("https://prother.dev/api/admin/overview", {
    headers: key ? { "x-editor-key": key } : {},
  });

let savedAdminKey: string | undefined;
let savedEditorKey: string | undefined;

beforeEach(() => {
  savedAdminKey = process.env.ADMIN_KEY;
  savedEditorKey = process.env.EDITOR_KEY;
  delete process.env.ADMIN_KEY;
  delete process.env.EDITOR_KEY;
  authState.user = null;
  roleByEmailResult = null;
});

afterEach(() => {
  if (savedAdminKey === undefined) delete process.env.ADMIN_KEY;
  else process.env.ADMIN_KEY = savedAdminKey;
  if (savedEditorKey === undefined) delete process.env.EDITOR_KEY;
  else process.env.EDITOR_KEY = savedEditorKey;
});

describe("editorKey fail-closed behavior", () => {
  it("treats a missing ADMIN_KEY as NO valid key", () => {
    expect(isAdmin(reqWith("anything"))).toBe(false);
  });

  it("treats a whitespace-only key as absent", () => {
    process.env.ADMIN_KEY = "   ";
    expect(isAdmin(reqWith("anything"))).toBe(false);
  });

  it("falls back to legacy EDITOR_KEY when ADMIN_KEY is absent", () => {
    process.env.EDITOR_KEY = "legacy-key";
    expect(isAdmin(reqWith("legacy-key"))).toBe(true);
  });

  it("ADMIN_KEY takes precedence over legacy EDITOR_KEY", () => {
    process.env.EDITOR_KEY = "legacy-key";
    process.env.ADMIN_KEY = "current-key";
    expect(isAdmin(reqWith("legacy-key"))).toBe(false);
    expect(isAdmin(reqWith("current-key"))).toBe(true);
  });
});

describe("isAdmin (constant-time shared key)", () => {
  it("accepts the exact key", () => {
    process.env.ADMIN_KEY = "s3cret-key";
    expect(isAdmin(reqWith("s3cret-key"))).toBe(true);
  });

  it("rejects a wrong key", () => {
    process.env.ADMIN_KEY = "s3cret-key";
    expect(isAdmin(reqWith("wrong-key"))).toBe(false);
  });

  it("rejects when no header is supplied", () => {
    process.env.ADMIN_KEY = "s3cret-key";
    expect(isAdmin(reqWith())).toBe(false);
  });

  it("rejects keys of a different length without throwing", () => {
    process.env.ADMIN_KEY = "short";
    expect(isAdmin(reqWith("a-much-longer-wrong-key"))).toBe(false);
    expect(isAdmin(reqWith("x"))).toBe(false);
  });

  it("is prefix-safe (a shorter prefix is rejected)", () => {
    process.env.ADMIN_KEY = "s3cret-key";
    // note: HTTP header parsing strips surrounding whitespace, so trailing
    // spaces never reach the compare; a genuine prefix does.
    expect(isAdmin(reqWith("s3cret"))).toBe(false);
  });
});

describe("sessionAdmin (role-checked NextAuth)", () => {
  it("returns null with no signed-in user", async () => {
    process.env.CONVEX_URL = "http://fake";
    expect(await sessionAdmin(reqWith())).toBeNull();
  });

  it("returns the admin when role is admin and status active", async () => {
    authState.user = { email: "a@prother.dev", handle: "a" };
    roleByEmailResult = { role: "admin", status: "active", handle: "ada" };
    const admin = await sessionAdmin(reqWith());
    expect(admin).toEqual({ handle: "ada", email: "a@prother.dev" });
  });

  it("returns null for non-admin roles", async () => {
    authState.user = { email: "a@prother.dev", handle: "a" };
    roleByEmailResult = { role: "user", status: "active", handle: "a" };
    expect(await sessionAdmin(reqWith())).toBeNull();
  });

  it("returns null for inactive admins (role changes apply immediately)", async () => {
    authState.user = { email: "a@prother.dev", handle: "a" };
    roleByEmailResult = { role: "admin", status: "suspended", handle: "a" };
    expect(await sessionAdmin(reqWith())).toBeNull();
  });
});

describe("guard (OR-combined gate, fail-closed)", () => {
  it("passes through (null) with the correct shared key", async () => {
    process.env.ADMIN_KEY = "s3cret-key";
    expect(await guard(reqWith("s3cret-key"))).toBeNull();
  });

  it("passes through (null) for an active admin session with a wrong key", async () => {
    authState.user = { email: "a@prother.dev", handle: "a" };
    roleByEmailResult = { role: "admin", status: "active", handle: "ada" };
    expect(await guard(reqWith("wrong-key"))).toBeNull();
  });

  it("401s with a wrong key and no session", async () => {
    process.env.ADMIN_KEY = "s3cret-key";
    const res = await guard(reqWith("wrong"));
    expect(res?.status).toBe(401);
    expect(await res?.json()).toEqual({ error: "Unauthorized" });
  });

  it("401s a signed-in NON-admin even with a wrong key", async () => {
    process.env.ADMIN_KEY = "s3cret-key";
    authState.user = { email: "m@prother.dev", handle: "m" };
    roleByEmailResult = { role: "user", status: "active", handle: "m" };
    const res = await guard(reqWith("wrong"));
    expect(res?.status).toBe(401);
  });

  it("401s when there is no key configured and no session", async () => {
    const res = await guard(reqWith("guess"));
    expect(res?.status).toBe(401);
  });

  it("401s even when the key env vars are unset and no credential sent", async () => {
    const res = await guard(reqWith());
    expect(res?.status).toBe(401);
  });
});

describe("adminActor labeling", () => {
  it("labels the session admin by handle over the shared key", async () => {
    process.env.ADMIN_KEY = "s3cret-key";
    authState.user = { email: "a@prother.dev", handle: "a" };
    roleByEmailResult = { role: "admin", status: "active", handle: "ada" };
    expect(await adminActor(reqWith("wrong-key"))).toBe("@ada");
  });

  it("labels the shared key path as 'key'", async () => {
    process.env.ADMIN_KEY = "s3cret-key";
    expect(await adminActor(reqWith("s3cret-key"))).toBe("key");
  });
});

describe("unauthorized response shape", () => {
  it("is a JSON 401 with no fencepost details", () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("json");
  });
});
