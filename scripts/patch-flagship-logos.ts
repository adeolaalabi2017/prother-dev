/**
 * Script to patch authentic logos for flagship frontier models:
 * chatgpt, claude, gemini, midjourney
 *
 * Adheres strictly to AGENTS.md standards:
 * - NO em-dashes or en-dashes in any comments or text.
 * - Dual-write to Convex and SQLite (db/custom.db).
 * - Authentic vector SVGs committed to public/logos/<slug>.svg.
 *
 * Run: bun scripts/patch-flagship-logos.ts
 */

import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  datasources: {
    db: {
      url: `file:${resolve(process.cwd(), "db/custom.db")}`,
    },
  },
});

const FLAGSHIP_LOGOS: Record<string, string> = {
  chatgpt: "/logos/chatgpt.svg",
  claude: "/logos/claude.svg",
  gemini: "/logos/gemini.svg",
  midjourney: "/logos/midjourney.svg",
};

async function main() {
  console.log("Connecting to Convex client...");
  const convex = createServerConvexClient();
  if (!convex) {
    throw new Error("Could not create Convex client. Check NEXT_PUBLIC_CONVEX_URL.");
  }

  console.log("\n--- Patching Flagship Tool Logos in Convex ---");
  for (const [slug, logoUrl] of Object.entries(FLAGSHIP_LOGOS)) {
    try {
      const page = await convex.query(api.tools.pageData, { slug });
      const toolId = page?.tool?.id;
      if (toolId) {
        await convex.mutation(api.adminCrud.toolPatch, {
          toolLegacyId: toolId,
          data: {},
          logoUrl,
          nowMs: Date.now(),
        });
        console.log(`✓ Convex: Patched ${slug} logoUrl -> ${logoUrl}`);
      } else {
        console.warn(`! Convex: Tool ${slug} not found`);
      }
    } catch (err) {
      console.error(`✗ Convex error for ${slug}:`, err);
    }
  }

  console.log("\n--- Patching Flagship Tool Logos in SQLite (db/custom.db) ---");
  for (const [slug, logoUrl] of Object.entries(FLAGSHIP_LOGOS)) {
    try {
      const existing = await db.tool.findUnique({ where: { slug } });
      if (existing) {
        await db.tool.update({
          where: { slug },
          data: { logoUrl },
        });
        console.log(`✓ SQLite: Patched ${slug} logoUrl -> ${logoUrl}`);
      } else {
        console.warn(`! SQLite: Tool ${slug} not found`);
      }
    } catch (err) {
      console.error(`✗ SQLite error for ${slug}:`, err);
    }
  }

  console.log("\n🎉 Flagship Logos Patched Successfully!");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
