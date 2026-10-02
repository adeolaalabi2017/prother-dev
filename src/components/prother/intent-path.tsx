import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INTENTS, intentHref } from "@/lib/intents";

/**
 * IntentPath — "what should I use?" entry points.
 *
 * Sits directly under the hero, above the standards band, because it answers
 * the question people actually arrive with. The category grid further down
 * answers a different one ("what exists?"), and this section is deliberately
 * worded as the visitor's own problem rather than ours.
 *
 * Each card links into the existing /tools?tag= filter, so these are real
 * navigations — the destination is server-rendered and scoped, not a client
 * island. Counts come from the same index and are indicative.
 */
export function IntentPath({
  counts,
}: {
  /** tag → number of live tools, from the directory query. */
  counts: Record<string, number>;
}) {
  // Only render intents we can actually fill. A card that lands on an empty
  // directory is worse than no card at all.
  const withCounts = INTENTS.map((i) => ({
    ...i,
    count: counts[i.tag] ?? 0,
  })).filter((i) => i.count > 0);

  if (withCounts.length === 0) return null;

  return (
    <section
      id="start-here"
      className="border-b border-white/[0.08] bg-ink py-16 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
            Start here
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            What are you trying to do?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Skip the taxonomy. Pick the job and we&apos;ll show you the tools
            that do it, with pricing and specs you can check.
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withCounts.map((intent) => (
            <li key={intent.tag}>
              <Link
                href={intentHref(intent)}
                className="group flex h-full items-start gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 transition-colors hover:border-ember/50 hover:bg-white/[0.05]"
              >
                <span
                  aria-hidden
                  className="text-2xl leading-none"
                  // Nudge the emoji optical baseline: at 2xl it otherwise
                  // sits a few px low against the 15px label beside it.
                  style={{ marginTop: "-2px" }}
                >
                  {intent.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-bold text-white transition-colors group-hover:text-ember">
                      {intent.label}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/50">
                      {intent.count}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-white/65">
                    {intent.blurb}
                  </span>
                </span>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-white/30 transition-colors group-hover:text-ember"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-white/55">
          Looking for something else?{" "}
          <Link
            href="/tools"
            className="font-medium text-ember underline decoration-ember/40 underline-offset-4 transition-colors hover:decoration-ember"
          >
            Browse the full directory
          </Link>{" "}
          or search with{" "}
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-white/70">
            ⌘K
          </kbd>
          .
        </p>
      </div>
    </section>
  );
}
