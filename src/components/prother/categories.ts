/**
 * Prother taxonomy — 7 primary categories for the search & discovery
 * directory. Hardcoded for the ticker + browse chips + ⌘K palette.
 * `name` mirrors the seeded Category rows so search/labels stay consistent.
 * `helper` = one-line radio helper in the submission wizard.
 */
export const CATEGORIES: {
  slug: string;
  name: string;
  emoji: string;
  short: string;
  helper: string;
}[] = [
  { slug: "conversational-ai", name: "Conversational AI & Chatbots", emoji: "💬", short: "Chatbots", helper: "Assistants, answer engines, customer-support agents" },
  { slug: "generative-content", name: "Generative Content Creation", emoji: "🎨", short: "Generative", helper: "Image, video, audio, and code generation from prompts" },
  { slug: "nlp-text", name: "NLP & Text Utilities", emoji: "📝", short: "NLP & Text", helper: "Summarize, translate, transcribe, grammar, sentiment" },
  { slug: "computer-vision", name: "Computer Vision", emoji: "👁️", short: "Vision", helper: "Detect, classify, and interpret images and video" },
  { slug: "data-analytics", name: "Data Analytics & Predictive Modeling", emoji: "📊", short: "Data", helper: "Forecasting, BI copilots, CRM intelligence" },
  { slug: "automation", name: "Automation & Workflow Orchestration", emoji: "⚙️", short: "Automation", helper: "Multi-step workflows, app-to-app integration, RPA" },
  { slug: "dev-platforms", name: "Developer Frameworks & Infrastructure", emoji: "🛠️", short: "Frameworks", helper: "Model training, serving, RAG plumbing, vector stores" },
];

/** Client-safe lookup: category by slug. */
export function categoryBySlug(slug: string): (typeof CATEGORIES)[number] | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
