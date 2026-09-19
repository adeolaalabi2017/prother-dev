/** Prother taxonomy (§13) — hardcoded for the ticker + browse chips + ⌘K palette.
 *  `name` mirrors the seeded Category rows so search/labels stay consistent.
 *  `helper` = one-line radio helper in the submission wizard (PRD §11 step ②). */
export const CATEGORIES: {
  slug: string;
  name: string;
  emoji: string;
  short: string;
  helper: string;
}[] = [
  { slug: "generative-ai-chatbots", name: "Generative AI & Chatbots", emoji: "🤖", short: "Chatbots", helper: "Assistants, answer engines, conversational products" },
  { slug: "coding-tools", name: "AI Coding Tools & Assistants", emoji: "👨‍💻", short: "Coding", helper: "Copilots, code review, agents that ship software" },
  { slug: "art-image-video", name: "AI Art, Image & Video", emoji: "🎨", short: "Art & Video", helper: "Generation, editing, avatars, creative pipelines" },
  { slug: "data-analysis", name: "AI for Data Analysis & Prediction", emoji: "📈", short: "Data", helper: "Insights, forecasting, BI copilots" },
  { slug: "infra-devtools", name: "AI Infrastructure & DevTools", emoji: "⚙️", short: "Infra & DevTools", helper: "Model serving, embeddings, evals, orchestration" },
  { slug: "audio-voice-music", name: "AI Audio, Voice & Music", emoji: "🔊", short: "Audio & Voice", helper: "Voice cloning, dubbing, transcription, mastering" },
  { slug: "agents-automation", name: "AI Agents & Automation", emoji: "🧠", short: "Agents", helper: "Autonomous workers, workflows, RPA-style agents" },
  { slug: "vertical-ai", name: "Vertical AI", emoji: "🏥", short: "Vertical AI", helper: "Healthcare, legal, finance, education, marketing" },
  { slug: "writing-productivity", name: "AI Writing & Productivity", emoji: "📝", short: "Writing", helper: "Drafting, editing, email, docs, personal ops" },
  { slug: "safety-governance", name: "AI Safety, Ethics & Governance", emoji: "🛡️", short: "Safety", helper: "Guardrails, policy checks, fact-checking, audits" },
];
