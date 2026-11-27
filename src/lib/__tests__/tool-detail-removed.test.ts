import { describe, expect, mock, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as schema from "@/lib/d1/schema";

const sqlite = new Database(":memory:");
const migrations = join(import.meta.dir, "../../../drizzle");
for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
  sqlite.exec(readFileSync(join(migrations, file), "utf8"));
}
const db = drizzle(sqlite, { schema });

mock.module("@/lib/d1/client", () => ({ getD1: async () => db }));

const { d1ToolDetail } = await import("@/lib/d1/content");

db.insert(schema.categories)
  .values({ id: "c1", slug: "agents", name: "Agents", emoji: "x", sortOrder: 1, featuresJson: "[]" })
  .run();
for (const status of ["live", "removed", "draft"]) {
  db.insert(schema.tools)
    .values({
      id: status, slug: `${status}-tool`, name: status, tagline: "t",
      websiteUrl: "https://example.com", logoEmoji: "x", logoGradient: "g",
      pricingModel: "free", hasApi: 0, track: "community", editorsPick: 0,
      curated: 0, claimed: 0, makerHandle: "@m", status, pinned: 0,
      categoryId: "c1", createdAt: 1,
    })
    .run();
}

describe("d1ToolDetail", () => {
  test("returns a live tool", async () => {
    expect(await d1ToolDetail("live-tool")).toMatchObject({ slug: "live-tool" });
  });

  test.each(["removed", "draft"])("reports a %s tool as not found", async (status) => {
    expect(await d1ToolDetail(`${status}-tool`)).toEqual({ error: "Tool not found" });
  });
});
