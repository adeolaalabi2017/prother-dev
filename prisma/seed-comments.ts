/**
 * Prother seed — launch discussion starter comments.
 * Idempotent: no-ops when any comments already exist.
 * Run: bun prisma/seed-comments.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type SeedComment = { tool: string; author: string; body: string; isMaker?: boolean };

const comments: SeedComment[] = [
  {
    tool: "promptly",
    author: "@dana",
    isMaker: true,
    body: "Maker here — the citation engine now cross-checks every claim against two sources. AMA about how we cut hallucinations to near-zero.",
  },
  {
    tool: "promptly",
    author: "Priya N.",
    body: "Switched our support docs over last week. The inline citations are the killer detail — reviewers stopped asking for sources.",
  },
  {
    tool: "promptly",
    author: "Tomas K.",
    body: "How does it handle non-English sources? Testing with German legal texts and accuracy looks promising so far.",
  },
  {
    tool: "codepilotx",
    author: "Ravi M.",
    body: "The repo-wide refactor mode saved us a two-sprint migration. It caught rename collisions our own codemod missed.",
  },
  {
    tool: "codepilotx",
    author: "@jonas",
    isMaker: true,
    body: "Thanks @Ravi M.! v2.1 lands tomorrow with monorepo-aware diffing — the exact pain point you hit.",
  },
  {
    tool: "pixelforge",
    author: "Lena W.",
    body: "Batch-generating 400 product shots took 6 minutes. The style-lock feature is what sets it apart from the generic ones.",
  },
  {
    tool: "nectarsearch",
    author: "Diego F.",
    body: "Semantic search that actually ranks our internal wiki correctly on the first try. Impressed.",
  },
  {
    tool: "driftboard",
    author: "Marcus T.",
    body: "Found this through the community queue — the realtime board sync is genuinely instant. Nice launch!",
  },
];

async function main() {
  const existing = await db.comment.count();
  if (existing > 0) {
    console.log(`seed-comments: ${existing} comments already present — skipping.`);
    return;
  }
  let added = 0;
  for (const c of comments) {
    const tool = await db.tool.findUnique({ where: { slug: c.tool } });
    if (!tool) {
      console.warn(`seed-comments: tool ${c.tool} not found — skipping.`);
      continue;
    }
    await db.comment.create({
      data: { toolId: tool.id, author: c.author, body: c.body, isMaker: c.isMaker ?? false },
    });
    added++;
  }
  console.log(`seed-comments: added ${added} starter comments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
