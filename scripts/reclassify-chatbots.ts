/**
 * Reclassify conversational chatbots (ChatGPT, Claude, Gemini)
 * from "ai-models" to "conversational-ai".
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

const CONVERSATIONAL_CATEGORY = {
  legacyId: "cmucrh2nj0000kji8o4lndfc1",
  slug: "conversational-ai",
  name: "Conversational AI & Chatbots",
};

const CHATBOT_SLUGS = ["chatgpt", "claude", "gemini"];

async function main() {
  console.log("Starting chatbot reclassification dual-write...");

  // 1. Update SQLite
  console.log("Updating SQLite database (db/custom.db)...");
  for (const slug of CHATBOT_SLUGS) {
    const updated = await db.tool.update({
      where: { slug },
      data: { categoryId: CONVERSATIONAL_CATEGORY.legacyId },
    });
    console.log(`SQLite: Updated ${slug} -> category ${updated.categoryId}`);
  }

  // 2. Update Convex
  console.log("Updating Convex production reactive store...");
  const client = createServerConvexClient()!;

  const allTools = await client.query(api.admin.toolsTable, { q: "", status: "all", category: "" });
  const toolList = allTools.tools || [];

  for (const slug of CHATBOT_SLUGS) {
    const t = toolList.find((r: any) => r.slug === slug);
    if (!t) {
      console.warn(`Tool ${slug} not found in Convex!`);
      continue;
    }
    await client.mutation(api.adminCrud.toolPatch, {
      toolLegacyId: t.id,
      data: {
        categoryLegacyId: CONVERSATIONAL_CATEGORY.legacyId,
      },
      nowMs: Date.now(),
    });
    console.log(`Convex tool ${slug} (${t.id}) category updated to ${CONVERSATIONAL_CATEGORY.legacyId}`);
  }

  // Verification
  console.log("\n--- Verification ---");
  const verifiedChatbots = await client.query(api.categories.detail, { slug: "conversational-ai" });
  if (verifiedChatbots && !("error" in verifiedChatbots)) {
    console.log(`Convex conversational-ai toolCount: ${verifiedChatbots.tools.length}`);
    console.log(`Convex conversational-ai tools:`, verifiedChatbots.tools.map((t: any) => t.slug));
  }

  const verifiedModels = await client.query(api.categories.detail, { slug: "ai-models" });
  if (verifiedModels && !("error" in verifiedModels)) {
    console.log(`Convex ai-models toolCount: ${verifiedModels.tools.length}`);
    console.log(`Convex ai-models tools:`, verifiedModels.tools.map((t: any) => t.slug));
  }

  console.log("\nReclassification completed successfully!");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
