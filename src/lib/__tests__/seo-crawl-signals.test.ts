import { describe, expect, mock, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as schema from "@/lib/d1/schema";
import nextConfig from "../../../next.config";

const sqlite = new Database(":memory:");
const migrations = join(import.meta.dir, "../../../drizzle");
for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
  sqlite.exec(readFileSync(join(migrations, file), "utf8"));
}
const db = drizzle(sqlite, { schema });

mock.module("@/lib/d1/client", () => ({ getD1: async () => db }));
// Never contacted: the D1 read answers first.
process.env.NEXT_PUBLIC_CONVEX_URL ??= "https://convex.invalid";

const { default: sitemap } = await import("@/app/sitemap");

db.insert(schema.categories)
  .values({ id: "c1", slug: "agents", name: "Agents", emoji: "x", sortOrder: 1, featuresJson: "[]" })
  .run();
db.insert(schema.tools)
  .values({
    id: "t1", slug: "dated-tool", name: "Dated", tagline: "t",
    websiteUrl: "https://example.com", logoEmoji: "x", logoGradient: "g",
    pricingModel: "free", hasApi: 0, track: "community", editorsPick: 0,
    curated: 0, claimed: 0, makerHandle: "@m", status: "live", pinned: 0,
    categoryId: "c1", createdAt: Date.UTC(2026, 0, 2),
  })
  .run();

describe("sitemap lastmod", () => {
  test("pages without a known change date carry no lastmod", async () => {
    const entries = await sitemap();
    const dated = entries.filter((e) => e.lastModified !== undefined).map((e) => e.url);
    expect(dated).toEqual([expect.stringMatching(/\/tools\/dated-tool$/)]);
  });
});

describe("generated image routes", () => {
  test.each(["/api/og", "/api/badge/:slug"])("%s is marked noindex", async (source) => {
    const rules = await nextConfig.headers!();
    const headers = rules.filter((r) => r.source === source).flatMap((r) => r.headers);
    expect(headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex" });
  });
});
