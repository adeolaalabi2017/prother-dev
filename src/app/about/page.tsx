import type { Metadata } from "next";
import { HowItWorks } from "@/components/prother/how-it-works";
import { AgentEra } from "@/components/prother/agent-era";
import { Standards } from "@/components/prother/standards";
import { Faq } from "@/components/prother/faq";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About Prother, the AI tools directory",
  description:
    "How Prother works: a curated search & discovery platform for AI tools, with 7 categories, six published listing standards, and honest reviews. No link dumps, no pay-to-win.",
  keywords: [
    "About Prother",
    "AI tools directory",
    "AI tool discovery",
    "search AI tools",
    "listing standards",
  ],
  openGraph: {
    title: "About Prother, the AI tools directory",
    description:
      "A curated search & discovery platform for AI tools: 7 categories, six published listing standards, and honest reviews.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Prother, the AI tools directory",
    description:
      "A curated search & discovery platform for AI tools: 7 categories, six published listing standards, and honest reviews.",
    images: ["/api/og"],
  },
};

/** /about — the full story, assembled from the dedicated section components. */
export default function AboutPage() {
  return (
    <div className="pb-16 md:pb-0">
      {/* Slim page header */}
      <section className="bg-ink pb-20 pt-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-xs tracking-[0.3em] text-ember-tint uppercase">
            About Prother
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl">
            Find the right AI tool.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/60">
            Prother is a curated search &amp; discovery platform for AI products
            and tools, every listing reviewed against published standards,
            organized into 7 categories, and rated by honest reviews. This page
            is the whole story: how the directory works, what we build for, and
            the bar every listing clears.
          </p>
        </div>
      </section>

      <HowItWorks />
      <AgentEra />
      <Standards />
      <Faq />
    </div>
  );
}
