import type { Metadata } from "next";
import { HowItWorks } from "@/components/prother/how-it-works";
import { AgentEra } from "@/components/prother/agent-era";
import { Standards } from "@/components/prother/standards";
import { Faq } from "@/components/prother/faq";
import { createServerConvexClient } from "@/lib/convex";
import { shadowSiteSetting } from "@/lib/data";
import { staticPageCopy } from "@/lib/static-pages";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About Prother, the AI tools directory",
  description:
    "How Prother works: a curated search & discovery platform for AI tools, with 8 categories, six published listing standards, and honest reviews. No link dumps, no pay-to-win.",
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
      "A curated search & discovery platform for AI tools: 8 categories, six published listing standards, and honest reviews.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Prother, the AI tools directory",
    description:
      "A curated search & discovery platform for AI tools: 8 categories, six published listing standards, and honest reviews.",
    images: ["/api/og"],
  },
};

/** /about - the full story, assembled from the dedicated section components.
 *  Header copy is editable from the admin Site settings (`page.about`). */
export default async function AboutPage() {
  const raw = await shadowSiteSetting(createServerConvexClient(), "page.about").catch(() => null);
  const copy = staticPageCopy("page.about", raw ?? undefined);
  return (
    <div className="pb-16 md:pb-0">
      {/* Slim page header */}
      <section className="bg-ink pb-20 pt-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-xs tracking-[0.3em] text-ember-tint uppercase">
            {copy.kicker}
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tighter text-white md:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/60">{copy.intro}</p>
        </div>
      </section>

      <HowItWorks />
      <AgentEra />
      <Standards />
      <Faq />
    </div>
  );
}
