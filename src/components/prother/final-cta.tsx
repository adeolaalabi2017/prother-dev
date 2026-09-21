"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExplorer } from "./explorer-store";

/**
 * Closing band — the feed is open, so this points at discovery (the
 * /tools directory) and the submission wizard. No email capture.
 */
export function FinalCta() {
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  return (
    <section id="submit" className="relative overflow-hidden bg-ink py-28">
      {/* Bottom ember glow */}
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-ember/20 blur-[100px]"
      />

      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-6xl leading-[0.95] font-black tracking-tighter text-white md:text-7xl"
        >
          The feed is
          <br />
          <span className="text-ember">open.</span>
        </motion.h2>
        <p className="mt-4 text-white/60">
          Every launch, every day — ranked by the people who show up for AI.
          No gates, no waiting.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            className="h-12 rounded-lg bg-ember px-6 text-base font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
          >
            <Link href="/tools">
              Browse today&apos;s launches
              <ArrowRight className="ml-1 size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-lg border-ember/40 bg-transparent px-6 text-base font-semibold text-ember hover:bg-ember/10 hover:text-ember-hot"
          >
            <button type="button" onClick={() => setSubmitOpen(true)}>
              Submit your tool
            </button>
          </Button>
        </div>
      </div>
    </section>
  );
}
