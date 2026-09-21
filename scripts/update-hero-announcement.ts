/**
 * One-shot: update the hero announcement SiteSetting to the open-access copy
 * (waitlist removal — the feed is open from day one). Run from the project
 * root:  bun scripts/update-hero-announcement.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const KEY = "hero.announcement";
const VALUE = "Open now — today's launches are live on the feed";

async function main() {
  const row = await db.siteSetting.upsert({
    where: { key: KEY },
    update: { value: VALUE, updatedAt: new Date() },
    create: { key: KEY, value: VALUE },
  });
  console.log(`✅ ${row.key} = "${row.value}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
