"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do I need an invite?",
    a: "No. The feed is open — browse, search, and vote without an account. Signing in only unlocks collections and follows.",
  },
  {
    q: "What kind of tools get listed?",
    a: "Live, working AI products. Every listing passes our published quality standards before it can launch — no vaporware, no 'coming soon' pages.",
  },
  {
    q: "How do I follow the feed?",
    a: "Bookmark the homepage or subscribe to the launch RSS. Today's batch, yesterday's standings, and the launch archive are all public.",
  },
  {
    q: "Is submitting free?",
    a: "Yes — submitting and launching are free. Approved products get a launch day on the homepage; you pick the date from the open calendar.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-ink py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-5xl font-black tracking-tighter text-white"
        >
          Questions, answered.
        </motion.h2>

        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`faq-${i}`}
              className="border-white/10"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-white hover:text-ember hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-white/60">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
