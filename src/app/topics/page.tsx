import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { TOPICS } from "@/lib/topics";
import { Breadcrumbs } from "@/lib/breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Topics & Curated Collections | Prother",
  description:
    "Explore AI tools by specialized topic and workflow: open-source AI, autonomous agents, coding assistants, RAG pipelines, and developer infrastructure.",
  alternates: { canonical: "/topics" },
  openGraph: {
    title: "AI Topics & Curated Collections | Prother",
    description:
      "Explore AI tools by specialized topic and workflow: open-source AI, autonomous agents, coding assistants, and developer infrastructure.",
    siteName: "Prother",
    type: "website",
  },
};

export default function TopicsIndexPage() {
  const breadcrumbTrail = [
    { name: "Home", href: "/" },
    { name: "Topics" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AI Topics and Curated Workflows",
    description:
      "Curated hubs for open-source AI tools, coding assistants, autonomous agents, and developer infrastructure.",
    url: "https://prother.dev/topics",
  };

  return (
    <div className="min-h-screen bg-ink pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Breadcrumbs trail={breadcrumbTrail} />

        <div className="mt-8 border-b border-white/10 pb-10">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ember">
            <Sparkles className="size-3.5" aria-hidden />
            Curated Hubs
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Explore AI by Workflow & Intent
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/65 sm:text-lg">
            High-intent directories organized around developer needs. Discover verified open-source models,
            autonomous agent frameworks, and coding tools with transparent pricing and real benchmarks.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:-translate-y-1 hover:border-ember/40 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden>
                  {topic.emoji}
                </span>
                <span className="font-mono text-xs uppercase tracking-wider text-white/40 group-hover:text-ember">
                  View Hub
                </span>
              </div>

              <h2 className="mt-5 text-xl font-bold text-white transition-colors group-hover:text-ember">
                {topic.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {topic.tagline}
              </p>

              <div className="mt-6 flex items-center gap-1.5 pt-4 border-t border-white/5 font-mono text-xs uppercase tracking-wider text-ember">
                <span>Browse verified tools</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center sm:p-12">
          <Compass className="mx-auto size-10 text-ember" aria-hidden />
          <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">
            Looking for something specific?
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-sm text-white/60">
            Search our complete directory of tools across all taxonomy categories, or compare rival tools head-to-head.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-lg bg-ember px-5 py-2.5 font-mono text-xs uppercase tracking-wider font-semibold text-coal hover:bg-ember-hot transition-colors"
            >
              Browse All Tools
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-white hover:border-white/30 transition-colors"
            >
              Comparison Matrix
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
