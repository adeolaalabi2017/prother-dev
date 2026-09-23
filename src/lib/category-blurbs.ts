/**
 * Curated SEO intro copy per category slug — category browse pages need
 * unique, human-written intro paragraphs for search engines.
 * 2–3 sentences each; honest tone, no superlatives inflation.
 * Client-safe: no database imports.
 */

export const CATEGORY_BLURBS: Record<string, string> = {
  "conversational-ai":
    "Assistants and answer engines built on large language models: general-purpose chat, research copilots with inline citations, and customer-support agents that resolve tickets end to end. Every listing documents model access, context limits, API availability, and pricing so you can match the tool to the workload instead of the hype.",

  "generative-content":
    "Tools that turn prompts into finished assets: photoreal imagery, produced music, studio-quality video, and lifelike voice. Listings note output quality caveats, licensing and consent posture for cloned voices, and whether a real free tier exists: the difference between a demo reel and a deliverable.",

  "nlp-text":
    "Software that reads and writes: document summarization, high-fidelity translation, live meeting transcription, grammar and tone feedback, and AI-content detection. Expect honest notes on language coverage, source fidelity, and what each tool does (or refuses to do) with your text.",

  "computer-vision":
    "Programs that detect, classify, and interpret visual data, from pretrained labeling APIs you can call this afternoon to annotation and training platforms for custom models. Listings flag deployment targets (cloud, edge, on-prem), accuracy baselines, and data-privacy posture.",

  "data-analytics":
    "Platforms that turn raw data into decisions: automated forecasting, churn and risk models, CRM-native predictions, and plain-English BI copilots. Listings document how models handle messy real-world data, where they deploy (cloud or self-hosted), and what governance tooling exists for regulated teams.",

  "automation":
    "Software that connects your apps and runs multi-step workflows: trigger-action builders, visual scenario canvases, self-hostable engines, and human-in-the-loop approvals. Listings document integration counts, failure handling, and whether your data ever leaves your infrastructure.",

  "dev-platforms":
    "The layer builders stand on: training frameworks, model hubs, agent orchestration, vector databases, and pay-per-second inference APIs. Repository health, license clarity, and self-hosting paths are part of every listing so teams can evaluate lock-in at a glance.",
};

/** Blurb for a category slug, falling back to generated copy using `name`. */
export function blurbFor(slug: string, name: string): string {
  return (
    CATEGORY_BLURBS[slug] ??
    `Browse ${name}, a curated directory of live AI products in this category. Every listing carries honest pricing, verified links, and hands-on notes. Compare side by side, save what works, and follow the tools you rely on.`
  );
}
