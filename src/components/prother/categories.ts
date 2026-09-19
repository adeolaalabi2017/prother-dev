/** Prother taxonomy (§13) — hardcoded for the ticker + browse chips + ⌘K palette.
 *  `name` mirrors the seeded Category rows so search/labels stay consistent. */
export const CATEGORIES: {
  slug: string;
  name: string;
  emoji: string;
  short: string;
}[] = [
  { slug: "generative-ai-chatbots", name: "Generative AI & Chatbots", emoji: "🤖", short: "Chatbots" },
  { slug: "coding-tools", name: "AI Coding Tools & Assistants", emoji: "👨‍💻", short: "Coding" },
  { slug: "art-image-video", name: "AI Art, Image & Video", emoji: "🎨", short: "Art & Video" },
  { slug: "data-analysis", name: "AI for Data Analysis & Prediction", emoji: "📈", short: "Data" },
  { slug: "infra-devtools", name: "AI Infrastructure & DevTools", emoji: "⚙️", short: "Infra & DevTools" },
  { slug: "audio-voice-music", name: "AI Audio, Voice & Music", emoji: "🔊", short: "Audio & Voice" },
  { slug: "agents-automation", name: "AI Agents & Automation", emoji: "🧠", short: "Agents" },
  { slug: "vertical-ai", name: "Vertical AI", emoji: "🏥", short: "Vertical AI" },
  { slug: "writing-productivity", name: "AI Writing & Productivity", emoji: "📝", short: "Writing" },
  { slug: "safety-governance", name: "AI Safety, Ethics & Governance", emoji: "🛡️", short: "Safety" },
];
