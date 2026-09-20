"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GatewayFlow from "@/components/ui/gateway-flow";
import { WaitlistForm } from "./waitlist-form";
import { useFeed } from "./use-feed";

function SocialProofCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/waitlist")
      .then((r) => r.json() as Promise<{ count: number }>)
      .then((d) => {
        if (alive) setCount(d.count);
      })
      .catch(() => {
        /* keep placeholder */
      });
    // Waitlist joins elsewhere on the page (sidebar / final CTA) bump this instantly.
    const onJoin = (e: Event) => {
      const c = (e as CustomEvent).detail?.count;
      if (typeof c === "number") setCount(c);
    };
    window.addEventListener("prother:waitlist", onJoin);
    return () => {
      alive = false;
      window.removeEventListener("prother:waitlist", onJoin);
    };
  }, []);

  return (
    <strong className="font-semibold text-white/80">
      {count === null ? "412+" : count.toLocaleString("en-US")}
    </strong>
  );
}

export function Hero() {
  const { feed } = useFeed();
  const todayCount = feed ? String(feed.todayCount) : "12";

  // Terminal mirrors the live feed (falls back to seeded copy until loaded).
  const top1 = feed?.top[0];
  const top2 = feed?.top[1];
  const top3 = feed?.top[2];
  const pick = feed?.editorsPick;
  const moreCount = feed ? Math.max(0, feed.todayCount - 4) : 8;
  const dayLabel = feed?.dayLabel ?? "Sat, Sep 19";

  return (
    <section id="top" className="relative overflow-hidden pt-16 pb-20 md:pt-20">
      {/* Gateway Flow background — dashed bezier streams converge on the hero
          center with ember particles riding the curves; clicking the hero fires
          a shockwave that bends the flow. Replaces the rings/rays backdrop. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 46%, rgba(255,106,0,0.13) 0%, rgba(255,106,0,0.05) 34%, transparent 62%)",
          }}
        />
        <GatewayFlow
          className="absolute inset-0"
          speed={0.9}
          density={0.85}
          opacity={0.9}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="inline-flex items-center rounded-full border border-ember/40 bg-ember/10 px-4 py-1.5 font-mono text-xs text-ember">
            <span
              className="mr-2 inline-block size-1.5 rounded-full bg-ember animate-status-pulse"
              aria-hidden
            />
            Now onboarding founding makers — first 500 get launch priority
          </p>

          <h1 className="mt-6 text-6xl leading-[0.95] font-black tracking-tighter text-white md:text-7xl xl:text-8xl">
            Where AI products
            <br />
            <span className="text-ember">launch.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/70">
            Every day, a fresh batch of AI tools goes live on one page. Prother shows you what
            launched, what&apos;s climbing, and what&apos;s actually worth your time — before your
            feed does.
          </p>

          <div className="mt-8 max-w-md">
            <WaitlistForm source="hero" dark />
          </div>

          <p className="mt-4 text-sm text-white/50">
            Join <SocialProofCount /> founders, developers, and AI-curious builders already on the
            list.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: `${todayCount} launches today` },
              { label: "10 categories" },
              { label: "6 standards" },
              { label: "1 email a day" },
              { label: "$0 forever" },
            ].map((s) => (
              <li
                key={s.label}
                className="font-mono text-[11px] tracking-[0.2em] text-white/50 uppercase"
              >
                {s.label}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right — terminal panel (entrance slide on motion.div, then a
            gentle float-y breathe on the inner panel; hover pauses the float) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="will-change-transform"
        >
          <div className="animate-float-y overflow-hidden rounded-2xl border border-white/10 bg-[#111010] shadow-2xl hover:[animation-play-state:paused]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="size-3 rounded-full bg-white/15" aria-hidden />
              <span className="size-3 rounded-full bg-white/15" aria-hidden />
              <span className="size-3 rounded-full bg-white/15" aria-hidden />
              <span className="ml-2 font-mono text-xs text-white/50">daily-digest — zsh</span>
            </div>
            <div className="p-5 font-mono text-[13px] leading-relaxed">
              <p className="term-line text-white" style={{ animationDelay: "0.05s" }}>
                <span className="text-ember">$</span> prother digest --today
              </p>
              <p className="term-line mt-2 text-white/80" style={{ animationDelay: "0.25s" }}>
                ⬡ THE DAILY LAUNCH — {dayLabel}
              </p>
              <p className="term-line mt-2 text-white/80" style={{ animationDelay: "0.45s" }}>
                🏆 #1 {top1?.name ?? "Promptly"} — {top1?.tagline ?? "AI chatbots that never hallucinate citations"}
                <span className="float-right text-ember">▲{top1?.votes ?? 47}</span>
              </p>
              <p className="term-line mt-2 text-white/80" style={{ animationDelay: "0.65s" }}>
                📈 CLIMBING&nbsp;&nbsp;{top2?.name ?? "NectarSearch"} <span className="text-ember">▲{top2?.votes ?? 312}</span> ·{" "}
                {top3?.name ?? "FlowStein"} <span className="text-ember">▲{top3?.votes ?? 288}</span>
              </p>
              <p className="term-line mt-2 text-white/80" style={{ animationDelay: "0.85s" }}>
                ⭐ EDITOR&apos;S PICK&nbsp;&nbsp;{pick?.name ?? "PixelForge"} — {pick?.tagline ?? "sketches in, design systems out"}
              </p>
              <p className="term-line mt-2 text-white/50" style={{ animationDelay: "1.05s" }}>
                → {moreCount} more launches · read in 5 min
              </p>
              <p className="term-line mt-3 flex items-center" style={{ animationDelay: "1.2s" }}>
                <span className="text-ember">$</span>
                <span className="animate-caret ml-2 inline-block h-4 w-2 bg-ember" aria-hidden />
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
