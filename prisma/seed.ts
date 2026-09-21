/**
 * Prother seed — 10 categories (PRD §13), today's launch batch (§9),
 * tomorrow teasers, and past-week launches for Top Week / archive.
 * Run: bunx tsx prisma/seed.ts  (or bun prisma/seed.ts)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}
function daysAgo(n: number): Date {
  return utcMidnight(new Date(Date.now() - n * 86400000));
}

const categories = [
  { slug: "generative-ai-chatbots", name: "Generative AI & Chatbots", emoji: "🤖", sortOrder: 1 },
  { slug: "coding-tools", name: "AI Coding Tools & Assistants", emoji: "👨‍💻", sortOrder: 2 },
  { slug: "art-image-video", name: "AI Art, Image & Video", emoji: "🎨", sortOrder: 3 },
  { slug: "data-analysis", name: "AI for Data Analysis & Prediction", emoji: "📈", sortOrder: 4 },
  { slug: "infra-devtools", name: "AI Infrastructure & DevTools", emoji: "⚙️", sortOrder: 5 },
  { slug: "audio-voice-music", name: "AI Audio, Voice & Music", emoji: "🔊", sortOrder: 6 },
  { slug: "agents-automation", name: "AI Agents & Automation", emoji: "🧠", sortOrder: 7 },
  { slug: "vertical-ai", name: "Vertical AI", emoji: "🏥", sortOrder: 8 },
  { slug: "writing-productivity", name: "AI Writing & Productivity", emoji: "📝", sortOrder: 9 },
  { slug: "safety-governance", name: "AI Safety, Ethics & Governance", emoji: "🛡️", sortOrder: 10 },
];

type SeedTool = {
  slug: string; name: string; tagline: string; cat: string;
  pricing: string; price?: string; note?: string;
  emoji: string; gradient: string;
  votes: number; pick?: boolean; curated?: boolean; relaunch?: boolean;
  maker?: string; claimed?: boolean; api?: boolean; oss?: string;
  tags?: string; hourOffset?: number; day?: number; scheduled?: boolean;
};

const tools: SeedTool[] = [
  // ── TODAY (12 launches) ──────────────────────────────────────────────
  { slug: "promptly", name: "Promptly", tagline: "AI chatbots that never hallucinate citations", cat: "generative-ai-chatbots", pricing: "freemium", price: "$19", note: "Pro / 20 free queries per month", emoji: "💬", gradient: "from-orange-400 to-rose-600", votes: 47, pick: true, maker: "@dana", claimed: true, api: true, tags: "api-available|enterprise", hourOffset: 14 },
  { slug: "codepilotx", name: "CodePilotX", tagline: "Review AI code diffs before your team ships", cat: "coding-tools", pricing: "paid", price: "$29", note: "per seat / month", emoji: "🧑‍🔧", gradient: "from-amber-400 to-orange-700", votes: 31, relaunch: true, maker: "@leo", claimed: true, api: true, tags: "api-available|enterprise", hourOffset: 13 },
  { slug: "pixelforge", name: "PixelForge", tagline: "Turn sketches into production design systems", cat: "art-image-video", pricing: "free", emoji: "🎨", gradient: "from-orange-300 to-red-500", votes: 22, curated: true, maker: "@prother", tags: "no-code", hourOffset: 12 },
  { slug: "voiceloom", name: "VoiceLoom", tagline: "Clone your voice, dub 40 languages in minutes", cat: "audio-voice-music", pricing: "freemium", price: "$12", note: "Starter / 30 min per month", emoji: "🎙️", gradient: "from-orange-500 to-purple-700", votes: 18, maker: "@amara", claimed: true, api: true, tags: "api-available|mobile", hourOffset: 11 },
  { slug: "agentrun", name: "AgentRun", tagline: "Self-healing agents that retry their own failures", cat: "agents-automation", pricing: "open_source", emoji: "🧠", gradient: "from-amber-500 to-stone-700", votes: 15, maker: "@sol", claimed: true, oss: "https://github.com/agentrun/agentrun", tags: "open-source|self-hosted|api-available", hourOffset: 10 },
  { slug: "sheetsense", name: "SheetSense", tagline: "Ask your spreadsheets anything, in plain English", cat: "data-analysis", pricing: "freemium", price: "$9", note: "Plus / unlimited workbooks", emoji: "📊", gradient: "from-lime-400 to-emerald-700", votes: 12, maker: "@ivy", tags: "no-code", hourOffset: 9 },
  { slug: "guardrail", name: "Guardrail", tagline: "Policy checks for LLM outputs before they ship", cat: "safety-governance", pricing: "paid", price: "$49", note: "Team / month, 100k checks", emoji: "🛡️", gradient: "from-stone-400 to-orange-800", votes: 9, maker: "@mira", claimed: true, api: true, tags: "api-available|enterprise", hourOffset: 8 },
  { slug: "edgeembed", name: "EdgeEmbed", tagline: "Embedding inference at the edge, 40ms p99", cat: "infra-devtools", pricing: "open_source", emoji: "⚙️", gradient: "from-zinc-400 to-slate-700", votes: 8, maker: "@prother", oss: "https://github.com/prother-dev/edgeembed", api: true, tags: "open-source|self-hosted", hourOffset: 7 },
  { slug: "briefcase-ai", name: "Briefcase AI", tagline: "The legal copilot for contract review at scale", cat: "vertical-ai", pricing: "paid", price: "$99", note: "Firm / month", emoji: "⚖️", gradient: "from-amber-600 to-stone-800", votes: 7, maker: "@harvey", tags: "enterprise", hourOffset: 6 },
  { slug: "draftpunk", name: "DraftPunk", tagline: "From bullet points to publishable blog post", cat: "writing-productivity", pricing: "free", emoji: "✍️", gradient: "from-orange-300 to-amber-600", votes: 6, maker: "@nina", hourOffset: 5, tags: "free-tier" },
  { slug: "clipwhisper", name: "ClipWhisper", tagline: "Turn 3-hour podcasts into 10 viral clips", cat: "art-image-video", pricing: "freemium", price: "$15", note: "Creator / 20 uploads", emoji: "🎬", gradient: "from-rose-400 to-orange-600", votes: 5, maker: "@kai", hourOffset: 4, tags: "mobile" },
  { slug: "querymuse", name: "QueryMuse", tagline: "Semantic search across your whole Notion workspace", cat: "infra-devtools", pricing: "freemium", price: "$8", note: "Pro / month", emoji: "🔎", gradient: "from-orange-400 to-yellow-600", votes: 4, maker: "@reid", api: true, hourOffset: 3, tags: "api-available" },

  // ── TOMORROW (4 scheduled teasers) ───────────────────────────────────
  { slug: "turbine", name: "Turbine", tagline: "GPU cost optimizer for inference fleets", cat: "infra-devtools", pricing: "paid", price: "$199", emoji: "🌀", gradient: "from-cyan-500 to-slate-800", votes: 0, maker: "@prother", scheduled: true },
  { slug: "lingoloop", name: "LingoLoop", tagline: "Real-time meeting interpreter for global teams", cat: "audio-voice-music", pricing: "freemium", price: "$20", emoji: "🌐", gradient: "from-teal-400 to-emerald-800", votes: 0, maker: "@sofia", scheduled: true },
  { slug: "verity", name: "Verity", tagline: "Fact-check pipelines built for newsrooms", cat: "safety-governance", pricing: "paid", price: "$79", emoji: "✅", gradient: "from-emerald-500 to-slate-800", votes: 0, maker: "@prother", scheduled: true },
  { slug: "canvasops", name: "CanvasOps", tagline: "A/B test your prompt pipelines like landing pages", cat: "generative-ai-chatbots", pricing: "freemium", price: "$29", emoji: "🧪", gradient: "from-orange-500 to-rose-700", votes: 0, maker: "@tara", scheduled: true },

  // ── PAST WEEK (Top Week + archive) ───────────────────────────────────
  { slug: "nectarsearch", name: "NectarSearch", tagline: "Answer engine that cites every single source", cat: "generative-ai-chatbots", pricing: "freemium", price: "$16", emoji: "🍯", gradient: "from-amber-300 to-orange-700", votes: 312, maker: "@petal", claimed: true, day: 5, tags: "api-available" },
  { slug: "flowstein", name: "FlowStein", tagline: "Predict churn before your dashboard does", cat: "data-analysis", pricing: "paid", price: "$59", emoji: "📉", gradient: "from-emerald-400 to-teal-800", votes: 288, maker: "@prother", day: 4, tags: "enterprise" },
  { slug: "rendermind", name: "RenderMind", tagline: "Photoreal product shots from a phone photo", cat: "art-image-video", pricing: "freemium", price: "$24", emoji: "🖼️", gradient: "from-orange-400 to-rose-700", votes: 241, maker: "@stella", day: 3, tags: "no-code" },
  { slug: "stacksherpa", name: "StackSherpa", tagline: "An on-call engineer that never sleeps", cat: "coding-tools", pricing: "paid", price: "$39", emoji: "🏔️", gradient: "from-slate-400 to-orange-900", votes: 197, maker: "@greg", day: 2, api: true, tags: "api-available|self-hosted" },
  { slug: "echograin", name: "EchoGrain", tagline: "Master your tracks like a platinum studio", cat: "audio-voice-music", pricing: "freemium", price: "$11", emoji: "🎹", gradient: "from-purple-400 to-orange-700", votes: 156, maker: "@nova", day: 2, tags: "mobile" },
  { slug: "ledgerllm", name: "LedgerLLM", tagline: "Audit-ready finance ops, run by agents", cat: "vertical-ai", pricing: "paid", price: "$149", emoji: "💼", gradient: "from-amber-500 to-zinc-800", votes: 121, maker: "@quan", day: 1, tags: "enterprise" },
  { slug: "popupclinic", name: "PopupClinic", tagline: "Triage intake forms with clinical-grade AI", cat: "vertical-ai", pricing: "paid", price: "$89", emoji: "🩺", gradient: "from-rose-400 to-emerald-800", votes: 98, maker: "@prother", day: 1 },
  { slug: "mailmuse", name: "MailMuse", tagline: "Inbox zero, written in your voice", cat: "writing-productivity", pricing: "freemium", price: "$7", emoji: "📧", gradient: "from-orange-300 to-red-600", votes: 87, maker: "@chris", day: 1 },
];

async function main() {
  console.log("🌱 Seeding Prother…");
  await db.vote.deleteMany();
  await db.launch.deleteMany();
  await db.tool.deleteMany();
  await db.category.deleteMany();

  for (const c of categories) await db.category.create({ data: c });

  const catMap = new Map<string, string>();
  for (const c of await db.category.findMany()) catMap.set(c.slug, c.id);

  const today = utcMidnight(new Date());
  const tomorrow = new Date(today.getTime() + 86400000);
  let seeded = 0;

  for (const t of tools) {
    const launchDate = t.scheduled ? tomorrow : daysAgo(t.day ?? 0);
    await db.tool.create({
      data: {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        description: `${t.name} — ${t.tagline.toLowerCase()}. Every listing on Prother passes all six standards: live and accessible, AI-native, complete, honest, safe, and in English.`,
        websiteUrl: `https://${t.slug}.ai`,
        logoEmoji: t.emoji,
        logoGradient: t.gradient,
        pricingModel: t.pricing,
        startingPrice: t.price ?? null,
        pricingNote: t.note ?? null,
        hasApi: t.api ?? false,
        githubUrl: t.oss ?? null,
        docsUrl: `https://${t.slug}.ai/docs`,
        twitterUrl: `https://x.com/${t.slug.replace(/-/g, "")}`,
        tags: t.tags ?? "",
        track: t.maker === "@prother" ? "editor_seed" : "community",
        editorsPick: t.pick ?? false,
        curated: t.curated ?? false,
        claimed: t.claimed ?? false,
        makerHandle: t.maker ?? "@prother",
        relaunch: t.relaunch ?? false,
        verifiedAt: t.scheduled ? null : new Date(Date.now() - 2 * 86400000),
        categoryId: catMap.get(t.cat)!,
        launch: {
          create: {
            launchDate,
            scheduled: t.scheduled ?? false,
            baseUpvotes: t.votes,
            createdAt: t.scheduled
              ? new Date(Date.now() - 3600000)
              : new Date(today.getTime() + (t.hourOffset ?? 8) * 3600000),
          },
        },
      },
    });
    seeded++;
  }

  console.log(`✅ Seeded ${seeded} tools, ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
