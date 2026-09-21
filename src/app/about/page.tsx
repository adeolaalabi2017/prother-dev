import type { Metadata } from "next";
import { HowItWorks } from "@/components/prother/how-it-works";
import { AgentEra } from "@/components/prother/agent-era";
import { Standards } from "@/components/prother/standards";
import { Faq } from "@/components/prother/faq";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About Prother — where AI products get discovered",
  description:
    "How Prother works: one curated launch batch per day, ranked live by the community, reviewed against six published standards. No link dumps, no pay-to-win.",
  keywords: [
    "About Prother",
    "AI launch platform",
    "AI product discovery",
    "listing standards",
    "how Prother works",
  ],
  openGraph: {
    title: "About Prother — where AI products get discovered",
    description:
      "One curated launch batch per day, ranked live by the community, reviewed against six published standards.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Prother — where AI products get discovered",
    description:
      "One curated launch batch per day, ranked live by the community, reviewed against six published standards.",
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
          <p className="font-mono text-[11px] tracking-[0.3em] text-ember uppercase">
            About Prother
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl">
            A launch is a real event.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/60">
            Prother is where AI products get discovered — one curated batch per
            day, ranked by the people who show up for AI. This page is the
            whole story: how the feed works, what we build for, and the bar
            every listing clears.
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
