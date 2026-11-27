import { describe, it, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "../../..");

function tool(id: string, name: string, status: string) {
  return {
    _id: id, slug: id, name, tagline: "t", websiteUrl: "https://example.com",
    logoEmoji: "x", logoGradient: "g", pricingModel: "free", hasApi: false,
    track: "community", editorsPick: false, curated: false, claimed: false,
    makerHandle: "@m", status, pinned: 0, categoryId: "cat",
    commentCount: 0, reviewCount: 0, ratingSumX100: 0, createdAt: 1,
  };
}

/** Run the real importer over a snapshot and apply its SQL to `db`. */
function resync(db: Database, docs: object[]) {
  const dir = mkdtempSync(join(tmpdir(), "resync-"));
  try {
    mkdirSync(join(dir, "tools"));
    writeFileSync(join(dir, "tools/documents.jsonl"), docs.map((d) => JSON.stringify(d)).join("\n"));
    const sql = join(dir, "import.sql");
    const run = Bun.spawnSync(["bun", join(root, "scripts/import-convex-to-d1.ts"), dir, sql]);
    expect(run.exitCode).toBe(0);
    db.exec(readFileSync(sql, "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function freshDb() {
  const db = new Database(":memory:");
  const migrations = join(root, "drizzle");
  for (const file of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
    db.exec(readFileSync(join(migrations, file), "utf8"));
  }
  return db;
}

const row = (db: Database, id: string) =>
  db.query("select name, status from tools where id = ?").get(id);

describe("Convex to D1 resync", () => {
  it("keeps a tool removed in D1 even when Convex still says live", () => {
    const db = freshDb();
    resync(db, [tool("gone", "Old name", "live")]);
    db.exec("update tools set status = 'removed' where id = 'gone'");

    resync(db, [tool("gone", "New name", "live")]);

    expect(row(db, "gone")).toEqual({ name: "New name", status: "removed" });
  });

  it("still syncs status for tools that are not removed, and inserts new ones", () => {
    const db = freshDb();
    resync(db, [tool("kept", "Kept", "draft")]);

    resync(db, [tool("kept", "Kept", "live"), tool("fresh", "Fresh", "live")]);

    expect(row(db, "kept")).toEqual({ name: "Kept", status: "live" });
    expect(row(db, "fresh")).toEqual({ name: "Fresh", status: "live" });
  });
});
