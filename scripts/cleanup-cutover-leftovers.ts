/**
 * Cutover leftovers cleanup (one-shot, idempotent).
 *
 * 1. Removes retired `backend.*` flag keys from Convex siteSettings and the
 *    Prisma custom.db backup (no readers remain since the flag module was
 *    deleted).
 * 2. Erases the `convex-test@example.com` verification user (Convex row +
 *    sessions/tokens) created during the Auth-phase live test.
 *
 * Usage: node scripts/cleanup-cutover-leftovers.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

function loadDotLocal(path: string): void {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadDotLocal(join(root, ".env.local"));
loadDotLocal(join(root, ".env"));

const CONVEX_URL = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").trim();
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set — is `npx convex dev` running?");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// 1a. Convex backend.* keys.
const settings = await client.query(api.adminCrud.settingsTable, {});
const deadConvex = Object.keys(settings.settings).filter((k) =>
  k.startsWith("backend."),
);
if (deadConvex.length > 0) {
  const res = await client.mutation(api.adminCrud.settingsRemove, {
    keys: deadConvex,
  });
  console.log(`convex: removed ${res.removed} backend.* keys`);
} else {
  console.log("convex: no backend.* keys left");
}

// 1b. Prisma backup backend.* keys.
const db = new PrismaClient();
const deadPrisma = await db.siteSetting.findMany({
  where: { key: { startsWith: "backend." } },
  select: { key: true },
});
if (deadPrisma.length > 0) {
  const res = await db.siteSetting.deleteMany({
    where: { key: { startsWith: "backend." } },
  });
  console.log(`prisma: removed ${res.count} backend.* keys`);
} else {
  console.log("prisma: no backend.* keys left");
}
await db.$disconnect();

// 2. Verification test user.
try {
  const res = await client.mutation(api.authStore.authUserDeleteFull, {
    id: "convex-test@example.com",
  });
  console.log("test user erased:", res.removed);
} catch (err) {
  if (err instanceof Error && err.message.includes("user_not_found")) {
    console.log("test user already gone");
  } else {
    throw err;
  }
}
