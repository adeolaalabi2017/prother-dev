import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  EyeOff,
  Layers,
  Mail,
  ShieldCheck,
  SquareStack,
  Tag,
  Triangle,
} from "lucide-react";
import { db } from "@/lib/prother";
import { CATEGORIES } from "@/components/prother/categories";

export const metadata: Metadata = {
  title: "Advertise on Prother",
  description:
    "Put your product in front of the builders, founders, and early adopters who search, compare, and vote on AI tools every day. Clearly-labeled placements, one sponsor per slot.",
};

async function getStats() {
  try {
    const [tools, launchSum, votes, posts] = await Promise.all([
      db.tool.count({ where: { status: "live" } }),
      db.launch.aggregate({ _sum: { baseUpvotes: true } }),
      db.vote.count(),
      db.post.count({ where: { status: "published" } }),
    ]);
    return {
      tools,
      // The vote total the audience actually sees on the feed:
      // seeded editorial scores + live community votes.
      votes: (launchSum._sum.baseUpvotes ?? 0) + votes,
      posts,
      categories: CATEGORIES.length,
    };
  } catch {
    return { tools: 0, votes: 0, posts: 0, categories: CATEGORIES.length };
  }
}

const PLACEMENTS = [
  {
    icon: Triangle,
    kicker: "PLACEMENT 01",
    title: "Sponsored feed placement",
    body: "Your product appears in the day's ranked feed, clearly labeled Promoted, beside the launches it competes with. One sponsored row per day — never more.",
    // Mini feed-row mock, rendered in markup (no images to keep the page fast)
    mock: "feed" as const,
  },
  {
    icon: SquareStack,
    kicker: "PLACEMENT 02",
    title: "Journal sponsorship",
    body: "Sponsor an issue of the Journal — the weekly brief on what shipped and why it matters. Named at the top, one sponsor per issue, no interstitials.",
    mock: "journal" as const,
  },
  {
    icon: Layers,
    kicker: "PLACEMENT 03",
    title: "Category spotlight",
    body: "Hold the top slot of a category in the directory for a day, a week, or a month. You pick the aisle; we keep the shelves honest.",
    mock: "category" as const,
  },
];

const PRINCIPLES = [
  {
    icon: Tag,
    title: "Labeled, always",
    body: "Every paid placement carries a visible Promoted chip. If a reader can't tell, we've failed.",
  },
  {
    icon: SquareStack,
    title: "One sponsor per slot",
    body: "Fixed prices, no bidding wars, no auction clutter. The slot sells out or it stays empty.",
  },
  {
    icon: ShieldCheck,
    title: "Editorial firewall",
    body: "Advertising never touches rankings, reviews, or Editor's Pick. Those are earned, not bought.",
  },
  {
    icon: EyeOff,
    title: "Readers first",
    body: "No popups, no autoplay, no email gates. If a placement would annoy the feed, we don't sell it.",
  },
];

/** Decorative floating product tiles — the on-brand stand-in for PH's avatar cloud. */
const FLOAT_TILES = [
  { emoji: "🤖", cls: "left-[6%] top-[12%] size-16 rotate-[-8deg] from-orange-500/70 to-rose-600/70", delay: "0s" },
  { emoji: "⚡", cls: "left-[30%] top-[4%] size-12 rotate-[6deg] from-amber-400/70 to-orange-600/70", delay: "0.6s" },
  { emoji: "🧠", cls: "right-[28%] top-[10%] size-14 rotate-[-5deg] from-fuchsia-500/60 to-purple-700/60", delay: "1.1s" },
  { emoji: "📊", cls: "right-[8%] top-[28%] size-16 rotate-[9deg] from-emerald-400/60 to-teal-600/60", delay: "0.3s" },
  { emoji: "🎙", cls: "left-[14%] bottom-[16%] size-14 rotate-[7deg] from-sky-400/60 to-blue-700/60", delay: "0.9s" },
  { emoji: "✍️", cls: "right-[20%] bottom-[8%] size-12 rotate-[-10deg] from-yellow-400/60 to-amber-600/60", delay: "1.4s" },
];

