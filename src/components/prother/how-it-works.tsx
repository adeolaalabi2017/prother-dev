"use client";

import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";

const STATS = [
  {
    value: "≤5 min",
    title: "Daily digest scan",
    body: "One email. Today's launches, top climbers, one editor's pick. Skimmable before your coffee cools.",
  },
  {
    value: "0",
    title: "Spam tools, ever",
    body: "Every listing passes all six published standards before it can launch. Curation is never sold.",
  },
  {
    value: "10",
    title: "AI-native categories",
    body: "From chatbots to vertical AI — a taxonomy built for how AI actually ships, not a junk drawer.",
  },
];

const STEPS = [
  {
    n: "01 · YOU SUBMIT",
    title: "Your AI tool",
    body: "Live URL required. No waitlists, no coming-soon pages, no vaporware.",
    highlight: false,
  },
  {
    n: "02 · WE VERIFY",
    title: "Standards S1–S6",
    body: "A human editor checks every listing against the public quality bar.",
    chips: ["LIVE CHECK", "AI-NATIVE", "HONEST PRICING"],
    highlight: true,
  },
  {
    n: "03 · YOU LAUNCH",
    title: "The daily feed",
    body: "Community-ranked. Editor's pick. Reaches an audience that shows up for AI.",
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
            Your tool goes live.
            <br />
            The crowd shows up.
          </motion.h2>
          <motion.p {...fadeUp} className="text-lg text-black/70">
            A launch on Prother is a real event —{" "}
            <span className="font-semibold text-[#C24A00]">one curated batch per day</span>, ranked
            live by the community, reviewed against six published standards. No link dumps. No
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
                      ? "rounded-2xl bg-ember p-6 text-black transition-transform duration-200 hover:scale-[1.02]"
                      : "rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                  }
                >
                  <p
                    className={`font-mono text-xs ${
                      step.highlight ? "text-black/60" : "text-white/50"
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
                          className="rounded-full bg-black/15 px-2.5 py-1 font-mono text-[10px] text-black"
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
              <p className="text-5xl font-black text-[#C24A00]">{s.value}</p>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-black/60">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
