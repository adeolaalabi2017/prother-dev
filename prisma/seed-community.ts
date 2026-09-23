/**
 * Community seed — idempotent (safe to re-run, every create is guarded).
 * Run: bun prisma/seed-community.ts
 *
 * Creates:
 *  - 4 users (dana/mira/sam/leo @prother.dev, createdAt backdated 30 days)
 *  - Reviews: perplexity ×3 published (aggregate unlocked), claude ×2
 *    (aggregate locked), midjourney ×1 filtered (soft moderation demo)
 *  - Collections: public "Starter AI stack" (dana, 4 tools) +
 *    private "Watchlist" (dana, 1 tool)
 *  - Follows: dana → tool "perplexity", dana → category "conversational-ai"
 *
 * NOTE: runs in its own process, so the freshly generated PrismaClient knows
 * every model — no $queryRaw needed here (unlike the API routes).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const BACKDATED = new Date(Date.now() - 30 * 86_400_000);
/** Reviews are backdated 10 days — inside the trending "month" window. */
const REVIEW_BACKDATED = new Date(Date.now() - 10 * 86_400_000);

const users = [
  { email: "dana@prother.dev", name: "Dana", handle: "dana" },
  { email: "mira@prother.dev", name: "Mira", handle: "mira" },
  { email: "sam@prother.dev", name: "Sam", handle: "sam" },
  { email: "leo@prother.dev", name: "Leo", handle: "leo" },
];

async function ensureUsers() {
  const map = new Map<string, { id: string; name: string | null; handle: string | null; email: string }>();
  for (const u of users) {
    const existing = await db.user.findUnique({ where: { email: u.email } });
    const row =
      existing ??
      (await db.user.create({
        data: {
          email: u.email,
          name: u.name,
          handle: u.handle,
          emailVerified: BACKDATED,
          createdAt: BACKDATED,
        },
      }));
    map.set(u.email, { ...row, email: u.email });
  }
  return map;
}

