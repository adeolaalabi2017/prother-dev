"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SavedFullPage } from "./saved-full-page";

/**
 * Floating back-to-top button — appears after the first viewport of scrolling.
 *
 * TEMP (Task 23-c): also mounts <SavedFullPage /> because the long-running
 * `next dev` has the ROOT LAYOUT module graph pinned (child files hot-apply;
 * layout.tsx's own compiled output does not — documented stale-dev gotcha).
 * layout.tsx on disk already mounts the Saved overlay in the deep-link stack;
 * until the orchestrator's next controlled restart this temporary mount keeps
 * ?saved=mine alive. saved-full-page.tsx enforces a single live instance, so
 * the duplicate is harmless before AND after that restart. Orchestrator:
 * remove this line after the restart.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <SavedFullPage />
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-20 right-4 z-40 flex size-11 items-center justify-center rounded-full border border-ember/40 bg-coal/90 text-ember shadow-lg backdrop-blur transition-colors hover:bg-ember hover:text-black md:bottom-6 md:right-6"
          >
            <ArrowUp className="size-5" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
