/**
 * Curated SEO intro copy per category slug (PRD F-02/03 — category browse
 * pages need unique, human-written intro paragraphs for search engines).
 * 2–3 sentences each; no superlatives that would violate the Listing
 * Standards tone. Client-safe: no database imports.
 */

export const CATEGORY_BLURBS: Record<string, string> = {
  "generative-ai-chatbots":
    "Chatbots and generative assistants built on large language models — customer-facing support agents, research copilots, and citation-first answer engines. Every listing here is live, hands-on tested against the Listing Standards, and ranked by an independent community vote. Compare pricing tiers, API access, and hallucination controls side by side before you commit your workflow.",

  "art-image-video":
    "Generative image, video, and design tools — from sketch-to-system pipelines to photoreal product shots and podcast-to-clip repurposing. We verify that each tool ships a real free tier or honest trial so you can test output quality before paying. Community votes surface what actually renders on time and on brand.",

  "coding-tools":
    "AI coding assistants, code reviewers, and developer copilots that plug into your editor, CI pipeline, or terminal. Expect honest notes on context-window limits, self-hosting options, and diff-review workflows. Open-source releases and API availability are flagged so teams can evaluate lock-in at a glance.",

  "writing-productivity":
    "Writing assistants, inbox tools, and document copilots that turn bullet points into publishable prose. This category favors tools with strong editing controls — tone, structure, and source fidelity — over raw text generation. Every launch includes its pricing model and free-tier limits, verified at review time.",

  "data-analysis":
    "AI for spreadsheets, forecasting, churn prediction, and plain-English analytics. Listings document data-privacy posture and whether models train on your numbers — a hard requirement for finance and ops teams. Vote totals reflect how well each tool handles messy, real-world data rather than demo sets.",

  "infra-devtools":
    "The plumbing layer: embedding inference, semantic search, GPU cost optimization, and self-hosted AI infrastructure. Performance claims (latency, p99, throughput) are checked against public benchmarks where they exist. Open-source projects dominate here, so repository health and license clarity are part of every review.",

  "audio-voice-music":
    "Voice cloning, dubbing, meeting interpretation, and AI music mastering tools. We highlight language coverage, cloning consent policies, and per-minute pricing so creators can budget honestly. Community reviews flag artifacts and latency issues that demo reels tend to hide.",

  "agents-automation":
    "Autonomous agents, workflow automation, and orchestration layers that retry, self-heal, and chain tools together. Listings document failure-handling behavior — the difference between a demo and a deployable agent. Self-hosted and API-first options are tagged for teams building unattended pipelines.",

  "vertical-ai":
    "AI built for a specific industry: legal contract review, clinical intake, finance ops, and other regulated workflows. Compliance posture, audit trails, and domain accuracy matter more than model size here. Makers must state who the tool is for and what it is not cleared to do.",

  "safety-governance":
    "Guardrails, policy engines, fact-checking pipelines, and evaluation tooling that keep AI outputs safe to ship. This category tracks red-team testing support, logging, and moderation APIs for teams with compliance obligations. If you must explain an AI decision to a regulator, start here.",

  "other":
    "AI products that defy tidy categorization — new interfaces, experimental formats, and cross-domain tools. Editors place a listing here only when none of the ten primary categories fit, and re-file it as the taxonomy evolves.",
};

/** Blurb for a category slug, falling back to generated copy using `name`. */
export function blurbFor(slug: string, name: string): string {
  return (
    CATEGORY_BLURBS[slug] ??
    `Browse ${name} — a community-voted directory of live AI products in this category. Every listing passes the Prother Listing Standards before launch day, with honest pricing and hands-on testing notes. Upvote what works, compare side by side, and follow the tools you rely on.`
  );
}
