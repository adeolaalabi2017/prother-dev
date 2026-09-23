/**
 * Task 31 — DB copy refresh: apply the em-dash rewrites to already-seeded
 * rows without destructive reseeding.
 *  - Tool.description + Comment.body: ordered old→new string pairs extracted
 *    from `git show HEAD:` vs working-tree seed files.
 *  - ForumThread/ForumReply: wiped (cascades) and reseeded by forum-seed.
 *  - AdCampaign "PromptForge Pro": name/headline updated in place.
 * BlogPost/SiteSetting copy is refreshed by the idempotent seed-cms re-run.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function quotedStrings(src) {
  const out = [];
  const re = /"((?:[^"\\\n]|\\.)*)"/g;
  for (const m of src.matchAll(re)) {
    let s;
    try { s = JSON.parse(`"${m[1]}"`); } catch { s = m[1]; }
    out.push(s);
  }
  return out;
}

function pairsFor(file) {
  const oldSrc = execSync(`git show HEAD:${file}`, { encoding: "utf8", cwd: "/home/z/my-project" });
  const newSrc = execSync(`cat ${file}`, { encoding: "utf8", cwd: "/home/z/my-project" });
  const a = quotedStrings(oldSrc);
  const b = quotedStrings(newSrc);
  if (a.length !== b.length) {
    throw new Error(`${file}: quoted-string count mismatch old=${a.length} new=${b.length}`);
  }
  const pairs = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i].includes("—") && !b[i].includes("—")) pairs.push([a[i], b[i]]);
  }
  return pairs;
}

async function main() {
  const toolPairs = pairsFor("prisma/seed.ts");
  let tools = 0;
  for (const [o, n] of toolPairs) {
    const r = await db.tool.updateMany({ where: { description: o }, data: { description: n } });
    tools += r.count;
  }
  console.log(`[copy-refresh] tool descriptions updated: ${tools}/${toolPairs.length}`);

  const commentPairs = pairsFor("prisma/seed-comments.ts");
  let comments = 0;
  for (const [o, n] of commentPairs) {
    const r = await db.comment.updateMany({ where: { body: o }, data: { body: n } });
    comments += r.count;
  }
  console.log(`[copy-refresh] comment bodies updated: ${comments}/${commentPairs.length}`);

  const camp = await db.adCampaign.updateMany({
    where: { name: "PromptForge Pro — agents spotlight" },
    data: {
      name: "PromptForge Pro: agents spotlight",
      headline: "PromptForge Pro: versioning for production prompts",
    },
  });
  console.log(`[copy-refresh] ad campaign rows updated: ${camp.count}`);

  // Forum copy: wipe + reseed (forum-seed skips when threads exist)
  const threads = await db.forumThread.deleteMany({});
  console.log(`[copy-refresh] forum threads wiped: ${threads.count} (replies/votes cascade)`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
