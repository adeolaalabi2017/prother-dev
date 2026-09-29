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

const LOGO_UPDATES: Record<string, string> = {
  openchamber: "/logos/openchamber.svg",
  nebula: "/logos/nebula.svg",
  "open-slide": "/logos/open-slide.png",
  paperclip: "/logos/paperclip.svg",
  linear: "/logos/linear.svg",
  openviking: "/logos/openviking.png",
  "julia-1": "/logos/julia-1.svg",
  jev: "/logos/jev.png",
  supermemory: "/logos/supermemory.svg",
  antigravity: "/logos/antigravity.png",
  aider: "/logos/aider.png",
  cursor: "/logos/cursor.svg",
  windsurf: "/logos/windsurf.svg",
  vllm: "/logos/vllm.svg",
};

async function main() {
  console.log("Connecting to Convex...");
  const convex = createServerConvexClient();
  if (!convex) throw new Error("No convex client");

  for (const [slug, logoUrl] of Object.entries(LOGO_UPDATES)) {
    console.log(`\nPatching ${slug} with logoUrl: ${logoUrl}...`);
    try {
      const page = await convex.query(api.tools.pageData, { slug });
      if (!page?.tool?.id) {
        console.warn(`Tool ${slug} not found in Convex!`);
        continue;
      }
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: page.tool.id,
        data: {},
        logoUrl,
        nowMs: Date.now(),
      });
      console.log(`✓ Convex: Patched ${slug} -> ${logoUrl}`);
    } catch (err) {
      console.error(`✗ Error patching ${slug} in Convex:`, err);
    }

    try {
      await db.tool.update({
        where: { slug },
        data: { logoUrl },
      });
      console.log(`✓ SQLite: Patched ${slug} -> ${logoUrl}`);
    } catch (err) {
      console.error(`✗ Error patching ${slug} in SQLite:`, err);
    }
  }

  // Verification
  console.log("\n==========================================");
  console.log("Verifying updated tool logos in Convex...");
  console.log("==========================================");

  const dir = await convex.query(api.tools.directory, { page: 1, pageSize: 100, sort: "newest" });
  const rows = "rows" in dir && Array.isArray(dir.rows) ? dir.rows : [];
  for (const [slug, expectedUrl] of Object.entries(LOGO_UPDATES)) {
    const row = rows.find((r) => r.slug === slug);
    console.log(`${slug.padEnd(20)} -> ${row?.logoUrl === expectedUrl ? "✓ MATCH" : "✗ MISMATCH"}: ${row?.logoUrl}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
