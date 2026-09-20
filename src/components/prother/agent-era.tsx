"use client";

import { motion } from "framer-motion";

const POINTS = [
  {
    n: "01",
    title: "Community-ranked",
    body: "Upvotes from people who show up specifically for AI. Fresh vote pool on every launch.",
  },
  {
    n: "02",
    title: "Editor's pick",
    body: "We test what we feature. The 'why' in two sentences. Never sold, ever.",
  },
  {
    n: "03",
    title: "Free forever",
    body: "Submitting is free. Launching is free. The digest is free. Trust is the product.",
  },
];

export function AgentEra() {
  return (
    <section className="bg-ember py-24 text-black">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-black/60">
            BUILT FOR THE LAUNCH ERA
          </p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-black tracking-tighter md:text-6xl">
            Your tool needs a launch day, not a link drop.
          </h2>
          <p className="mt-6 text-lg text-black/70">
            Coding agents build, test, and review in loops. A launch on Prother gives every loop a
            real audience — for screenshots, webhooks, evals, or a human who wants to click around.
          </p>

          <ul className="mt-8 divide-y divide-black/15 border-y border-black/15">
            {POINTS.map((p) => (
              <li key={p.n} className="flex gap-5 py-4">
                <span className="w-8 shrink-0 font-mono text-sm text-black/60" aria-hidden>
                  {p.n}
                </span>
                <div>
                  <h3 className="font-bold">{p.title}</h3>
                  <p className="mt-0.5 text-sm text-black/70">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="overflow-hidden rounded-2xl border border-black/20 bg-ink shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="ml-2 font-mono text-xs text-white/50">launch-day — zsh</span>
          </div>
          <div className="space-y-1.5 p-5 font-mono text-[13px] text-white/90">
            <p>
              <span className="text-ember">$</span> prother launch --day 2026-09-19
            </p>
            <p>
              <span className="text-emerald-400">✓</span> Standards S1–S6
              <span className="float-right text-white/60">6/6 passed</span>
            </p>
            <p>
              <span className="text-emerald-400">✓</span> Slot reserved
              <span className="float-right text-white/60">09:00 UTC</span>
            </p>
            <p>
              <span className="text-emerald-400">✓</span> Launch kit sent
              <span className="float-right text-white/60">makers@prother.dev</span>
            </p>
            <p>
              <span className="text-emerald-400">✓</span> Live on the feed
              <span className="float-right">
                rank #2 · <span className="text-ember-hot">▲31</span>
              </span>
            </p>
            <p className="flex items-center pt-2">
              <span className="text-ember">$</span>
              <span className="ml-2 inline-block h-4 w-2 animate-pulse bg-ember" aria-hidden />
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
