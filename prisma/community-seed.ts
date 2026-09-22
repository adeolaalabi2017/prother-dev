/**
 * Community seed (Task 23) — accounts for forum authors, ad campaigns, and
 * demo reports so the Admin Console's new modules are populated.
 *
 * Idempotent: users upsert by handle, campaigns are per-placement guarded
 * (Task 27: a placement only seeds when that placement has no row),
 * reports skip when present, authorId backfill is a no-op once applied.
 * Run: bun prisma/community-seed.ts
 *
 * Raw SQL throughout (same stale-client rationale as lib/forum.ts — though a
 * fresh `bun` process would have a current client anyway).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Maker roster (mirrors prisma/seed.ts + prisma/forum-seed.ts handles).
const ROSTER: {
  handle: string;
  email: string;
  name: string;
  role: "member" | "moderator" | "admin";
  status: "active" | "banned";
}[] = [
  { handle: "@dana", email: "dana@makers.dev", name: "Dana Okafor", role: "moderator", status: "active" },
  { handle: "@leo", email: "leo@makers.dev", name: "Leo Marchetti", role: "member", status: "active" },
  { handle: "@sol", email: "sol@makers.dev", name: "Sol Ramirez", role: "member", status: "active" },
  { handle: "@greg", email: "greg@makers.dev", name: "Greg Hale", role: "member", status: "active" },
  { handle: "@tara", email: "tara@makers.dev", name: "Tara Iyer", role: "member", status: "active" },
  { handle: "@ivy", email: "ivy@makers.dev", name: "Ivy Chen", role: "member", status: "active" },
  { handle: "@nina", email: "nina@makers.dev", name: "Nina Petrova", role: "member", status: "active" },
  { handle: "@petal", email: "petal@makers.dev", name: "Petal Nkemdirim", role: "member", status: "active" },
  // A banned account so the moderation state is visible in the console.
  { handle: "@harvey", email: "harvey@spammy.dev", name: "Harvey Wicks", role: "member", status: "banned" },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

async function seedUsers(): Promise<void> {
  for (const u of ROSTER) {
    await db.$executeRaw`
      INSERT INTO "User" (id, name, email, emailVerified, handle, role, status, createdAt)
      VALUES (${crypto.randomUUID()}, ${u.name}, ${u.email}, ${daysAgo(30)},
              ${u.handle}, ${u.role}, ${u.status}, ${daysAgo(40)})
      ON CONFLICT(email) DO NOTHING`;
  }
  // Backfill forum authorship so the console shows real activity counts.
  for (const u of ROSTER) {
    await db.$executeRaw`
      UPDATE ForumThread SET authorId = (
        SELECT id FROM "User" WHERE email = ${u.email} LIMIT 1
      ) WHERE author = ${u.handle} AND authorId IS NULL`;
    await db.$executeRaw`
      UPDATE ForumReply SET authorId = (
        SELECT id FROM "User" WHERE email = ${u.email} LIMIT 1
      ) WHERE author = ${u.handle} AND authorId IS NULL`;
  }
  console.log(`[community-seed] users ensured (${ROSTER.length}) + authorship backfilled`);
}

async function seedCampaigns(): Promise<void> {
  // Per-placement guard (Task 27) — each placement seeds exactly one demo
  // campaign the first time it appears; re-runs skip rows that already exist.
  const campaigns: {
    name: string; advertiser: string; placement: string; status: string;
    headline: string; body: string; clickUrl: string; emoji: string;
    gradient: string; targetCategory: string | null; weight: number;
    startsAt: string; endsAt: string | null; totalBudgetCents: number;
    dailyBudgetCents: number; impressions: number; clicks: number;
  }[] = [
    {
      name: "Vectorize Q3 launch",
      advertiser: "Vectorize",
      placement: "feed_row",
      status: "active",
      headline: "Ship AI features without the embeddings plumbing",
      body: "Vectorize is a managed embeddings API — one call, hybrid search ready.",
      clickUrl: "https://vectorize.example.com/?utm_source=prother",
      emoji: "🧭",
      gradient: "from-orange-500 to-amber-700",
      targetCategory: null,
      weight: 6,
      startsAt: daysAgo(2),
      endsAt: daysAhead(14),
      totalBudgetCents: 50_000,
      dailyBudgetCents: 0,
      impressions: 4_212,
      clicks: 138,
    },
    {
      name: "Launch Week Playbook sponsorship",
      advertiser: "IndieShip",
      placement: "journal_bar",
      status: "active",
      headline: "The launch-week checklist 400 makers swear by",
      body: "Free playbook — position, assets, day-of rhythm.",
      clickUrl: "https://indieship.example.com/playbook?utm_source=prother",
      emoji: "📕",
      gradient: "from-stone-600 to-orange-700",
      targetCategory: null,
      weight: 3,
      startsAt: daysAgo(5),
      endsAt: daysAhead(9),
      totalBudgetCents: 20_000,
      dailyBudgetCents: 0,
      impressions: 1_908,
      clicks: 41,
    },
    {
      name: "PromptForge Pro — agents spotlight",
      advertiser: "PromptForge",
      placement: "category_spotlight",
      status: "active",
      headline: "PromptForge Pro: versioning for production prompts",
      body: "Diff, eval and roll back prompts like code.",
      clickUrl: "https://promptforge.example.com/pro?utm_source=prother",
      emoji: "⚒️",
      gradient: "from-amber-500 to-orange-800",
      targetCategory: "agents-automation",
      weight: 4,
      startsAt: daysAgo(1),
      endsAt: daysAhead(30),
      totalBudgetCents: 0,
      dailyBudgetCents: 0,
      impressions: 0,
      clicks: 0,
    },
    {
      name: "Loomline directory banner",
      advertiser: "Loomline",
      placement: "directory_banner",
      status: "active",
      headline: "Watch your agents think — trace every run",
      body: "Loomline records, replays and diffs agent sessions so you can fix what went wrong.",
      clickUrl: "https://loomline.example.com/?utm_source=prother",
      emoji: "🛰️",
      gradient: "from-emerald-600 to-orange-700",
      targetCategory: null,
      weight: 4,
      startsAt: daysAgo(1),
      endsAt: daysAhead(21),
      totalBudgetCents: 30_000,
      dailyBudgetCents: 0,
      impressions: 986,
      clicks: 33,
    },
    {
      name: "QueryFox SERP footer",
      advertiser: "QueryFox",
      placement: "serp_footer",
      status: "active",
      headline: "Analytics for AI search — see how tools rank",
      body: "QueryFox tracks AI-search visibility across engines, weekly.",
      clickUrl: "https://queryfox.example.com/?utm_source=prother",
      emoji: "🦊",
      gradient: "from-orange-600 to-red-800",
      targetCategory: null,
      weight: 3,
      startsAt: daysAgo(1),
      endsAt: daysAhead(21),
      totalBudgetCents: 15_000,
      dailyBudgetCents: 0,
      impressions: 412,
      clicks: 11,
    },
  ];
  let inserted = 0;
  for (const c of campaigns) {
    const present = await db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*) AS n FROM AdCampaign WHERE placement = ${c.placement}`;
    if (Number(present[0]?.n ?? 0) > 0) continue;
    await db.$executeRaw`
      INSERT INTO AdCampaign (
        id, name, advertiser, placement, status, headline, body, clickUrl,
        emoji, gradient, targetCategory, weight, startsAt, endsAt,
        totalBudgetCents, dailyBudgetCents, impressions, clicks, createdAt, updatedAt
      ) VALUES (
        ${crypto.randomUUID()}, ${c.name}, ${c.advertiser}, ${c.placement},
        ${c.status}, ${c.headline}, ${c.body}, ${c.clickUrl}, ${c.emoji},
        ${c.gradient}, ${c.targetCategory}, ${c.weight}, ${c.startsAt},
        ${c.endsAt}, ${c.totalBudgetCents}, ${c.dailyBudgetCents},
        ${c.impressions}, ${c.clicks}, ${daysAgo(6)}, ${daysAgo(1)}
      )`;
    inserted += 1;
  }
  // Legacy demo row (Task 23) shipped as draft+scheduled — flip it live so
  // the category spotlight slot demonstrates a real creative.
  await db.$executeRaw`
    UPDATE AdCampaign
    SET status = 'active', startsAt = ${daysAgo(1)}, updatedAt = ${new Date().toISOString()}
    WHERE name = 'PromptForge Pro — agents spotlight' AND status = 'draft'`;
  console.log(`[community-seed] campaigns ensured (${inserted} inserted, ${campaigns.length} placements covered)`);
}

async function seedReports(): Promise<void> {
  const count = await db.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*) AS n FROM Report`;
  if (Number(count[0]?.n ?? 0) > 0) {
    console.log("[community-seed] reports already present — skipping");
    return;
  }

  // Real targets from the existing data.
  const thread = await db.$queryRaw<{ id: string; title: string }[]>`
    SELECT id, title FROM ForumThread WHERE hidden = 0 ORDER BY createdAt DESC LIMIT 1`;
  const tool = await db.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM Tool WHERE status = 'live' ORDER BY createdAt DESC LIMIT 1`;
  const reply = await db.$queryRaw<{ id: string; body: string }[]>`
    SELECT id, body FROM ForumReply WHERE hidden = 0 ORDER BY createdAt DESC LIMIT 1`;
  const post = await db.$queryRaw<{ id: string; title: string }[]>`
    SELECT id, title FROM Post WHERE status = 'published' LIMIT 1`;

  const rows: (string | null)[][] = [];
  if (thread[0]) {
    rows.push([
      crypto.randomUUID(), null, "anon:qa-reporter-8812", "thread", thread[0].id,
      thread[0].title.slice(0, 120), "spam", "Same promo link posted in three topics within an hour.",
      "open", null, null, daysAgo(0.2),
    ]);
  }
  if (tool[0]) {
    rows.push([
      crypto.randomUUID(), "ivy@makers.dev", null, "tool", tool[0].id,
      tool[0].name.slice(0, 120), "misleading", "The landing page promises an API, but there is none — gated waitlist instead.",
      "open", null, null, daysAgo(1.1),
    ]);
  }
  if (reply[0]) {
    rows.push([
      crypto.randomUUID(), "greg@makers.dev", null, "reply", reply[0].id,
      reply[0].body.slice(0, 120), "harassment", "Personal attack on another maker.",
      "resolved", "Warned the author, reply kept.", daysAgo(0.5), daysAgo(1.6),
    ]);
  }
  if (post[0]) {
    rows.push([
      crypto.randomUUID(), null, "anon:qa-reporter-1177", "post", post[0].id,
      post[0].title.slice(0, 120), "other", "Cover image is a stock render, not the actual product.",
      "dismissed", "Editorial artwork is allowed per house rules.", null, daysAgo(3),
    ]);
  }

  for (const r of rows) {
    await db.$executeRaw`
      INSERT INTO Report (
        id, reporterEmail, reporterKey, targetType, targetId, targetLabel,
        reason, details, status, resolutionNote, resolvedAt, createdAt
      ) VALUES (
        ${r[0]}, ${r[1]}, ${r[2]}, ${r[3]}, ${r[4]}, ${r[5]},
        ${r[6]}, ${r[7]}, ${r[8]}, ${r[9]}, ${r[10]}, ${r[11]}
      )`;
  }
  console.log(`[community-seed] reports inserted (${rows.length})`);
}

async function main(): Promise<void> {
  await seedUsers();
  await seedCampaigns();
  await seedReports();
  console.log("[community-seed] done");
}

main()
  .catch((e) => {
    console.error("[community-seed] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
