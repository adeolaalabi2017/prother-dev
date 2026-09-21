/**
 * Prother forums seed (Task 22-b) — 8 threads across the 4 topics
 * (general / vibecoding / show / introduce) with 1–4 replies each.
 *
 * Idempotent: exits without writing when ForumThread already has rows.
 * Run: bun prisma/forum-seed.ts  (from the project root)
 *
 * Handles reuse the maker roster from prisma/seed.ts so the forums read
 * like the same community that launches on the feed.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}

type SeedReply = { author: string; body: string; hoursAfter: number };

type SeedThread = {
  slug: string;
  title: string;
  body: string;
  topic: "general" | "vibecoding" | "show" | "introduce";
  author: string;
  pinned?: boolean;
  baseUpvotes: number;
  hoursAgo: number;
  replies: SeedReply[];
};

const threads: SeedThread[] = [
  {
    slug: "read-first-what-goes-where-q4f2",
    topic: "general",
    pinned: true,
    title: "Read first: what belongs in each of the four rooms",
    author: "@prother",
    baseUpvotes: 18,
    hoursAgo: 96,
    body: `Quick orientation so posts land in front of the right people:

p/general — launching, timing, pricing, validation, distribution. If it is about running the business of a product, it goes here.

p/vibecoding — how you actually build: prompts, agents, workflows, what your stack looks like after three weeks of co-writing with a model.

p/show — you shipped something. Demo it, share real numbers, answer stack questions. One thread per launch, link your tool page.

p/introduce — say hi. What you worked on before, what you are building now. No pitch decks needed.

Moderation is light but real: show posts with fake metrics get unlisted, and cross-posting the same thread into three rooms gets the duplicates merged. Ask questions the way you would ask a friend who happens to have shipped eight products.`,
    replies: [
      {
        author: "@dana",
        body: "Follow-up for the mods: if I hit a gnarly prompt-architecture problem while building my launch page, that is vibecoding, but if I want feedback on the page itself, that is show? Want to keep my threads out of the merge pile.",
        hoursAfter: 3,
      },
    ],
  },
  {
    slug: "launch-timing-0001-utc-vs-afternoon-8jk1",
    topic: "general",
    title: "Launch timing: does the 00:01 UTC slot actually beat an afternoon slot?",
    author: "@dana",
    baseUpvotes: 34,
    hoursAgo: 5,
    body: `We took Promptly live at 14:00 UTC on a Tuesday, mostly by accident — the deploy finished early and we stopped waiting for a "better" moment.

Comparing our curve to NectarSearch (which opened right at 00:01 UTC): they cleared 300 votes in five days, we are at 47 after half a day. Not comparable products, but the shape differs. Their votes came in two bursts — right at open and around 14:00 UTC when the US logged on. Ours ramped slowly all afternoon and held overnight.

My working theory: the 00:01 slot buys you 14 extra hours of exposure to the early crowd, but the ranking decay means those early votes weigh less by the time most people see the feed. An afternoon slot front-loads your freshest hours into peak traffic.

Anyone launched the same product twice at different times? I would take one real data point over my spreadsheet of guesses.`,
    replies: [
      {
        author: "@leo",
        body: "CodePilotX went live 13:00 UTC. What I can confirm from the feed: vote velocity in the first six hours decides whether you hold the top row when the EU evening crowd arrives. After hour six the decay is brutal — our score halved while votes still trickled in. I would pick the slot where YOUR audience is awake over any universal rule.",
        hoursAfter: 1,
      },
      {
        author: "@reid",
        body: "QueryMuse launched 15:30 UTC and I spent the whole morning refreshing with nothing to show for it. Afternoon worked for us because both EU and US were online and the feed had stopped churning — less competition per hour. Also: a Tuesday beats a Friday by a lot, weekends are a ghost town here.",
        hoursAfter: 2,
      },
      {
        author: "@mira",
        body: "Counterpoint from the Guardrail launch: we got the editor pick badge a few hours in and the badge moved more votes than the slot ever could. Timing is a rounding error next to a strong first screenshot.",
        hoursAfter: 4,
      },
    ],
  },
  {
    slug: "validating-before-you-build-landing-pages-lie-2md9",
    topic: "general",
    title: "How do you validate before you build? My landing-page-first numbers keep lying to me",
    author: "@nina",
    baseUpvotes: 21,
    hoursAgo: 26,
    body: `Before DraftPunk I ran the classic play: fake landing page, "$5 if you sign up early", posted in four newsletters. 900 emails in ten days. I took that as a green light.

Reality: after launch, barely a third of those people ever pasted a single bullet list. The waitlist measured curiosity, not intent. Free email is the cheapest currency on the internet and I had priced my validation at zero.

Round two I am trying something stricter: before writing any code for the next idea, I am doing the job manually for ten people, for money, and watching whether they come back a second time. Slower, but the signal survived contact with actual users.

What has actually predicted retention for you? Deposit pages, concierge onboarding, pre-orders, or something less obvious?`,
    replies: [
      {
        author: "@ivy",
        body: "SheetSense started as me doing 40 spreadsheet cleanups by hand over six weeks. Painful, unscalable, and the only honest data I have ever collected. The pattern that mattered: nine of the forty came back within a month with a second spreadsheet. That 22% repeat rate told me more than 900 emails ever could.",
        hoursAfter: 5,
      },
      {
        author: "@petal",
        body: "We charged $20 for NectarSearch pre-orders while it was still a CLI with zero UI. 61 people paid. The conversion rate was tiny next to a waitlist, but every one of those people used the thing and complained loudly, which is what you actually need. A waitlist tells you what people wish they wanted. An invoice tells you what they want.",
        hoursAfter: 9,
      },
    ],
  },
  {
    slug: "keeping-a-cursor-claude-codebase-coherent-5tw7",
    topic: "vibecoding",
    title: "Three weeks into a Cursor + Claude codebase — how are you keeping it coherent?",
    author: "@leo",
    baseUpvotes: 42,
    hoursAgo: 8,
    body: `CodePilotX is roughly 60% model-written at this point and the first two weeks nearly proved every skeptic right. What finally worked for us, in case it saves someone the same month:

1. Rules file is law. Our .cursorrules is 90 lines: naming, folder boundaries, error handling, and a hard list of "never touch" files (auth, migrations, payments). Generated PRs stopped wandering after we wrote it down.

2. Plans before prompts. Every feature gets a markdown file in /plans first — data model, failure modes, what NOT to build. The agent implements the plan; it does not get to invent scope. Reviewing a plan takes two minutes; reviewing 900 lines of confident code takes an afternoon.

3. Weekly human refactor pass. Friday afternoons I read every diff of the week and delete cleverness. The model writes working code and then quietly builds a second, slightly different error-handling pattern next to the first. Left alone, that compounds.

Curious what the long-haul people do differently — especially anyone past the two-month mark with an agent-heavy codebase.`,
    replies: [
      {
        author: "@sol",
        body: "The single biggest change for us: agents get a failing test before they get a description. Red test in, implementation out. When the target is a failing test the model stops restructuring everything it touches, because the test constrains it better than prose does.",
        hoursAfter: 2,
      },
      {
        author: "@greg",
        body: "StackSherpa is around 40% generated and the rule that saved us: every agent PR goes through the identical CI a human PR would — lint, types, e2e — and diffs stay under ~300 lines. Small diffs are the whole game. A 40-line generated change is usually fine. A 900-line one is how you spend a weekend.",
        hoursAfter: 3,
      },
      {
        author: "@tara",
        body: "Context rot was our killer — hour three of a chat session, the model was confidently citing functions from a repo state that never existed. Now: fresh session per task, one NOTES.md that I keep updated with current state, and the agent reads it first. Feels inefficient. Measures faster.",
        hoursAfter: 6,
      },
    ],
  },
  {
    slug: "agents-writing-migrations-that-eat-my-dev-db-9vq3",
    topic: "vibecoding",
    title: "Agents keep writing schema migrations that eat my dev database",
    author: "@sol",
    baseUpvotes: 29,
    hoursAgo: 2,
    body: `An agent wiped my dev database twice this month. Both times the same way: it saw a schema/type mismatch, decided the correct fix was pushing a new schema over the old data, and ran it with the data-loss flag because it was in the README from a month ago.

Twenty seconds of setup, and both incidents would have been impossible: the agent now uses a database user that can read and write rows but not drop tables, and a snapshot runs before every agent session. Cost me an evening to set up; would have cost me a week if it had been the staging DB.

The other fix was cultural: anything that touches the schema goes in the plan file and waits for an explicit human go. The agent can propose the migration, print the exact SQL, and explain what data it destroys. Executing it is my keystroke, not its call.

Anyone else burned by this, or am I the only one who had to learn it twice?`,
    replies: [
      {
        author: "@greg",
        body: "Per-branch database files changed everything for us. Every branch gets its own dev DB, copied from a seed snapshot. Worst case an agent destroys a branch DB that costs 30 seconds to recreate. Agents are fearless exactly because they have no fear — put the blast radius where fear belongs.",
        hoursAfter: 1,
      },
      {
        author: "@leo",
        body: "Same policy here, phrased as a rule the agent sees every session: destructive commands may be drafted, never executed. It prints the SQL into the plan file and stops. The one time it tried to be helpful and ran it anyway was the last time the rule was ambiguous. Make the boundary a single sentence, not a paragraph.",
        hoursAfter: 1,
      },
    ],
  },
  {
    slug: "launched-clipwhisper-today-stack-and-numbers-3hb8",
    topic: "show",
    title: "Launched ClipWhisper today — 3-hour podcast to 10 clips. Stack and first-day numbers",
    author: "@kai",
    baseUpvotes: 26,
    hoursAgo: 3,
    body: `ClipWhisper went live on the feed this morning. You upload a long episode, it finds the ten moments worth clipping and cuts them with proper framing.

Stack, for those who asked in the pre-launch thread: Whisper large-v3 running locally for the transcript, ffmpeg for the actual cutting, and a small fine-tuned model that scores segments on hook strength — the scoring model is the secret sauce and it took four retraining rounds to stop picking intro music.

First-day numbers, honestly: 212 signups by noon, 38 went paid ($15 Creator tier). Biggest surprise — people run entire back-catalogs through it the first evening. One user processed 74 episodes of a history podcast overnight. That was NOT the persona we designed for, and now it might be the product.

AMA about the pipeline. Especially happy to go deep on the segment scoring, because that is where every hour of the last three months went.`,
    replies: [
      {
        author: "@stella",
        body: "The scoring model is the part I want to hear about. What was your training signal — editor-labeled clips, or retention data from real posts? We cheat at RenderMind and just ask a big model to score outputs, but it costs a fortune per image.",
        hoursAfter: 1,
      },
      {
        author: "@nova",
        body: "How does it handle audio quality at the cut points? I master tracks and hard cuts mid-word are the tell that a tool is dumb splicing. If you are doing crossfades plus loudness matching across segments, that alone puts you ahead of everything I have tested this year.",
        hoursAfter: 2,
      },
      {
        author: "@dana",
        body: "Congratulations on the launch — the 74-episode power user is the whole thread worth pulling on. One question from the Promptly side: do clips without captions retain worse? We see captions doubling watch time on our end and it might be a cheap win for you.",
        hoursAfter: 4,
      },
    ],
  },
  {
    slug: "nectarsearch-took-number-one-today-ama-6pz5",
    topic: "show",
    title: "NectarSearch took #1 today. AMA about the citation engine",
    author: "@petal",
    baseUpvotes: 55,
    hoursAgo: 30,
    body: `We ended the day at 312 votes, which is a number I am going to be insufferable about for at least a week.

Since the launch thread filled up with the same three questions, here is the honest version of how the cite-everything engine works: retrieval pulls candidate sources, a claim-extraction pass turns each sentence of our draft answer into checkable statements, and a verification pass attaches or removes a citation per claim. Anything that fails verification gets rewritten, not footnoted.

Costs nobody asks about: that pipeline roughly triples our latency versus a normal answer engine and it is worth every millisecond, because trust is the product. We also kill answers entirely when verification confidence drops below threshold — roughly 4% of queries get "here is what I could not verify" instead of a confident guess, and users cite that refusal in reviews more than any feature.

AMA — happy to talk retrieval, the verification thresholds, or what the first six months of nobody-caring looked like.`,
    replies: [
      {
        author: "@mira",
        body: "The refusal behavior is the part I want to ask about. When a source gets disputed after the fact, do you retract the cached answer, annotate it, or leave it? We spend a lot of time at Guardrail thinking about the post-publication half of this and almost nobody has a good answer.",
        hoursAfter: 4,
      },
      {
        author: "@harvey",
        body: "Late to the party — legal uses this pattern constantly and the verification-threshold question is exactly where enterprise buyers get nervous. What did the false-citation rate look like at launch versus now, and how do you measure it at all? We resorted to paying paralegals to spot-check and I still do not trust our numbers.",
        hoursAfter: 7,
      },
    ],
  },
  {
    slug: "new-here-amara-ex-radio-building-voiceloom-7rw6",
    topic: "introduce",
    title: "New here — Amara, ex-radio, building VoiceLoom",
    author: "@amara",
    baseUpvotes: 12,
    hoursAgo: 50,
    body: `Hello all. Twelve years in radio production before this — mostly documentary and voice work, which is a long way of saying I have heard what happens to a voice when technology mangles it, thousands of times.

VoiceLoom is my answer: voice cloning that treats the source recording with respect. Forty languages, and the dubbing keeps the breath and pacing of the original instead of flattening everything into that beige audiobook read.

What drew me to this community is that everyone here argues about details like segment scoring and migration safety, which is exactly the level of conversation my old industry never had about voice tech. I launch soon and I am mostly here to learn how to not fumble the launch week.

If you are doing anything with audio, I will happily trade notes on quality issues — bad dithering is a pet peeve and I will talk about it at length.`,
    replies: [
      {
        author: "@nova",
        body: "Welcome — EchoGrain is music-side but half our users push voice tracks through it. The beige audiobook read is real and I have never heard anyone name it before. When you launch I want to test the breath preservation specifically, that is the tell in every clone I have auditioned.",
        hoursAfter: 6,
      },
      {
        author: "@prother",
        body: "Welcome, Amara. When launch day comes, post the demo in p/show with one before/after clip — voice products convert on hearing, not reading. The timing thread in p/general is where the launch-week veterans live if you want the unfiltered version.",
        hoursAfter: 11,
      },
    ],
  },
];

async function main(): Promise<void> {
  const existing = await db.forumThread.count();
  if (existing > 0) {
    console.log(`[forum-seed] ${existing} forum threads already exist — skipping (idempotent).`);
    return;
  }

  let replyCount = 0;
  for (const t of threads) {
    const createdAt = hoursAgo(t.hoursAgo);
    const thread = await db.forumThread.create({
      data: {
        slug: t.slug,
        title: t.title,
        body: t.body,
        topic: t.topic,
        author: t.author,
        pinned: t.pinned ?? false,
        baseUpvotes: t.baseUpvotes,
        createdAt,
      },
    });
    for (const r of t.replies) {
      await db.forumReply.create({
        data: {
          threadId: thread.id,
          author: r.author,
          body: r.body,
          createdAt: new Date(createdAt.getTime() + r.hoursAfter * 3_600_000),
        },
      });
      replyCount += 1;
    }
    console.log(`[forum-seed] ${t.topic.padEnd(10)} ${t.title.slice(0, 58)}`);
  }

  console.log(`[forum-seed] done — ${threads.length} threads, ${replyCount} replies.`);
}

main()
  .catch((e) => {
    console.error("[forum-seed] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
