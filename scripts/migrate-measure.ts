/**
 * One-off migration (Task 28, P4 measurement) — run with:
 *   bun run scripts/migrate-measure.ts
 * Adds: AdCampaign.viewableImpressions, AdServeStat, PageViewDaily.
 * Idempotent — safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Column add (SQLite has no IF NOT EXISTS for columns — check first).
  const cols = await db.$queryRaw<{ name: string }[]>`
    PRAGMA table_info("AdCampaign")`;
  if (!cols.some((c) => c.name === "viewableImpressions")) {
    await db.$executeRawUnsafe(
      `ALTER TABLE "AdCampaign" ADD COLUMN "viewableImpressions" INTEGER NOT NULL DEFAULT 0`
    );
    console.log("+ AdCampaign.viewableImpressions");
  } else {
    console.log("· AdCampaign.viewableImpressions exists");
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AdServeStat" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "placement" TEXT NOT NULL,
      "day" TEXT NOT NULL,
      "served" INTEGER NOT NULL DEFAULT 0,
      "house" INTEGER NOT NULL DEFAULT 0,
      "unfilled" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )`);
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "AdServeStat_placement_day_key" ON "AdServeStat"("placement", "day")`
  );
  console.log("+ AdServeStat table + unique(placement, day)");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PageViewDaily" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "path" TEXT NOT NULL,
      "day" TEXT NOT NULL,
      "views" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL
    )`);
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "PageViewDaily_path_day_key" ON "PageViewDaily"("path", "day")`
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PageViewDaily_day_idx" ON "PageViewDaily"("day")`
  );
  console.log("+ PageViewDaily table + unique(path, day) + day index");

  // Sanity readback.
  const tables = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('AdServeStat', 'PageViewDaily')`;
  console.log("tables now:", tables.map((t) => t.name).join(", "));
}

main()
  .catch((e) => {
    console.error("MIGRATION FAILED:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
