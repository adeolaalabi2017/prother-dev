"use client";

import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";

const STATS = [
  {
    value: "7",
    title: "Curated categories",
    body: "From chatbots to developer platforms: a taxonomy built for how AI actually ships, not a junk drawer.",
  },
  {
    value: "0",
    title: "Spam tools, ever",
    body: "Every listing passes all six published standards before it can be listed. Curation is never sold.",
  },
  {
    value: "$0",
    title: "Forever",
    body: "Searching, comparing, and saving are free. Listings are free. Sponsored slots are labeled, never blended in.",
  },
];

const STEPS = [
  {
    n: "01 · SEARCH",
    title: "Query or browse",
    body: "Search the whole directory, or browse the seven categories from chatbots to dev platforms.",
    highlight: false,
  },
  {
    n: "02 · COMPARE",
    title: "Side by side",
    body: "Pricing, features, and reviews in one view. Decide between two tools in minutes.",
    chips: ["PRICING", "FEATURES", "REVIEWS"],
    highlight: true,
  },
  {
    n: "03 · SAVE",
    title: "Build your stack",
    body: "Collections, follows, and shareable stacks: keep the tools you rely on in one place.",
    highlight: false,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export function HowItWorks() {
  return (
    <section className="bg-cream py-24 text-ink">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-end gap-10 lg:grid-cols-2">
          <motion.h2
            {...fadeUp}
            className="text-5xl leading-[0.95] font-black tracking-tighter md:text-6xl"
          >
            One directory.
            <br />
            Every AI tool that matters.
          </motion.h2>
          <motion.p {...fadeUp} className="text-lg text-black/70">
            Prother is one curated place to find AI tools:{" "}
            <span className="font-semibold text-[#A83E00]">honest pricing, real reviews</span>, and
            every listing checked against six published standards. No link dumps. No
            infinite scroll. No pay-to-win.
          </motion.p>
        </div>

        {/* Dark flow panel with dot grid */}
        <motion.div
          {...fadeUp}
          className="mt-14 rounded-3xl bg-ink p-6 text-white md:p-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {STEPS.map((step, i) => (
              <div key={step.n} className="contents">
                <div
                  className={
                    step.highlight
                      ? "rounded-2xl bg-ember p-6 text-coal transition-transform duration-200 hover:scale-[1.02]"
                      : "rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                  }
                >
                  <p
                    className={`font-mono text-xs ${
                      step.highlight ? "text-black/70" : "text-white/50"
                    }`}
                  >
                    {step.n}
                  </p>
                  <h3
                    className={`mt-2 text-xl ${
                      step.highlight ? "font-black" : "font-bold"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className={`mt-2 text-sm ${step.highlight ? "text-black/70" : "text-white/60"}`}>
                    {step.body}
                  </p>
                  {step.chips && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {step.chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-black/15 px-2.5 py-1 font-mono text-xs text-coal"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden items-center md:flex" aria-hidden>
                    <MoveRight className="size-6 text-ember" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.title}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
              className="rounded-2xl border border-black/10 bg-white p-6"
            >
              <p className="text-5xl font-black text-[#A83E00]">{s.value}</p>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-black/70">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
