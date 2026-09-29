/**
 * Migration script: Add "ai-models" category and categorize all AI models under it.
 * Dual-writes to both Convex and SQLite (db/custom.db).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";

const db = new PrismaClient({
  datasources: {
    db: {
      url: `file:${resolve(process.cwd(), "db/custom.db")}`,
    },
  },
});

const AI_MODELS_CATEGORY = {
  legacyId: "cmucrh2nz0007kji8aimodels0",
  slug: "ai-models",
  name: "AI Models",
  emoji: "🧠",
  sortOrder: 0,
  featuresPipe: "Context Window|Parameters|Modality|Licensing|API Availability|Local Deployment",
};

const MODEL_SLUGS = [
  "julia-1",
  "naive-n0-5-flash",
  "minimax-m3-1-flash",
  "mimo-v2-6",
  "jev",
  "chatgpt",
  "claude",
  "gemini",
];

async function main() {
  console.log("=== STEP 1: Updating SQLite Category ===");
  const existingCat = await db.category.findUnique({
    where: { slug: AI_MODELS_CATEGORY.slug },
  });

  let sqliteCatId = existingCat?.id;
  if (!existingCat) {
    const created = await db.category.create({
      data: {
        id: AI_MODELS_CATEGORY.legacyId,
        slug: AI_MODELS_CATEGORY.slug,
        name: AI_MODELS_CATEGORY.name,
        emoji: AI_MODELS_CATEGORY.emoji,
        sortOrder: AI_MODELS_CATEGORY.sortOrder,
        features: AI_MODELS_CATEGORY.featuresPipe,
      },
    });
    sqliteCatId = created.id;
    console.log("Created SQLite category:", created.name, created.id);
  } else {
    console.log("SQLite category already exists:", existingCat.name, existingCat.id);
  }

  console.log("=== STEP 2: Updating Convex Category ===");
  const client = createServerConvexClient()!;
  const convexCat = await client.mutation(api.adminCrud.categoryUpsert, {
    legacyId: sqliteCatId!,
    slug: AI_MODELS_CATEGORY.slug,
    name: AI_MODELS_CATEGORY.name,
    emoji: AI_MODELS_CATEGORY.emoji,
    sortOrder: AI_MODELS_CATEGORY.sortOrder,
    featuresPipe: AI_MODELS_CATEGORY.featuresPipe,
  });
  console.log("Convex category upserted:", convexCat);

  console.log("=== STEP 3: Re-categorizing models in SQLite ===");
  for (const slug of MODEL_SLUGS) {
    const res = await db.tool.updateMany({
      where: { slug },
      data: { categoryId: sqliteCatId! },
    });
    console.log(`SQLite tool ${slug} updated:`, res.count);
  }

  console.log("=== STEP 4: Re-categorizing models in Convex ===");
  const allTools = await client.query(api.admin.toolsTable, { q: "", status: "all", category: "" });
  const toolList = allTools.tools || [];
  for (const slug of MODEL_SLUGS) {
    const t = toolList.find((r: any) => r.slug === slug);
    if (!t) {
      console.warn(`Tool ${slug} not found in Convex!`);
      continue;
    }
    await client.mutation(api.adminCrud.toolPatch, {
      toolLegacyId: t.id,
      data: {
        categoryLegacyId: sqliteCatId!,
      },
      nowMs: Date.now(),
    });
    console.log(`Convex tool ${slug} (${t.id}) category updated to ${sqliteCatId}`);
  }

  console.log("=== STEP 5: Verification ===");
  const verifyCompare = await client.query(api.compare.categories, {});
  console.log("Convex categories:", verifyCompare.find((c: any) => c.slug === "ai-models"));

  const verifyTools = await db.tool.findMany({
    where: { categoryId: sqliteCatId! },
    select: { slug: true, name: true },
  });
  console.log("SQLite tools under ai-models:", verifyTools);

  await db.$disconnect();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
