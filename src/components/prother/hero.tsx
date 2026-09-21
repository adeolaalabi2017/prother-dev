"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GatewayFlow from "@/components/ui/gateway-flow";
import { HeroSearch } from "./hero-search";
import { useFeed } from "./use-feed";

export function Hero() {
  const { feed } = useFeed();
  const todayCount = feed ? String(feed.todayCount) : "12";

  // Admin-manageable site copy (/api/site ← Site settings KV). Falls back to
  // the locked defaults when the store is empty — the hero never breaks.
  const [copy, setCopy] = useState({
    announcement: "Open now — today's launches are live on the feed",
    headline: "Where AI products get discovered.",
    subline:
      "Every day, a fresh batch of AI tools goes live on one page. Prother shows you what launched, what’s climbing, and what’s actually worth your time — before your feed does.",
  });

  useEffect(() => {
    let alive = true;
    fetch("/api/site")
      .then((r) => r.json() as Promise<{ settings: Record<string, string> }>)
      .then((d) => {
        if (!alive || !d.settings) return;
        setCopy((prev) => ({
          announcement: d.settings["hero.announcement"] || prev.announcement,
          headline: d.settings["hero.headline"] || prev.headline,
          subline: d.settings["hero.subline"] || prev.subline,
        }));
      })
      .catch(() => {
        /* defaults hold */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Last word renders in ember — “Where AI products get discovered.” → discovered.
  const headlineWords = copy.headline.split(" ");
  const headlineBody = headlineWords.slice(0, -1).join(" ");
  const headlineAccent = headlineWords.at(-1) ?? "";

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

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
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
            {copy.announcement}
          </p>

          <h1 className="mt-6 text-6xl leading-[0.95] font-black tracking-tighter text-white md:text-7xl xl:text-8xl">
            {headlineBody ? (
              <>
                {headlineBody}
                <br />
                <span className="text-ember">{headlineAccent}</span>
              </>
            ) : (
              <span className="text-ember">{headlineAccent}</span>
            )}
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
            {copy.subline}
          </p>

          {/* Discovery-first hero: comprehensive search replaces the email
              capture. The feed is open — no gates. */}
          <div className="mx-auto mt-8 w-full max-w-xl">
            <HeroSearch />
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { label: `${todayCount} launches today` },
              { label: "10 categories" },
              { label: "6 standards" },
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
      </div>
    </section>
  );
}
