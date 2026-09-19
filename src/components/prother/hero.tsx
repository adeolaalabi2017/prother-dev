"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

/** Decorative hero background — glow, concentric rings, ember dashes. */
function HeroBackdrop() {
  const rings = [
    { size: 400, cls: "right-[-60px] top-[60px]" },
    { size: 560, cls: "right-[-140px] top-[-20px]" },
    { size: 720, cls: "right-[-220px] top-[-100px]" },
    { size: 900, cls: "right-[-300px] top-[-190px]" },
  ];
  const dashes = [
    { cls: "right-[8%] top-[18%] rotate-45" },
    { cls: "right-[30%] top-[10%] -rotate-12" },
    { cls: "right-[16%] top-[62%] rotate-[65deg]" },
    { cls: "right-[42%] top-[70%] -rotate-45" },
    { cls: "right-[4%] top-[42%] rotate-12" },
    { cls: "right-[26%] top-[38%] rotate-[30deg]" },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* big radial ember glow */}
      <div className="absolute right-[-120px] top-[-160px] h-[600px] w-[600px] rounded-full bg-ember/25 blur-[120px]" />
      <div className="absolute left-[-180px] bottom-[-260px] h-[420px] w-[420px] rounded-full bg-ember/10 blur-[120px]" />

      {/* concentric rings */}
      {rings.map((r) => (
        <div
          key={r.size}
          className={`absolute rounded-full border border-white/5 ${r.cls}`}
          style={{ width: r.size, height: r.size }}
        />
      ))}

      {/* thin rotated ember dashes */}
      {dashes.map((d, i) => (
        <div key={i} className={`absolute h-px w-24 bg-ember/40 ${d.cls}`} />
      ))}
    </div>
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
      <HeroBackdrop />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="inline-flex items-center rounded-full border border-ember/40 bg-ember/10 px-4 py-1.5 font-mono text-xs text-ember">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-ember" aria-hidden />
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

        {/* Right — terminal panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#111010] shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="ml-2 font-mono text-xs text-white/50">daily-digest — zsh</span>
          </div>
          <div className="p-5 font-mono text-[13px] leading-relaxed">
            <p className="text-white">
              <span className="text-ember">$</span> prother digest --today
            </p>
            <p className="text-white/80">⬡ THE DAILY LAUNCH — {dayLabel}</p>
            <p className="mt-2 text-white/80">
              🏆 #1 {top1?.name ?? "Promptly"} — {top1?.tagline ?? "AI chatbots that never hallucinate citations"}
              <span className="float-right text-ember">▲{top1?.votes ?? 47}</span>
            </p>
            <p className="mt-2 text-white/80">
              📈 CLIMBING&nbsp;&nbsp;{top2?.name ?? "NectarSearch"} <span className="text-ember">▲{top2?.votes ?? 312}</span> ·{" "}
              {top3?.name ?? "FlowStein"} <span className="text-ember">▲{top3?.votes ?? 288}</span>
            </p>
            <p className="mt-2 text-white/80">
              ⭐ EDITOR&apos;S PICK&nbsp;&nbsp;{pick?.name ?? "PixelForge"} — {pick?.tagline ?? "sketches in, design systems out"}
            </p>
            <p className="mt-2 text-white/50">→ {moreCount} more launches · read in 5 min</p>
            <p className="mt-3 flex items-center">
              <span className="text-ember">$</span>
              <span className="ml-2 inline-block h-4 w-2 animate-pulse bg-ember" aria-hidden />
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
