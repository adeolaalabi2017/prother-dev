"use client";

import { motion } from "framer-motion";

const STANDARDS = [
  {
    id: "S1",
    title: "Live & accessible",
    body: "The URL resolves and the product is usable right now. No waitlists, coming-soon pages, or closed betas.",
  },
  {
    id: "S2",
    title: "AI-native",
    body: "AI is the core of the product, not a checkbox. Thin wrappers welcome if they deliver real workflow value.",
  },
  {
    id: "S3",
    title: "Complete listing",
    body: "Clear name, honest tagline, informative description, working links, accurate pricing.",
  },
  {
    id: "S4",
    title: "Honest presentation",
    body: "No fake 'free', no inflated claims, no manufactured social proof.",
  },
  {
    id: "S5",
    title: "Safe & legal",
    body: "No malware, phishing, or violations of model providers' usage policies.",
  },
  {
    id: "S6",
    title: "English listing",
    body: "The tool may serve any market. The listing itself is in English.",
  },
];

export function Standards() {
  return (
    <section id="standards" className="bg-cream py-24 text-ink">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-[#A83E00]">
            THE QUALITY BAR · PUBLIC AT /STANDARDS
          </p>
          <h2 className="mt-4 max-w-2xl text-5xl leading-[0.95] font-black tracking-tighter md:text-6xl">
            Every tool passes all six. Before it can be listed.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STANDARDS.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.07, ease: "easeOut" }}
              className="rounded-2xl border border-black/10 bg-white p-6 transition hover:shadow-md"
            >
              <p className="font-mono text-sm text-[#A83E00]">{s.id}</p>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-black/70">{s.body}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 italic text-black/65">
          Rejected? You&apos;ll get the specific standard(s) your listing failed and a one-click
          resubmit. Not live yet? We&apos;ll remind you when you are.
        </p>
      </div>
    </section>
  );
}