async function main() {
  console.log("🌱 Seeding Prother community data…");

  const userMap = await ensureUsers();
  const dana = userMap.get("dana@prother.dev")!;
  const mira = userMap.get("mira@prother.dev")!;
  const sam = userMap.get("sam@prother.dev")!;
  const leo = userMap.get("leo@prother.dev")!;

  const perplexity = await db.tool.findUnique({ where: { slug: "perplexity" } });
  const claude = await db.tool.findUnique({ where: { slug: "claude" } });
  const midjourney = await db.tool.findUnique({ where: { slug: "midjourney" } });
  if (!perplexity || !claude || !midjourney) {
    throw new Error("Base tools missing: run prisma/seed.ts first.");
  }

  // ── Reviews: perplexity ×3 published (unlocks the aggregate) ──────────
  const perplexityReviews = [
    {
      user: dana,
      ease: 5,
      power: 4,
      value: 4,
      body: "Dropped Perplexity into our research workflow and the citation-first answers held up on the first week of real questions. Setup took an afternoon, the API is boring in the best way, and the audit log saved us during our compliance review. Only knock: the Spaces search gets slow past a few hundred threads.",
    },
    {
      user: mira,
      ease: 4,
      power: 4,
      value: 5,
      body: "We evaluated three answer engines and Perplexity was the only one where the free tier was actually usable for a pilot. Hallucination controls are honest: it cites or it says it doesn't know. Docking one point on ease because the API config assumes you already speak HTTP headers.",
    },
    {
      user: sam,
      ease: 4,
      power: 5,
      value: 3,
      body: "Powerful retrieval controls: the per-source weighting is the best I've used. Pro pricing stings for solo founders though, and the seat model counts search agents, which feels sneaky. Still: answer quality on our 40k-doc corpus beat the incumbent by a wide margin in blind tests.",
    },
  ];
  for (const r of perplexityReviews) {
    const exists = await db.review.findUnique({
      where: { toolId_userId: { toolId: perplexity.id, userId: r.user.id } },
    });
    if (!exists) {
      await db.review.create({
        data: {
          toolId: perplexity.id,
          userId: r.user.id,
          author: `@${r.user.handle ?? "maker"}`,
          ease: r.ease,
          power: r.power,
          value: r.value,
          body: r.body,
          status: "published",
          createdAt: REVIEW_BACKDATED,
          updatedAt: REVIEW_BACKDATED,
        },
      });
    }
  }

  // ── Reviews: claude ×2 published (aggregate stays locked at 2) ────────
  const claudeReviews = [
    {
      user: dana,
      ease: 4,
      power: 4,
      value: 4,
      body: "The diff review gate is genuinely useful: it caught two prompt-injection vectors in a generated PR before CI did. Claude Code setup is five minutes. Would like inline monorepo path filters before I call it complete.",
    },
    {
      user: mira,
      ease: 3,
      power: 5,
      value: 4,
      body: "Review policies are the deep feature here: you can encode 'no raw secrets in generated code' as a project rule and it enforces. The UI is dense and the onboarding assumes senior context. Per-seat pricing is fair for what it replaces.",
    },
  ];
  for (const r of claudeReviews) {
    const exists = await db.review.findUnique({
      where: { toolId_userId: { toolId: claude.id, userId: r.user.id } },
    });
    if (!exists) {
      await db.review.create({
        data: {
          toolId: claude.id,
          userId: r.user.id,
          author: `@${r.user.handle ?? "maker"}`,
          ease: r.ease,
          power: r.power,
          value: r.value,
          body: r.body,
          status: "published",
          createdAt: REVIEW_BACKDATED,
          updatedAt: REVIEW_BACKDATED,
        },
      });
    }
  }

  // ── Review: midjourney ×1 FILTERED (soft-moderation demo — <48h account)
  const leoMidjourney = await db.review.findUnique({
    where: { toolId_userId: { toolId: midjourney.id, userId: leo.id } },
  });
  if (!leoMidjourney) {
    await db.review.create({
      data: {
        toolId: midjourney.id,
        userId: leo.id,
        author: `@${leo.handle ?? "maker"}`,
        ease: 4,
        power: 3,
        value: 4,
        body: "Style-reference is real, not vaporware: fed it one mood-board image and got a whole campaign that held the palette. Character consistency across scenes needs work but the direction is right.",
        status: "filtered",
        createdAt: REVIEW_BACKDATED,
        updatedAt: REVIEW_BACKDATED,
      },
    });
  }

  // ── Collections ───────────────────────────────────────────────────────
  const starter = await db.collection.findUnique({ where: { slug: "starter-ai-stack" } });
  const starterCollection =
    starter ??
    (await db.collection.create({
      data: {
        slug: "starter-ai-stack",
        name: "Starter AI stack",
        description:
          "The four tools I install on day one of every AI project: a reasoning workhorse, a citation-first answer engine, a workflow connector that never sleeps, and the open model hub that holds it all together.",
        isPublic: true,
        ownerEmail: dana.email!,
        ownerName: "Dana",
        createdAt: BACKDATED,
      },
    }));

  const starterSlugs = ["claude", "perplexity", "zapier", "hugging-face"];
  let position = await db.collectionItem.count({ where: { collectionId: starterCollection.id } });
  for (const slug of starterSlugs) {
    const tool = await db.tool.findUnique({ where: { slug } });
    if (!tool) continue;
    const has = await db.collectionItem.findUnique({
      where: { collectionId_toolId: { collectionId: starterCollection.id, toolId: tool.id } },
    });
    if (!has) {
      await db.collectionItem.create({
        data: { collectionId: starterCollection.id, toolId: tool.id, position },
      });
      position++;
    }
  }

  const watchlist = await db.collection.findFirst({
    where: { ownerEmail: dana.email!, isPublic: false },
  });
  const watchlistCollection =
    watchlist ??
    (await db.collection.create({
      data: {
        slug: "watchlist",
        name: "Watchlist",
        description: "Tools I'm tracking for the next procurement cycle.",
        isPublic: false,
        ownerEmail: dana.email!,
        ownerName: "Dana",
        createdAt: BACKDATED,
      },
    }));

  const watchSlugs = ["elevenlabs"];
  for (const slug of watchSlugs) {
    const tool = await db.tool.findUnique({ where: { slug } });
    if (!tool) continue;
    const has = await db.collectionItem.findUnique({
      where: { collectionId_toolId: { collectionId: watchlistCollection.id, toolId: tool.id } },
    });
    if (!has) {
      const count = await db.collectionItem.count({ where: { collectionId: watchlistCollection.id } });
      await db.collectionItem.create({
        data: { collectionId: watchlistCollection.id, toolId: tool.id, position: count },
      });
    }
  }

  // ── Follows ───────────────────────────────────────────────────────────
  const perplexityFollow = await db.follow.findUnique({
    where: {
      userEmail_targetType_targetId: {
        userEmail: dana.email!,
        targetType: "tool",
        targetId: "perplexity",
      },
    },
  });
  if (!perplexityFollow) {
    await db.follow.create({
      data: {
        userEmail: dana.email!,
        targetType: "tool",
        targetId: "perplexity",
        targetLabel: "Perplexity",
        createdAt: BACKDATED,
      },
    });
  }

  const conversationalFollow = await db.follow.findUnique({
    where: {
      userEmail_targetType_targetId: {
        userEmail: dana.email!,
        targetType: "category",
        targetId: "conversational-ai",
      },
    },
  });
  if (!conversationalFollow) {
    await db.follow.create({
      data: {
        userEmail: dana.email!,
        targetType: "category",
        targetId: "conversational-ai",
        targetLabel: "Conversational AI & Chatbots",
        createdAt: BACKDATED,
      },
    });
  }

  const [reviewCount, collectionCount, itemCount, followCount, userCount] = await Promise.all([
    db.review.count(),
    db.collection.count(),
    db.collectionItem.count(),
    db.follow.count(),
    db.user.count(),
  ]);

  console.log(
    [
      "✅ Community seed summary (idempotent):",
      `  users:              ${userCount} (seeded: dana, mira, sam, leo — backdated 30d)`,
      `  reviews:            ${reviewCount} (perplexity ×3 published, claude ×2, midjourney ×1 filtered)`,
      `  collections:        ${collectionCount} (starter-ai-stack public ×4 items, watchlist private ×1)`,
      `  collection items:   ${itemCount}`,
      `  follows:            ${followCount} (dana → tool perplexity, dana → category conversational-ai)`,
    ].join("\n")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
