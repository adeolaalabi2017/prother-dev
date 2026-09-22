"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const POINTS = [
  {
    n: "01",
    title: "Rated by real reviews",
    body: "Ratings from published reviews — ease, power, value — not popularity contests.",
  },
  {
    n: "02",
    title: "Editor's pick",
    body: "We test what we feature. The 'why' in two sentences. Never sold, ever.",
  },
  {
    n: "03",
    title: "Free forever",
    body: "Searching is free. Saving is free. Listings are free. Trust is the product.",
  },
];

const COMMAND = 'prother search "translate video into 12 languages"';
// Indices 0–2 are the revealed output lines; index 3 is the idle prompt + cursor.
const OUTPUT_COUNT = 3;

// Complete final transcript for assistive tech (announced once, never per-char).
const TRANSCRIPT = [
  '$ prother search "translate video into 12 languages"',
  "→ 3 tools · 2 open source · from $0",
  "$ prother compare runway heygen",
  '✓ saved to collection "localization stack"',
  "$ ▊",
].join("\n");

export function AgentEra() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const typedRef = useRef<HTMLSpanElement | null>(null);
  // Invisible twin of the typed span holding the not-yet-typed remainder, so the
  // command line is always its full final width — the card can never reflow.
  const sizerRef = useRef<HTMLSpanElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const revealRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const setRevealRef = (index: number) => (el: HTMLParagraphElement | null) => {
    revealRefs.current[index] = el;
  };

  useEffect(() => {
    const timers: number[] = [];
    let observer: IntersectionObserver | null = null;

    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    // Output lines are pre-rendered `invisible` (height reserved up front — zero
    // layout shift); revealing just flips the classes with a 150ms ease-out.
    const reveal = (el: HTMLParagraphElement | null | undefined) => {
      el?.classList.remove("invisible", "opacity-0", "translate-y-1");
    };

    // prefers-reduced-motion (or missing refs): paint the finished terminal, no animation.
    const finishInstantly = () => {
      if (typedRef.current) typedRef.current.textContent = COMMAND;
      if (sizerRef.current) sizerRef.current.textContent = "";
      if (caretRef.current) caretRef.current.style.display = "none";
      for (const el of revealRefs.current) reveal(el);
    };

    const run = () => {
      let i = 0;
      const typeNext = () => {
        const typed = typedRef.current;
        const sizer = sizerRef.current;
        if (!typed || !sizer) return; // unmounted
        i += 1;
        // Visible part grows while the invisible sizer shrinks: line width (and
        // therefore card height) stays constant for the whole animation.
        typed.textContent = COMMAND.slice(0, i);
        sizer.textContent = COMMAND.slice(i);
        if (i < COMMAND.length) {
          later(typeNext, 24 + Math.random() * 30); // human-ish cadence
          return;
        }
        // Command finished → park the inline caret, then after a short pause the
        // output arrives whole, one line at a time…
        if (caretRef.current) caretRef.current.style.display = "none";
        revealRefs.current.slice(0, OUTPUT_COUNT).forEach((el, idx) => {
          later(() => reveal(el), idx * 380);
        });
        // …and finally the idle prompt with its blinking ember cursor.
        later(
          () => reveal(revealRefs.current[OUTPUT_COUNT]),
          (OUTPUT_COUNT - 1) * 380 + 420,
        );
      };
      typeNext();
    };

    const card = cardRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !card) {
      finishInstantly();
    } else {
      // Play once. The first observer callback reports the mount-time state
      // (already in view → short 400ms beat); later ones are real scroll arrivals.
      let firstCallback = true;
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          const isFirst = firstCallback;
          firstCallback = false;
          if (!entry || !entry.isIntersecting) return;
          observer?.disconnect();
          later(run, isFirst ? 400 : 0);
        },
        { threshold: 0.35 },
      );
      observer.observe(card);
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
      observer?.disconnect();
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-coal py-24 text-white">
      {/* Faint ember glow — brand warmth without the loud orange block. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 80% 24%, rgba(255,106,0,0.09) 0%, rgba(255,106,0,0.03) 38%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-ember/80">
            BUILT FOR THE DISCOVERY ERA
          </p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-black tracking-tighter text-white md:text-6xl">
            Your tool deserves to be found, not just linked.
          </h2>
          <p className="mt-6 text-lg text-white/70">
            Coding agents build, test, and review in loops. A listing on Prother puts every
            loop&apos;s output in front of people actively searching for it — with honest
            pricing and real reviews attached.
          </p>

          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {POINTS.map((p) => (
              <li key={p.n} className="flex gap-5 py-4">
                <span className="w-8 shrink-0 font-mono text-sm text-ember/70" aria-hidden>
                  {p.n}
                </span>
                <div>
                  <h3 className="font-bold text-white">{p.title}</h3>
                  <p className="mt-0.5 text-sm text-white/60">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-ink shadow-2xl ring-1 ring-white/[0.03]"
          aria-label={TRANSCRIPT}
        >
          <p className="sr-only">{TRANSCRIPT}</p>
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="size-3 rounded-full bg-white/15" aria-hidden />
            <span className="ml-2 font-mono text-xs text-white/50">discovery — zsh</span>
          </div>
          <div
            className="space-y-1.5 p-5 font-mono text-[13px] text-white/90"
            aria-hidden="true"
            aria-live="off"
          >
            <p>
              <span className="text-ember">$</span>{" "}
              <span ref={typedRef} />
              <span
                ref={caretRef}
                className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-ember align-[-2px]"
                aria-hidden
              />
              <span ref={sizerRef} className="invisible">
                {COMMAND}
              </span>
            </p>
            <p
              ref={setRevealRef(0)}
              className="invisible translate-y-1 opacity-0 transition-[opacity,transform] duration-150 ease-out"
            >
              <span className="text-ember">→</span> 3 tools · 2 open source ·
              <span className="float-right">from $0</span>
            </p>
            <p
              ref={setRevealRef(1)}
              className="invisible translate-y-1 opacity-0 transition-[opacity,transform] duration-150 ease-out"
            >
              <span className="text-ember">$</span> prother compare runway heygen
            </p>
            <p
              ref={setRevealRef(2)}
              className="invisible translate-y-1 opacity-0 transition-[opacity,transform] duration-150 ease-out"
            >
              <span className="text-emerald-400">✓</span> saved to collection
              <span className="float-right text-white/60">&quot;localization stack&quot;</span>
            </p>
            <p
              ref={setRevealRef(3)}
              className="invisible translate-y-1 flex items-center pt-2 opacity-0 transition-[opacity,transform] duration-150 ease-out"
            >
              <span className="text-ember">$</span>
              <span className="ml-2 inline-block h-4 w-2 animate-pulse bg-ember" aria-hidden />
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
