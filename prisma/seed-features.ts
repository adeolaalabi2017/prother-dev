/**
 * Comparison-features seed (Task 32) — category feature axes + per-tool values.
 *
 * Category.features = pipe-separated axis names rendered as matrix rows.
 * Tool.features     = JSON object mapping axis names to short display values.
 *
 * Idempotent: updates by slug, safe to re-run. Re-running overwrites tool
 * feature values (they are seed-managed until edited through the Admin CMS).
 * Run: bun prisma/seed-features.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ───────────────────────────────────── Comparison axes per category ──────
const CATEGORY_FEATURES: Record<string, string> = {
  "conversational-ai":
    "Context window|Voice input|Multilingual|Custom bots|Web browsing|Free tier",
  "generative-content":
    "Image output|Video output|Audio output|Commercial license|Style control|Free tier",
  "nlp-text":
    "Languages|Tone control|Plagiarism check|Integrations|Free tier",
  "computer-vision":
    "Object detection|OCR|Real-time video|Custom training|Edge deploy|Pay-as-you-go",
  "data-analytics":
    "SQL support|Dashboards|Forecasting|Natural-language query|Data sources|Free tier",
  automation:
    "Integrations|AI steps|Human checkpoints|Scheduling|Self-host|Free tier",
  "dev-platforms":
    "SDKs|Local inference|Model hub|GPU scaling|License|Free tier",
};

// ───────────────────────────────────── Per-tool feature values ───────────
const TOOL_FEATURES: Record<string, Record<string, string>> = {
  // 💬 Conversational AI & Chatbots
  chatgpt: {
    "Context window": "128k tokens",
    "Voice input": "Yes",
    Multilingual: "50+ languages",
    "Custom bots": "GPTs",
    "Web browsing": "Yes",
    "Free tier": "Yes, limited",
  },
  claude: {
    "Context window": "200k tokens",
    "Voice input": "No",
    Multilingual: "80+ languages",
    "Custom bots": "Projects",
    "Web browsing": "Yes",
    "Free tier": "Yes, daily caps",
  },
  gemini: {
    "Context window": "1M tokens",
    "Voice input": "Yes",
    Multilingual: "40+ languages",
    "Custom bots": "Gems",
    "Web browsing": "Yes",
    "Free tier": "Yes",
  },
  perplexity: {
    "Context window": "128k tokens",
    "Voice input": "Yes",
    Multilingual: "Dozens",
    "Custom bots": "Spaces",
    "Web browsing": "Always live",
    "Free tier": "Yes, 5 Pro queries/day",
  },
  poe: {
    "Context window": "Varies by bot",
    "Voice input": "Yes",
    Multilingual: "Yes",
    "Custom bots": "Custom bots",
    "Web browsing": "Yes",
    "Free tier": "Yes, daily credits",
  },
  "character-ai": {
    "Context window": "Short-term memory",
    "Voice input": "Yes",
    Multilingual: "Yes",
    "Custom bots": "Characters",
    "Web browsing": "No",
    "Free tier": "Yes, unlimited chats",
  },
  pi: {
    "Context window": "Conversation memory",
    "Voice input": "Yes",
    Multilingual: "Yes",
    "Custom bots": "No",
    "Web browsing": "No",
    "Free tier": "Fully free",
  },
  "intercom-fin": {
    "Context window": "Support context",
    "Voice input": "No",
    Multilingual: "45+ languages",
    "Custom bots": "Fin AI Agent",
    "Web browsing": "No",
    "Free tier": "No, per-resolution",
  },

  // 🎨 Generative Content Creation
  midjourney: {
    "Image output": "Best-in-class",
    "Video output": "Image-to-video",
    "Audio output": "No",
    "Commercial license": "Paid plans",
    "Style control": "Style refs + presets",
    "Free tier": "No",
  },
  elevenlabs: {
    "Image output": "No",
    "Video output": "No",
    "Audio output": "Voice + SFX",
    "Commercial license": "Paid plans",
    "Style control": "Voice design",
    "Free tier": "10k chars/mo",
  },
  runway: {
    "Image output": "Frames",
    "Video output": "Gen-4 video",
    "Audio output": "No",
    "Commercial license": "Paid plans",
    "Style control": "Motion + style brushes",
    "Free tier": "125 credits",
  },
  synthesia: {
    "Image output": "Avatars",
    "Video output": "AI avatar video",
    "Audio output": "AI voices",
    "Commercial license": "Paid plans",
    "Style control": "Templates + brand kit",
    "Free tier": "3 min/mo",
  },
  "adobe-firefly": {
    "Image output": "Yes",
    "Video output": "Generative video",
    "Audio output": "No",
    "Commercial license": "Safe for commercial use",
    "Style control": "Structure + style refs",
    "Free tier": "Yes, monthly credits",
  },
  suno: {
    "Image output": "No",
    "Video output": "No",
    "Audio output": "Full songs",
    "Commercial license": "Paid plans",
    "Style control": "Personas + lyrics",
    "Free tier": "50 credits/day",
  },
  heygen: {
    "Image output": "Avatars",
    "Video output": "AI avatar video",
    "Audio output": "Voice clone",
    "Commercial license": "Paid plans",
    "Style control": "Templates + avatars",
    "Free tier": "3 videos/mo",
  },

  // 📝 NLP & Text Utilities
  grammarly: {
    Languages: "English",
    "Tone control": "Yes",
    "Plagiarism check": "Paid plans",
    Integrations: "Browser + desktop apps",
    "Free tier": "Yes",
  },
  deepl: {
    Languages: "30+",
    "Tone control": "Formal / informal",
    "Plagiarism check": "No",
    Integrations: "API + desktop apps",
    "Free tier": "Yes, 500k chars/mo",
  },
  quillbot: {
    Languages: "30+ for translation",
    "Tone control": "Rewrite modes",
    "Plagiarism check": "Paid plans",
    Integrations: "Browser + Word",
    "Free tier": "125 words/paraphrase",
  },
  "notion-ai": {
    Languages: "Dozens",
    "Tone control": "Yes",
    "Plagiarism check": "No",
    Integrations: "Notion workspace",
    "Free tier": "Add-on trial",
  },
  "otter-ai": {
    Languages: "English",
    "Tone control": "No",
    "Plagiarism check": "No",
    Integrations: "Zoom, Meet, Teams",
    "Free tier": "300 min/mo",
  },
  "originality-ai": {
    Languages: "English",
    "Tone control": "No",
    "Plagiarism check": "Core feature",
    Integrations: "API + Chrome",
    "Free tier": "No, pay-as-you-go",
  },

  // 👁️ Computer Vision
  "google-cloud-vision": {
    "Object detection": "Yes",
    OCR: "Yes, 200+ languages",
    "Real-time video": "Via Video Intelligence API",
    "Custom training": "Vertex AI",
    "Edge deploy": "No",
    "Pay-as-you-go": "Per 1k units",
  },
  "amazon-rekognition": {
    "Object detection": "Yes",
    OCR: "Yes",
    "Real-time video": "Yes, video streams",
    "Custom training": "Custom Labels",
    "Edge deploy": "Via AWS Panorama",
    "Pay-as-you-go": "Per minute / image",
  },
  roboflow: {
    "Object detection": "Train + deploy",
    OCR: "Project-based",
    "Real-time video": "Yes",
    "Custom training": "Core feature",
    "Edge deploy": "Yes, edge devices",
    "Pay-as-you-go": "Free tier + usage",
  },
  clarifai: {
    "Object detection": "Yes",
    OCR: "Yes",
    "Real-time video": "Yes",
    "Custom training": "Yes",
    "Edge deploy": "Local runners",
    "Pay-as-you-go": "Per operation",
  },
  "label-studio": {
    "Object detection": "Labeling only",
    OCR: "Labeling",
    "Real-time video": "No",
    "Custom training": "ML backends",
    "Edge deploy": "Self-hosted",
    "Pay-as-you-go": "Free, open source",
  },
  "viso-suite": {
    "Object detection": "Yes",
    OCR: "Yes",
    "Real-time video": "Core strength",
    "Custom training": "Yes",
    "Edge deploy": "Yes, edge-native",
    "Pay-as-you-go": "Enterprise quote",
  },

  // 📊 Data Analytics & Predictive Modeling
  datarobot: {
    "SQL support": "Connectors",
    Dashboards: "Yes",
    Forecasting: "Time series",
    "Natural-language query": "Yes",
    "Data sources": "Databases + files",
    "Free tier": "Trial only",
  },
  "h2o-ai": {
    "SQL support": "Via engines",
    Dashboards: "H2O AI Cloud",
    Forecasting: "Yes",
    "Natural-language query": "h2oGPTe",
    "Data sources": "Enterprise stack",
    "Free tier": "Open source core",
  },
  "salesforce-einstein": {
    "SQL support": "SOQL",
    Dashboards: "CRM analytics",
    Forecasting: "Yes",
    "Natural-language query": "Einstein Copilot",
    "Data sources": "Salesforce data",
    "Free tier": "With CRM editions",
  },
  "tableau-pulse": {
    "SQL support": "Live + extract",
    Dashboards: "Tableau suite",
    Forecasting: "Yes",
    "Natural-language query": "Core feature",
    "Data sources": "Tableau connections",
    "Free tier": "No",
  },
  hex: {
    "SQL support": "Core feature",
    Dashboards: "Shareable apps",
    Forecasting: "Via notebooks",
    "Natural-language query": "Magic AI",
    "Data sources": "40+ warehouses",
    "Free tier": "Yes, 2 editors",
  },
  polymer: {
    "SQL support": "No-code",
    Dashboards: "Auto-generated",
    Forecasting: "No",
    "Natural-language query": "AI analysis",
    "Data sources": "Connectors + CSV",
    "Free tier": "Yes, limited",
  },

  // ⚙️ Automation & Workflow Orchestration
  zapier: {
    Integrations: "8,000+ apps",
    "AI steps": "AI by Zapier",
    "Human checkpoints": "Yes",
    Scheduling: "Yes",
    "Self-host": "No",
    "Free tier": "100 tasks/mo",
  },
  uipath: {
    Integrations: "Enterprise systems",
    "AI steps": "Autopilot + Doc AI",
    "Human checkpoints": "Action Center",
    Scheduling: "Orchestrator",
    "Self-host": "Yes, on-prem",
    "Free tier": "Community edition",
  },
  make: {
    Integrations: "2,500+ apps",
    "AI steps": "AI agents",
    "Human checkpoints": "Yes",
    Scheduling: "Yes",
    "Self-host": "No",
    "Free tier": "1,000 ops/mo",
  },
  n8n: {
    Integrations: "500+ nodes",
    "AI steps": "AI agent nodes",
    "Human checkpoints": "Wait + approval",
    Scheduling: "Yes",
    "Self-host": "Yes, core feature",
    "Free tier": "Self-host free",
  },
  "relay-app": {
    Integrations: "80+ apps",
    "AI steps": "AI steps + agents",
    "Human checkpoints": "Approvals",
    Scheduling: "Yes",
    "Self-host": "No",
    "Free tier": "Yes, limited runs",
  },
  bardeen: {
    Integrations: "Browser + apps",
    "AI steps": "AI scrapers",
    "Human checkpoints": "Manual runs",
    Scheduling: "Yes",
    "Self-host": "No",
    "Free tier": "Yes, credits",
  },

  // 🛠️ Developer Frameworks & Infrastructure
  pytorch: {
    SDKs: "Python, C++",
    "Local inference": "Yes",
    "Model hub": "Via Hugging Face",
    "GPU scaling": "Yes",
    License: "BSD-style",
    "Free tier": "Open source",
  },
  tensorflow: {
    SDKs: "Python, JS, Java",
    "Local inference": "Yes, TF Lite",
    "Model hub": "TF Hub",
    "GPU scaling": "Yes",
    License: "Apache 2.0",
    "Free tier": "Open source",
  },
  "hugging-face": {
    SDKs: "Python, JS",
    "Local inference": "Yes, libraries",
    "Model hub": "1M+ models",
    "GPU scaling": "Inference endpoints",
    License: "Open + commercial",
    "Free tier": "Yes, generous",
  },
  pinecone: {
    SDKs: "Python, JS, Go",
    "Local inference": "No, managed",
    "Model hub": "Embedding partners",
    "GPU scaling": "Serverless",
    License: "Commercial",
    "Free tier": "Yes, starter plan",
  },
  langchain: {
    SDKs: "Python, JS",
    "Local inference": "Via integrations",
    "Model hub": "Model agnostic",
    "GPU scaling": "Via providers",
    License: "MIT",
    "Free tier": "Open source",
  },
  replicate: {
    SDKs: "Python, JS, HTTP",
    "Local inference": "No, cloud",
    "Model hub": "Community models",
    "GPU scaling": "Autoscaled GPUs",
    License: "Pay per second",
    "Free tier": "Yes, small credit",
  },
  ollama: {
    SDKs: "REST + CLI",
    "Local inference": "Core feature",
    "Model hub": "GGUF library",
    "GPU scaling": "Your hardware",
    License: "MIT",
    "Free tier": "Fully free",
  },
};

async function main() {
  let cats = 0;
  for (const [slug, features] of Object.entries(CATEGORY_FEATURES)) {
    await db.category.update({ where: { slug }, data: { features } });
    cats++;
  }

  let tools = 0;
  let missing: string[] = [];
  for (const [slug, features] of Object.entries(TOOL_FEATURES)) {
    const r = await db.tool.updateMany({ where: { slug }, data: { features: JSON.stringify(features) } });
    if (r.count === 0) missing.push(slug);
    tools++;
  }

  // Every live tool without a seed entry still gets an empty JSON object so
  // the matrix never has to parse a bare default twice.
  const rest = await db.tool.updateMany({ where: { features: "" }, data: { features: "{}" } });

  console.log(
    `Features seed ✓ — ${cats} categories, ${tools} tools written` +
      (missing.length ? ` (MISSING SLUGS: ${missing.join(", ")})` : "") +
      (rest.count ? `, ${rest.count} blank rows normalized` : "")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
