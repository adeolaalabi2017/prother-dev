import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./db/custom.db" } },
});

async function main() {
  const convex = createServerConvexClient();
  if (!convex) throw new Error("No convex client");

  console.log("Reading aider.png...");
  const bytes = readFileSync("public/logos/aider.png");

  console.log("Requesting upload URL from Convex...");
  const uploadUrl: string = await convex.mutation(api.media.mediaUploadUrl, {});
  console.log("Uploading bytes to Convex storage...");
  const put = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });

  if (!put.ok) {
    throw new Error(`Upload failed: ${put.status} ${await put.text()}`);
  }

  const { storageId } = (await put.json()) as { storageId: string };
  console.log("Uploaded storageId:", storageId);
  const logoUrl = `https://befitting-moose-925.convex.cloud/api/storage/${storageId}`;
  console.log("Storage logoUrl:", logoUrl);

  // Find Aider
  const dir = await convex.query(api.tools.directory, { page: 1, pageSize: 100, sort: "newest" });
  const aider = "rows" in dir && Array.isArray(dir.rows) ? dir.rows.find((r) => r.slug === "aider") : null;
  if (!aider) throw new Error("Aider not found in Convex directory");

  const page = await convex.query(api.tools.pageData, { slug: "aider" });
  const toolId = page?.tool?.id || "cmucr_aider_0dph55o";

  console.log(`Patching Aider (${toolId}) with logoUrl...`);
  await convex.mutation(api.adminCrud.toolPatch, {
    toolLegacyId: toolId,
    data: {},
    logoUrl,
    nowMs: Date.now(),
  });
  console.log("✓ Patched Convex tool successfully!");

  // Also update SQLite if present
  try {
    const existing = await db.tool.findUnique({ where: { slug: "aider" } });
    if (existing) {
      await db.tool.update({
        where: { slug: "aider" },
        data: { logoUrl },
      });
      console.log("✓ Updated SQLite tool with logoUrl");
    } else {
      console.log("ℹ Aider not found in SQLite, skipping SQLite update");
    }
  } catch (err) {
    console.warn("SQLite update skipped:", err);
  }

  // Verify
  const verified = await convex.query(api.tools.detail, { slug: "aider" });
  console.log("Verified Aider detail logoUrl:", verified?.logoUrl);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
