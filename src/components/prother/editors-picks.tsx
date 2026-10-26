"use client";

import { ToolDecisionCard } from "./tool-card";

export type EditorPickItem = {
  slug: string;
  name: string;
  tagline: string;
  description?: string | null;
  logoEmoji: string;
  logoGradient: string;
  logoUrl?: string | null;
  pricingModel: string;
  startingPrice?: string | null;
  pricingNote?: string | null;
  hasApi?: boolean;
  githubUrl?: string | null;
  tags?: string[];
  curated?: boolean;
  claimed?: boolean;
  category: { slug: string; name: string; emoji: string };
};

export type EditorsPicksProps = {
  picks: EditorPickItem[];
  copy: Record<string, string>;
};

export function EditorsPicks({ picks, copy }: EditorsPicksProps) {
  if (picks.length === 0) return null;

  return (
    <section
      id="picks"
      className="border-t border-white/[0.08] bg-ink py-20 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
              <span>★</span>
              <span>EDITOR&apos;S PICKS</span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl text-balance">
              {copy["home.picksHeading"] || "Six tools worth your time."}
            </h2>
          </div>
          <p className="max-w-md text-sm text-white/60 text-pretty">
            A small, deliberate set. Pricing models, API access, and specs are
            listed on every page and dated; check them before you commit.
          </p>
        </div>

        {/* Informative Tool Decision Cards Matrix */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((p) => (
            <ToolDecisionCard
              key={p.slug}
              slug={p.slug}
              name={p.name}
              tagline={p.tagline}
              description={p.description}
              emoji={p.logoEmoji}
              gradient={p.logoGradient}
              logoUrl={p.logoUrl}
              pricingModel={p.pricingModel}
              startingPrice={p.startingPrice}
              pricingNote={p.pricingNote}
              hasApi={p.hasApi}
              githubUrl={p.githubUrl}
              tags={p.tags}
              curated={p.curated}
              category={p.category}
              editorsPick={true}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
