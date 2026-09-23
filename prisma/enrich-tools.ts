/**
 * Editorial enrichment runner (Task 35) — applies prisma/editorial-data-*.ts
 * content to the Tool table's post-boot columns. Idempotent: safe to re-run,
 * every apply refreshes contentUpdatedAt + pricingCheckedAt.
 *
 * Run:  bun prisma/enrich-tools.ts
 *
 * Post-boot columns are invisible to the cached Prisma client types, so all
 * writes go through $executeRawUnsafe with the .env DATABASE_URL.
 * No em dashes in stored copy (repo rule) — enforced by a guard below.
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import type { EditorialEntry } from "./editorial-types";
import { ENTRIES_A } from "./editorial-data-a";
import { ENTRIES_B } from "./editorial-data-b";

config();

const ALL: EditorialEntry[] = [...ENTRIES_A, ...ENTRIES_B];

/** Repo-wide em-dash ban: fail loudly instead of storing bad copy. */
for (const e of ALL) {
  const texts = [
    e.longDescription,
    ...e.useCases.flatMap((u) => [u.title, u.body]),
    ...e.pros,
    ...e.cons,
    ...(e.pricing?.note ? [e.pricing.note] : []),
  ];
  if (texts.some((t) => /[\u2014\u2013]/.test(t ?? ""))) {
    console.error(`✗ ${e.slug}: em/en dash found in copy. Fix the data file.`);
    process.exit(1);
  }
}

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const rows = (await db.$queryRawUnsafe<{ slug: string }[]>(
    "SELECT slug FROM Tool"
  )) as { slug: string }[];
  const known = new Set(rows.map((r) => r.slug));

  // Alternative slugs must point at real, different listings.
  for (const e of ALL) {
    if (!known.has(e.slug)) {
      console.warn(`⚠ skip ${e.slug}: not in the tools table`);
    }
    for (const alt of e.alternatives) {
      if (alt === e.slug || !known.has(alt)) {
        console.error(
          `✗ ${e.slug}: alternative "${alt}" is not a different directory slug`
        );
        process.exit(1);
      }
    }
  }

  let applied = 0;
  for (const e of ALL) {
    if (!known.has(e.slug)) continue;
    await db.$executeRawUnsafe(
      `UPDATE Tool SET
         longDescription = ?,
         useCases = ?,
         pros = ?,
         cons = ?,
         alternatives = ?,
         pricingModel = COALESCE(?, pricingModel),
         startingPrice = COALESCE(?, startingPrice),
         pricingNote = ?,
         pricingCheckedAt = ?,
         contentUpdatedAt = ?
       WHERE slug = ?`,
      e.longDescription,
      JSON.stringify(e.useCases),
      JSON.stringify(e.pros),
      JSON.stringify(e.cons),
      e.alternatives.join("|"),
      e.pricing?.model ?? null,
      e.pricing?.startingPrice ?? null,
      e.pricing?.note ?? null,
      new Date(),
      new Date(),
      e.slug
    );
    applied += 1;
  }
  console.log(`✓ enriched ${applied}/${ALL.length} tools with editorial content`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
