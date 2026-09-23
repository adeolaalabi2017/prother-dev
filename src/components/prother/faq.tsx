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
    q: "What is Prother?",
    a: "A curated search and discovery directory for AI products and tools. Every listing is indexed across seven categories (conversational AI, generative content, NLP utilities, computer vision, analytics, automation, and developer platforms) with honest pricing, real reviews, and side-by-side comparisons.",
  },
  {
    q: "How are tools ranked?",
    a: "Editorial curation first: Editor's Pick and curated badges are earned through hands-on testing, never payment. Within the directory, listings surface by review ratings and trending engagement (comments, reviews, and saves). Sponsored slots exist and are always labeled; they never touch organic results.",
  },
  {
    q: "Do you host launches?",
    a: "No. Prother is a pure directory: no launch days, no upvoting, no leaderboards. Tools are listed once they pass our six published standards, and they stay listed on merit. Want the newest arrivals? Sort the directory by newest.",
  },
  {
    q: "How much does it cost?",
    a: "Free for users, forever: browsing, search, collections, and reviews. Listings are free for makers too. The only paid thing on Prother is clearly labeled advertising, and it never influences ranking or editorial picks.",
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