export default async function AdvertisePage() {
  const stats = await getStats();
  const statCards = [
    { label: "TOOLS LISTED", value: stats.tools > 0 ? `${stats.tools}` : "—" },
    { label: "VOTES CAST", value: stats.votes > 0 ? stats.votes.toLocaleString("en-US") : "—" },
    { label: "CATEGORIES", value: `${stats.categories}` },
    { label: "JOURNAL POSTS", value: `${stats.posts}` },
  ];

  return (
    <div className="bg-ink">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* decorative tile cloud — hidden from assistive tech + mobile */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          {FLOAT_TILES.map((t, i) => (
            <span
              key={i}
              style={{ animationDelay: t.delay }}
              className={`absolute grid place-items-center rounded-2xl border border-white/15 bg-gradient-to-br text-2xl shadow-lg animate-[float-y_7s_ease-in-out_infinite] ${t.cls}`}
            >
              {t.emoji}
            </span>
          ))}
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            <span aria-hidden className="h-px w-6 bg-ember/70" />
            Advertise on Prother
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tighter text-white sm:text-5xl">
            Put your product in front of people{" "}
            <span className="text-ember">hunting for AI tools.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">
            Prother&apos;s audience arrives with intent — they search, compare, and vote on AI
            products every day. Reach them at the moment they&apos;re deciding what to adopt.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="mailto:makers@prother.dev?subject=Advertising%20on%20Prother"
              className="inline-flex items-center gap-2 rounded-lg bg-ember px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-ember-hot"
            >
              <Mail className="size-4" aria-hidden />
              Get started
            </a>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-ember/40 hover:text-white"
            >
              List your product free
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Real, live platform stats */}
          <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {statCards.map((s) => (
              <div key={s.label} className="bg-coal px-5 py-4">
                <dd className="font-mono text-2xl font-bold tabular-nums text-white">{s.value}</dd>
                <dt className="mt-1 font-mono text-[10px] tracking-[0.2em] text-white/40">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Placements ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
          Find your audience
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tighter text-white sm:text-4xl">
          Three placements. No clutter.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
          Each slot is fixed-price and capped at one sponsor. You buy the audience&apos;s
          attention for a moment — not a popunder they&apos;ll learn to ignore.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLACEMENTS.map((p) => (
            <article
              key={p.title}
              className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-coal transition-colors hover:border-ember/40"
            >
              {/* mini visual mock per placement */}
              <div className="border-b border-white/10 bg-ink/60 p-4">
                {p.mock === "feed" && (
                  <div aria-hidden className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-500/70 to-rose-600/70 text-base">
                      ⌘
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white/90">
                        YourTool{" "}
                        <span className="ml-1 rounded-full bg-ember/15 px-1.5 py-px font-mono text-[9px] text-ember">
                          Promoted
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-white/45">
                        Your tagline, in the daily ranked feed
                      </p>
                    </div>
                    <span className="flex flex-col items-center rounded-md border border-white/10 px-2 py-1 text-white/50">
                      <Triangle className="size-3" />
                      <span className="font-mono text-[10px]">▲</span>
                    </span>
                  </div>
                )}
                {p.mock === "journal" && (
                  <div aria-hidden className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-mono text-[9px] tracking-[0.2em] text-white/40">
                        PROTHER JOURNAL
                      </span>
                      <span className="font-mono text-[9px] text-ember">SPONSORED BY YourTool</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <span className="block h-2 w-3/4 rounded bg-white/15" />
                      <span className="block h-2 w-1/2 rounded bg-white/10" />
                    </div>
                  </div>
                )}
                {p.mock === "category" && (
                  <div aria-hidden className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between rounded-md bg-ember/10 px-2.5 py-1.5">
                      <span className="font-mono text-[10px] text-ember">
                        ① SPOTLIGHT — YourTool
                      </span>
                      <span className="font-mono text-[9px] text-white/40">CATEGORY PAGE</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <span className="block h-2 w-2/3 rounded bg-white/10" />
                      <span className="block h-2 w-5/6 rounded bg-white/5" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="font-mono text-[10px] tracking-[0.25em] text-white/35">{p.kicker}</p>
                <h3 className="mt-2 text-lg font-bold text-white">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{p.body}</p>
                <a
                  href={`mailto:makers@prother.dev?subject=${encodeURIComponent(`Placement inquiry — ${p.title}`)}`}
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-ember transition-colors hover:text-ember-hot"
                >
                  Get started <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Principles ───────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-coal/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
            House rules
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tighter text-white sm:text-4xl">
            Advertising that respects the feed
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((pr) => (
              <div key={pr.title} className="rounded-2xl border border-white/10 bg-ink p-5">
                <pr.icon className="size-5 text-ember" aria-hidden />
                <h3 className="mt-3 font-bold text-white">{pr.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/50">{pr.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-black tracking-tighter text-white sm:text-4xl">
          Tell us your launch window.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
          We&apos;ll reply with the media kit, current slot availability, and fixed pricing —
          usually within a day.
        </p>
        <a
          href="mailto:makers@prother.dev?subject=Advertising%20on%20Prother"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-ember px-6 py-3 font-mono text-sm font-semibold text-black transition-colors hover:bg-ember-hot"
        >
          <Mail className="size-4" aria-hidden />
          makers@prother.dev
        </a>
      </section>
    </div>
  );
}
