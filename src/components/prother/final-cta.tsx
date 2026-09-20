"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExplorer } from "./explorer-store";
import { WaitlistForm } from "./waitlist-form";

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
          Be there on
          <br />
          <span className="text-ember">day one.</span>
        </motion.h2>
        <p className="mt-4 text-white/60">
          The first feed lands the morning we open. Waitlist members get first pick of launch
          dates.
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <WaitlistForm source="cta" dark />
        </div>
        <div className="mt-6">
          <p className="font-mono text-[11px] tracking-widest text-white/35">
            BUILT SOMETHING? SKIP THE LINE —
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-2 rounded-lg border-ember/40 bg-transparent font-semibold text-ember hover:bg-ember/10 hover:text-ember-hot"
          >
            <button type="button" onClick={() => setSubmitOpen(true)}>
              <Rocket className="size-4" aria-hidden />
              Submit your tool for review
            </button>
          </Button>
        </div>
      </div>
    </section>
  );
}
