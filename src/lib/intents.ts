/**
 * Prother intent map: job-first entry points for the homepage.
 *
 * A directory answers "what exists?". These answer "what should I use?", which
 * is the question people actually arrive with. Each intent links into the
 * existing /tools filter surface (?tag= / ?pricing=), so nothing here needs
 * new query plumbing.
 *
 * `tag` values are verified against the live index (GET /api/tools?tag=…):
 * every entry below returns at least one result. Counts are shown at build
 * time from the same source and are indicative, not authoritative — the link
 * is what matters.
 *
 * Keep this list short and specific. A long list of vague intents ("work
 * faster", "do more") is indistinguishable from the category grid it sits
 * next to. If an intent has fewer than ~3 tools behind it, drop it rather than
 * route people to a near-empty page.
 */

export type Intent = {
  /** Short label, the click target. */
  label: string;
  /** One line, written as the user's own words, not ours. */
  blurb: string;
  emoji: string;
  /** Appended to /tools as ?tag= — verified to return results. */
  tag: string;
  /** Optional second filter, e.g. pricing=free. */
  pricing?: string;
};

export const INTENTS: Intent[] = [
  {
    label: "Write and ship code",
    blurb: "Coding agents, IDEs, and review tools that work in your repo.",
    emoji: "⌨️",
    tag: "developer-tools",
  },
  {
    label: "Get an agent to do the work",
    blurb: "Autonomous agents that take a task and return a finished change.",
    emoji: "🤖",
    // "agents" (12 tools), not "autonomous" (2) or "autonomous-agent" (1).
    // The index uses all three spellings for the same concept — an
    // editorial inconsistency worth normalising at the source. Until then,
    // route on the one with enough depth to be worth a card.
    tag: "agents",
  },
  {
    label: "Call a model from your code",
    blurb: "Inference endpoints and APIs you can hit from an application.",
    emoji: "🔌",
    tag: "api-available",
  },
  {
    label: "Automate a repetitive task",
    blurb: "Connect apps and run multi-step workflows without hand-holding.",
    emoji: "⚡",
    tag: "automation",
  },
  {
    label: "Ship something open source",
    blurb: "Tools with a public repo and a licence you can build on.",
    emoji: "🪶",
    tag: "open-source",
  },
  {
    label: "Start free, decide later",
    blurb: "Genuinely usable at no cost — no trial clock, no card.",
    emoji: "🆓",
    tag: "free-tier",
  },
];

/** Build the /tools href for an intent. */
export function intentHref(intent: Intent): string {
  const params = new URLSearchParams({ tag: intent.tag });
  if (intent.pricing) params.set("pricing", intent.pricing);
  return `/tools?${params.toString()}`;
}
