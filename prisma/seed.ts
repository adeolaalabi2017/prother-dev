/**
 * Prother seed — search & discovery directory for AI products/tools.
 * 7 primary categories + a curated roster of 45 real, live AI tools.
 * Run: bunx tsx prisma/seed.ts  (or bun prisma/seed.ts)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const categories = [
  { slug: "conversational-ai", name: "Conversational AI & Chatbots", emoji: "💬", sortOrder: 1 },
  { slug: "generative-content", name: "Generative Content Creation", emoji: "🎨", sortOrder: 2 },
  { slug: "nlp-text", name: "NLP & Text Utilities", emoji: "📝", sortOrder: 3 },
  { slug: "computer-vision", name: "Computer Vision", emoji: "👁️", sortOrder: 4 },
  { slug: "data-analytics", name: "Data Analytics & Predictive Modeling", emoji: "📊", sortOrder: 5 },
  { slug: "automation", name: "Automation & Workflow Orchestration", emoji: "⚙️", sortOrder: 6 },
  { slug: "dev-platforms", name: "Developer Frameworks & Infrastructure", emoji: "🛠️", sortOrder: 7 },
];

type SeedTool = {
  slug: string; name: string; tagline: string; cat: string;
  pricing: string; price?: string; note?: string;
  emoji: string; gradient: string;
  pick?: boolean; curated?: boolean;
  maker?: string; claimed?: boolean; api?: boolean; oss?: string;
  tags?: string; listedDaysAgo?: number; website: string;
  description: string;
};

const tools: SeedTool[] = [
  // ── Conversational AI & Chatbots (8) ─────────────────────────────────
  {
    slug: "chatgpt", name: "ChatGPT", cat: "conversational-ai",
    tagline: "The assistant that started the mainstream AI era",
    pricing: "freemium", price: "$20", note: "Plus / month, free tier available",
    emoji: "🤖", gradient: "from-emerald-500 to-teal-800",
    pick: true, maker: "@openai", claimed: true, api: true,
    tags: "api-available|enterprise|mobile", listedDaysAgo: 210, website: "https://chatgpt.com",
    description:
      "ChatGPT is OpenAI's general-purpose conversational assistant: drafting, coding, data analysis, web browsing, file uploads, and a GPT store of custom assistants. The consumer default for AI chat, with the widest plugin and integrations ecosystem to show for it.",
  },
  {
    slug: "claude", name: "Claude", cat: "conversational-ai",
    tagline: "Thoughtful AI for deep work and long documents",
    pricing: "freemium", price: "$20", note: "Pro / month, generous free tier",
    emoji: "📜", gradient: "from-orange-500 to-amber-800",
    pick: true, maker: "@anthropic", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 200, website: "https://claude.ai",
    description:
      "Claude is Anthropic's assistant built for long-context work: whole-codebase reasoning, 200k-token documents, Artifacts for live previews, and Projects for team knowledge. Consistently strong at writing quality, instruction following, and safe refusals that explain themselves.",
  },
  {
    slug: "gemini", name: "Gemini", cat: "conversational-ai",
    tagline: "Google's multimodal assistant across Workspace",
    pricing: "freemium", price: "$19.99", note: "Google AI Pro / month",
    emoji: "♊", gradient: "from-blue-500 to-indigo-800",
    maker: "@google", claimed: true, api: true,
    tags: "api-available|enterprise|mobile", listedDaysAgo: 195, website: "https://gemini.google.com",
    description:
      "Gemini is Google's flagship assistant: native multimodality (text, image, audio, video), deep Gmail/Docs/Sheets integration, and a 1M-token context window on the advanced tier. The strongest option if your work already lives in Google Workspace.",
  },
  {
    slug: "perplexity", name: "Perplexity", cat: "conversational-ai",
    tagline: "Answer engine that cites a source for every claim",
    pricing: "freemium", price: "$20", note: "Pro / month",
    emoji: "🔍", gradient: "from-cyan-500 to-teal-800",
    curated: true, maker: "@perplexity-ai", claimed: true, api: true,
    tags: "api-available|free-tier", listedDaysAgo: 190, website: "https://perplexity.ai",
    description:
      "Perplexity is a research-grade answer engine: every response is grounded in live web sources with inline citations, plus focus modes for academic papers, forums, or YouTube. The fastest way to replace 'ten blue links' with a direct, checkable answer.",
  },
  {
    slug: "poe", name: "Poe", cat: "conversational-ai",
    tagline: "One chat app for every major AI model",
    pricing: "freemium", price: "$19.99", note: "/month, cross-model points",
    emoji: "🃏", gradient: "from-purple-500 to-fuchsia-800",
    maker: "@quora", claimed: true, api: false,
    tags: "mobile|free-tier", listedDaysAgo: 180, website: "https://poe.com",
    description:
      "Poe aggregates GPT, Claude, Gemini, Llama, image and video models behind one subscription with a shared points budget. Build custom bots, switch models mid-conversation, and compare outputs side by side without a stack of separate subscriptions.",
  },
  {
    slug: "character-ai", name: "Character.AI", cat: "conversational-ai",
    tagline: "Personalized AI characters for chat and play",
    pricing: "freemium", price: "$9.99", note: "c.ai+ / month",
    emoji: "🎭", gradient: "from-rose-500 to-purple-800",
    maker: "@character-ai", claimed: true,
    tags: "mobile|free-tier", listedDaysAgo: 170, website: "https://character.ai",
    description:
      "Character.AI hosts millions of user-created personas (tutors, game masters, language partners), each with a persistent personality. Built for entertainment and roleplay rather than productivity; memory and long-conversation coherence are its stand-out traits.",
  },
  {
    slug: "intercom-fin", name: "Intercom Fin", cat: "conversational-ai",
    tagline: "AI support agent that resolves tickets end to end",
    pricing: "paid", price: "$0.99", note: "per resolution",
    emoji: "🎧", gradient: "from-sky-500 to-blue-800",
    maker: "@intercom", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 120, website: "https://intercom.com/fin",
    description:
      "Fin is Intercom's support agent that answers from your help center, takes actions in your backend via MCP tools, and hands off cleanly to humans. Priced per resolution instead of per seat, so you pay only when a ticket actually gets solved.",
  },
  {
    slug: "pi", name: "Pi", cat: "conversational-ai",
    tagline: "A personal AI for conversation and a sounding board",
    pricing: "free",
    emoji: "🫧", gradient: "from-violet-400 to-purple-700",
    maker: "@inflection", claimed: true,
    tags: "free-tier|mobile", listedDaysAgo: 150, website: "https://pi.ai",
    description:
      "Pi (Inflection) is designed around conversational quality rather than task completion: patient, curious, and voice-first. A low-pressure companion for thinking out loud, rehearsing hard conversations, or unwinding; not a spreadsheet worker.",
  },

  // ── Generative Content Creation (7) ──────────────────────────────────
  {
    slug: "midjourney", name: "Midjourney", cat: "generative-content",
    tagline: "Photoreal AI imagery with an unmistakable aesthetic",
    pricing: "paid", price: "$10", note: "Basic / month",
    emoji: "🖌️", gradient: "from-indigo-500 to-purple-900",
    pick: true, maker: "@midjourney", claimed: true,
    tags: "no-code", listedDaysAgo: 205, website: "https://midjourney.com",
    description:
      "Midjourney remains the aesthetic benchmark in AI imagery: unmatched lighting and composition out of the box, style references, character consistency, and a web editor with region control. Discord-first culture, but the full workflow now lives on the web app too.",
  },
  {
    slug: "runway", name: "Runway", cat: "generative-content",
    tagline: "Gen-4 video generation and AI editing suite",
    pricing: "freemium", price: "$15", note: "Standard / month",
    emoji: "🎬", gradient: "from-stone-500 to-neutral-900",
    curated: true, maker: "@runwayml", claimed: true, api: true,
    tags: "api-available", listedDaysAgo: 175, website: "https://runwayml.com",
    description:
      "Runway pairs frontier video generation (Gen-4) with a real editor: inpainting, motion brush, camera control, and act-one performance transfer. The tool that moved AI video from novelty clips to commercial production pipelines.",
  },
  {
    slug: "elevenlabs", name: "ElevenLabs", cat: "generative-content",
    tagline: "Lifelike voice synthesis and dubbing in 32 languages",
    pricing: "freemium", price: "$5", note: "Starter / month",
    emoji: "🔊", gradient: "from-zinc-500 to-slate-900",
    pick: true, maker: "@elevenlabs", claimed: true, api: true,
    tags: "api-available|free-tier", listedDaysAgo: 185, website: "https://elevenlabs.io",
    description:
      "ElevenLabs leads voice AI: instant and professional voice cloning, emotional delivery control, dubbing that preserves the original speaker, and an API powering half the audiobook and game-voice pipeline on the internet. Consent-verified cloning sets the compliance standard.",
  },
  {
    slug: "suno", name: "Suno", cat: "generative-content",
    tagline: "Turn a text prompt into a fully produced song",
    pricing: "freemium", price: "$10", note: "Pro / month",
    emoji: "🎵", gradient: "from-pink-500 to-rose-800",
    maker: "@suno", claimed: true, api: true,
    tags: "api-available|free-tier", listedDaysAgo: 140, website: "https://suno.com",
    description:
      "Suno generates complete songs (verses, hooks, vocals, mastering) from a prompt or custom lyrics, in any genre you can name. v4 output is radio-plausible; stem export and persona consistency make it usable beyond one-shot novelty.",
  },
  {
    slug: "synthesia", name: "Synthesia", cat: "generative-content",
    tagline: "AI avatars turn scripts into studio-quality video",
    pricing: "freemium", price: "$18", note: "Starter / month",
    emoji: "🗣️", gradient: "from-blue-400 to-cyan-800",
    curated: true, maker: "@synthesia", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 160, website: "https://synthesia.io",
    description:
      "Synthesia is the enterprise standard for AI presenters: 230+ stock avatars, personal clones with consent flows, 140+ languages, and PPT-to-video import. Training, enablement, and product updates that used to need a film crew now take an afternoon.",
  },
  {
    slug: "adobe-firefly", name: "Adobe Firefly", cat: "generative-content",
    tagline: "Commercially safe generative AI in Creative Cloud",
    pricing: "freemium", price: "$9.99", note: "/month, generative credits",
    emoji: "✨", gradient: "from-red-500 to-orange-800",
    maker: "@adobe", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 155, website: "https://adobe.com/products/firefly",
    description:
      "Firefly is Adobe's generative family, trained on licensed content so outputs carry IP indemnification for enterprise users. Generative Fill and Generate Similar live inside Photoshop and Illustrator where designers already work: no tab-switching tax.",
  },
  {
    slug: "heygen", name: "HeyGen", cat: "generative-content",
    tagline: "Clone yourself and translate talking-head video",
    pricing: "freemium", price: "$29", note: "Creator / month",
    emoji: "📹", gradient: "from-teal-500 to-emerald-900",
    maker: "@heygen", claimed: true, api: true,
    tags: "api-available", listedDaysAgo: 130, website: "https://heygen.com",
    description:
      "HeyGen clones your face and voice once, then renders new scripts in 175+ languages with accurate lip sync. The default for creators scaling one presenter across markets; interactive avatar API covers support and sales use cases.",
  },

  // ── NLP & Text Utilities (6) ─────────────────────────────────────────
  {
    slug: "grammarly", name: "Grammarly", cat: "nlp-text",
    tagline: "Grammar, tone, and clarity everywhere you write",
    pricing: "freemium", price: "$12", note: "Pro / month",
    emoji: "✅", gradient: "from-green-500 to-emerald-800",
    pick: true, maker: "@grammarly", claimed: true, api: true,
    tags: "api-available|browser-extension|enterprise", listedDaysAgo: 220, website: "https://grammarly.com",
    description:
      "Grammarly is the writing layer that follows you across apps: grammar and spelling, tone detection, full-paragraph rewrites, and generative drafting. Enterprise features add style-guide enforcement and plagiarism checks: the quiet default on 30M keyboards.",
  },
  {
    slug: "deepl", name: "DeepL", cat: "nlp-text",
    tagline: "Neural translation that outperforms the classics",
    pricing: "freemium", price: "$8.74", note: "Starter / month",
    emoji: "🌐", gradient: "from-sky-400 to-blue-900",
    curated: true, maker: "@deepl", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 215, website: "https://deepl.com",
    description:
      "DeepL's models consistently win blind translation tests in European languages, preserving tone and register that competitors flatten. Write mode rewrites your prose in the target language; the API handles documents, glossaries, and formal/informal register.",
  },
  {
    slug: "quillbot", name: "QuillBot", cat: "nlp-text",
    tagline: "Paraphrase, summarize, and polish any text",
    pricing: "freemium", price: "$9.95", note: "Premium / month",
    emoji: "🪶", gradient: "from-emerald-400 to-green-800",
    maker: "@quillbot", claimed: true,
    tags: "browser-extension|free-tier", listedDaysAgo: 165, website: "https://quillbot.com",
    description:
      "QuillBot is the student-and-editor workhorse: synonym-strength paraphrasing modes, summarizer, citation generator, and grammar check in one toolbar. The mode slider (standard → creative → concise) gives real control over how far a rewrite drifts.",
  },
  {
    slug: "notion-ai", name: "Notion AI", cat: "nlp-text",
    tagline: "Q&A, drafting, and autofill across your workspace",
    pricing: "freemium", price: "$10", note: "/ member / month add-on",
    emoji: "🗂️", gradient: "from-stone-400 to-zinc-800",
    maker: "@notion", claimed: true, api: false,
    tags: "no-code|enterprise", listedDaysAgo: 145, website: "https://notion.so/product/ai",
    description:
      "Notion AI searches and reasons across your whole workspace: ask a question, get an answer with links to the source pages, then draft or translate without leaving the doc. Database autofill (summaries, tags, classification) turns messy wikis into structured knowledge.",
  },
  {
    slug: "otter-ai", name: "Otter.ai", cat: "nlp-text",
    tagline: "Live meeting transcription with searchable memory",
    pricing: "freemium", price: "$16.99", note: "Pro / month",
    emoji: "🦦", gradient: "from-amber-400 to-orange-800",
    maker: "@otter-ai", claimed: true, api: true,
    tags: "api-available|free-tier", listedDaysAgo: 135, website: "https://otter.ai",
    description:
      "Otter joins Zoom, Meet, and Teams calls to produce live transcripts, speaker-labeled summaries, and action items you can query later ('what did we promise the client?'). The searchable meeting archive is the real product: transcription is just the capture step.",
  },
  {
    slug: "originality-ai", name: "Originality.ai", cat: "nlp-text",
    tagline: "AI-content detection and plagiarism for publishers",
    pricing: "paid", price: "$14.95", note: "/ month, pay-as-you-go",
    emoji: "🕵️", gradient: "from-slate-500 to-gray-900",
    maker: "@originality-ai", claimed: true, api: true,
    tags: "api-available", listedDaysAgo: 110, website: "https://originality.ai",
    description:
      "Originality.ai scans text for AI-generation signals (per-sentence highlighting), plagiarism, and factual errors, built for content agencies and publishers managing freelance pipelines. Team activity logs and scan history make audits reproducible.",
  },

  // ── Computer Vision (6) ──────────────────────────────────────────────
  {
    slug: "roboflow", name: "Roboflow", cat: "computer-vision",
    tagline: "Train and deploy custom vision models from photos",
    pricing: "freemium", note: "Public / free, then usage",
    emoji: "👁️", gradient: "from-fuchsia-500 to-purple-900",
    pick: true, maker: "@roboflow", claimed: true, api: true,
    oss: "https://github.com/roboflow/supervision",
    tags: "api-available|free-tier", listedDaysAgo: 150, website: "https://roboflow.com",
    description:
      "Roboflow covers the full vision loop: annotate images, augment, train detection/segmentation/classification models, and deploy via hosted API, edge devices, or the open-source supervision SDK. The on-ramp that took computer vision from PhD projects to weekend builds.",
  },
  {
    slug: "clarifai", name: "Clarifai", cat: "computer-vision",
    tagline: "End-to-end platform for recognizing images and video",
    pricing: "freemium", note: "Community / free, then usage",
    emoji: "🧿", gradient: "from-indigo-400 to-blue-900",
    maker: "@clarifai", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 140, website: "https://clarifai.com",
    description:
      "Clarifai packages vision (and now language/audio) recognition as hosted models plus custom training, with an inference stack that runs in cloud, on-prem, or air-gapped. Longest track record in the category: production deployments across defense, retail, and media.",
  },
  {
    slug: "google-cloud-vision", name: "Google Cloud Vision", cat: "computer-vision",
    tagline: "Pretrained image analysis APIs from Google Cloud",
    pricing: "paid", note: "per 1,000 units, free monthly quota",
    emoji: "☁️", gradient: "from-blue-400 to-sky-900",
    maker: "@google-cloud", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 200, website: "https://cloud.google.com/vision",
    description:
      "Cloud Vision exposes Google-grade perception as REST/gRPC APIs: label detection, OCR in 50+ languages, face and landmark detection, safe-search, and product search. The pragmatic default when you need capability tomorrow rather than a custom model next quarter.",
  },
  {
    slug: "amazon-rekognition", name: "Amazon Rekognition", cat: "computer-vision",
    tagline: "Managed image and video analysis on AWS",
    pricing: "paid", note: "per image/minute, free tier",
    emoji: "🔎", gradient: "from-orange-400 to-amber-900",
    maker: "@aws", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 195, website: "https://aws.amazon.com/rekognition/",
    description:
      "Rekognition adds object/scene labels, text OCR, face search, and content moderation to any AWS stack, with video APIs for person tracking and celebrity recognition. Deep IAM/S3/Kinesis integration makes it the low-friction choice for existing AWS shops.",
  },
  {
    slug: "label-studio", name: "Label Studio", cat: "computer-vision",
    tagline: "Open-source labeling for vision and multimodal data",
    pricing: "open_source", note: "self-host free, Enterprise paid",
    emoji: "🏷️", gradient: "from-lime-400 to-emerald-900",
    maker: "@humansignal", claimed: true, oss: "https://github.com/HumanSignal/label-studio",
    tags: "open-source|self-hosted", listedDaysAgo: 125, website: "https://labelstud.io",
    description:
      "Label Studio is the open-source annotation standard: images, video, audio, and text under one configurable interface, with ML-assisted pre-labeling and role-based review queues. Self-host it, own the data, and pipe exports straight into any training pipeline.",
  },
  {
    slug: "viso-suite", name: "Viso Suite", cat: "computer-vision",
    tagline: "Enterprise platform for vision application delivery",
    pricing: "paid", note: "custom enterprise pricing",
    emoji: "🏗️", gradient: "from-cyan-400 to-slate-900",
    maker: "@viso", claimed: true,
    tags: "enterprise|self-hosted", listedDaysAgo: 100, website: "https://viso.ai",
    description:
      "Viso Suite is the application layer for production vision: no-code pipelines, fleet management for edge devices, drift monitoring, and security controls for regulated environments. For teams shipping dozens of cameras and models, it replaces a platform engineering team.",
  },

  // ── Data Analytics & Predictive Modeling (6) ─────────────────────────
  {
    slug: "datarobot", name: "DataRobot", cat: "data-analytics",
    tagline: "Enterprise AutoML and predictive AI platform",
    pricing: "paid", note: "custom enterprise pricing",
    emoji: "📈", gradient: "from-emerald-500 to-teal-900",
    pick: true, maker: "@datarobot", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 190, website: "https://datarobot.com",
    description:
      "DataRobot industrialized AutoML: upload data, get ranked candidate models with feature importance, then deploy with monitoring for drift and accuracy decay. Its past-models registry and governance tooling are why regulated enterprises still sign the contract.",
  },
  {
    slug: "h2o-ai", name: "H2O.ai", cat: "data-analytics",
    tagline: "Open-source machine learning with h2oGPT for docs",
    pricing: "open_source", note: "OSS core, Enterprise paid",
    emoji: "💧", gradient: "from-sky-400 to-cyan-900",
    curated: true, maker: "@h2o-ai", claimed: true, oss: "https://github.com/h2oai",
    tags: "open-source|enterprise", listedDaysAgo: 185, website: "https://h2o.ai",
    description:
      "H2O.ai pairs the battle-tested H2O-3 distributed ML platform with h2oGPT document intelligence: ask questions across thousands of PDFs with air-gapped deployment. The rare vendor equally credible in open-source gradient boosting and private LLM serving.",
  },
  {
    slug: "tableau-pulse", name: "Tableau Pulse", cat: "data-analytics",
    tagline: "AI insights delivered inside Tableau",
    pricing: "paid", price: "$15", note: "/ user / month add-on",
    emoji: "📊", gradient: "from-blue-500 to-indigo-900",
    maker: "@salesforce", claimed: true,
    tags: "enterprise|no-code", listedDaysAgo: 120, website: "https://tableau.com/products/tableau-pulse",
    description:
      "Tableau Pulse reinterprets your dashboards as narrative insights: metric definitions drive automated analyses of drivers, anomalies, and trends, pushed to Slack or email. Analytics that used to need an analyst standing by now arrive as a morning briefing.",
  },
  {
    slug: "salesforce-einstein", name: "Salesforce Einstein", cat: "data-analytics",
    tagline: "Predictive and generative AI across every cloud",
    pricing: "paid", note: "bundled per edition, usage add-ons",
    emoji: "🎯", gradient: "from-sky-500 to-blue-900",
    maker: "@salesforce", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 175, website: "https://salesforce.com/einstein",
    description:
      "Einstein embeds prediction and generation across Salesforce: lead scoring, opportunity forecasting, case routing, and Einstein Copilot drafting on your CRM data. The value is context: predictions computed on the system of record, not a CSV export of it.",
  },
  {
    slug: "hex", name: "Hex", cat: "data-analytics",
    tagline: "Collaborative data notebooks with an AI copilot",
    pricing: "freemium", price: "$36", note: "/ editor / month",
    emoji: "🔮", gradient: "from-violet-500 to-purple-900",
    curated: true, maker: "@hex", claimed: true,
    tags: "no-code|free-tier", listedDaysAgo: 115, website: "https://hex.tech",
    description:
      "Hex combines SQL, Python, and no-code cells in one collaborative notebook, then ships results as shareable apps. Hex Magic autocompletes queries with schema awareness and writes transformation code from natural language: analytics engineering, accelerated.",
  },
  {
    slug: "polymer", name: "Polymer", cat: "data-analytics",
    tagline: "Turn spreadsheets into interactive AI search apps",
    pricing: "freemium", note: "Free trial, then monthly",
    emoji: "🔬", gradient: "from-teal-400 to-emerald-900",
    maker: "@polymer", claimed: true,
    tags: "no-code|free-tier", listedDaysAgo: 95, website: "https://polymersearch.com",
    description:
      "Polymer takes a CSV or spreadsheet and auto-builds a searchable, filterable app with embedded BI boards: no BI stack required. Explore modes surface trends and outliers conversationally, which makes it a favorite for sales teams and market researchers.",
  },

  // ── Automation & Workflow Orchestration (6) ──────────────────────────
  {
    slug: "zapier", name: "Zapier", cat: "automation",
    tagline: "Connect 7,000+ apps and automate without code",
    pricing: "freemium", price: "$19.99", note: "Starter / month",
    emoji: "⚡", gradient: "from-orange-500 to-red-800",
    pick: true, maker: "@zapier", claimed: true, api: true,
    tags: "api-available|no-code|free-tier", listedDaysAgo: 230, website: "https://zapier.com",
    description:
      "Zapier is the default automation layer of the no-code era: 7,000+ integrations, trigger-action Zaps, multi-step paths, tables, and interfaces. Copilot drafts workflows from a plain-English description: the fastest path from 'this should happen automatically' to done.",
  },
  {
    slug: "make", name: "Make", cat: "automation",
    tagline: "Visual scenario builder for complex automations",
    pricing: "freemium", price: "$9", note: "Core / month",
    emoji: "🧩", gradient: "from-purple-500 to-fuchsia-900",
    curated: true, maker: "@make", claimed: true, api: true,
    tags: "api-available|no-code", listedDaysAgo: 160, website: "https://make.com",
    description:
      "Make renders automations as a visual data-flow canvas: branches, iterators, aggregators, and error handlers that Zapier's linear model can't express. Operations-based pricing rewards complex scenarios: the power tool of the integration category.",
  },
  {
    slug: "n8n", name: "n8n", cat: "automation",
    tagline: "Source-available workflow automation you can host",
    pricing: "open_source", note: "self-host free, cloud usage-based",
    emoji: "🔗", gradient: "from-rose-500 to-red-900",
    maker: "@n8n", claimed: true, oss: "https://github.com/n8n-io/n8n",
    tags: "open-source|self-hosted|api-available", listedDaysAgo: 155, website: "https://n8n.io",
    description:
      "n8n is the self-hostable automation engine with 400+ integrations, JavaScript/Python code nodes, and native AI agent steps (LangChain-backed). Data never leaves your infra unless you route it out: the reason compliance-sensitive teams standardize on it.",
  },
  {
    slug: "uipath", name: "UiPath", cat: "automation",
    tagline: "Enterprise RPA plus agentic automation, unified",
    pricing: "paid", note: "per user/bot, free Community tier",
    emoji: "🦾", gradient: "from-orange-400 to-amber-900",
    maker: "@uipath", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 170, website: "https://uipath.com",
    description:
      "UiPath leads enterprise RPA: screen scraping that survives UI changes, attended/unattended robots, process mining to find what to automate, and AI agents that handle document variance. When the workflow spans legacy desktop apps, this is the heavy machinery.",
  },
  {
    slug: "relay-app", name: "Relay.app", cat: "automation",
    tagline: "Human-in-the-loop automation for modern teams",
    pricing: "freemium", price: "$27", note: "Professional / month",
    emoji: "🔁", gradient: "from-cyan-400 to-teal-900",
    maker: "@relay", claimed: true, api: true,
    tags: "api-available|no-code|free-tier", listedDaysAgo: 105, website: "https://relay.app",
    description:
      "Relay builds approval gates into automations: a step can pause for a human check-in, collect input, then continue, with playbooks assignable to teammates. AI agents draft, humans approve. The workflow tool for teams that don't trust black boxes.",
  },
  {
    slug: "bardeen", name: "Bardeen", cat: "automation",
    tagline: "AI browser automation that scrapes and acts",
    pricing: "freemium", price: "$? pricingNote", note: "Free tier, Pro monthly",
    emoji: "🧲", gradient: "from-emerald-400 to-green-900",
    maker: "@bardeen", claimed: true,
    tags: "browser-extension|free-tier", listedDaysAgo: 90, website: "https://bardeen.ai",
    description:
      "Bardeen automates inside the browser tab: scraper recipes, meeting joins, CRM autofill, and multi-app playbooks triggered from a shortcut. Ask Bardeen builds the automation from a description: web work that felt robotic becomes one keystroke.",
  },

  // ── Developer Frameworks & Infrastructure (7) ────────────────────────
  {
    slug: "pytorch", name: "PyTorch", cat: "dev-platforms",
    tagline: "The deep learning framework behind most research",
    pricing: "open_source", note: "BSD-style license",
    emoji: "🔥", gradient: "from-red-500 to-orange-900",
    pick: true, maker: "@pytorch", claimed: true, oss: "https://github.com/pytorch/pytorch",
    tags: "open-source|self-hosted", listedDaysAgo: 240, website: "https://pytorch.org",
    description:
      "PyTorch's define-by-run model and eager execution made it the lingua franca of ML research: the overwhelming majority of new papers ship with PyTorch code. torch.compile and distributed tooling now carry it into production at the largest training scales.",
  },
  {
    slug: "tensorflow", name: "TensorFlow", cat: "dev-platforms",
    tagline: "Google's end-to-end machine learning platform",
    pricing: "open_source", note: "Apache-2.0 license",
    emoji: "🧠", gradient: "from-amber-400 to-orange-900",
    maker: "@google", claimed: true, oss: "https://github.com/tensorflow/tensorflow",
    tags: "open-source|enterprise", listedDaysAgo: 235, website: "https://tensorflow.org",
    description:
      "TensorFlow remains the end-to-end option: Keras high-level API, TFX pipelines, TensorBoard profiling, and TFLite/JS runtimes spanning servers to microcontrollers. The deployment story (especially edge and JS) keeps it in production stacks everywhere.",
  },
  {
    slug: "hugging-face", name: "Hugging Face", cat: "dev-platforms",
    tagline: "The community hub for models, datasets, and demos",
    pricing: "freemium", note: "free hub, Pro $9, usage pricing",
    emoji: "🤗", gradient: "from-yellow-400 to-amber-700",
    pick: true, maker: "@huggingface", claimed: true, api: true,
    oss: "https://github.com/huggingface/transformers",
    tags: "open-source|api-available|free-tier", listedDaysAgo: 225, website: "https://huggingface.co",
    description:
      "Hugging Face is the GitHub of machine learning: a million models and datasets, the transformers library, Spaces demos, and inference APIs. If a model exists, its weights, card, and community evaluation live here: the de facto public infrastructure of open AI.",
  },
  {
    slug: "langchain", name: "LangChain", cat: "dev-platforms",
    tagline: "Framework for building LLM-powered applications",
    pricing: "open_source", note: "OSS, LangSmith usage-based",
    emoji: "🦜", gradient: "from-green-400 to-teal-900",
    curated: true, maker: "@langchain", claimed: true, oss: "https://github.com/langchain-ai/langchain",
    tags: "open-source|api-available", listedDaysAgo: 130, website: "https://langchain.com",
    description:
      "LangChain standardizes the plumbing of LLM apps: model abstraction, retrieval pipelines, agent runtimes, and LangGraph for stateful, resumable workflows. Pair with LangSmith for tracing and evals: the default scaffold when a prototype needs to become a product.",
  },
  {
    slug: "ollama", name: "Ollama", cat: "dev-platforms",
    tagline: "Run open models locally with one command",
    pricing: "open_source", note: "MIT license",
    emoji: "🦙", gradient: "from-stone-400 to-neutral-900",
    curated: true, maker: "@ollama", claimed: true, oss: "https://github.com/ollama/ollama",
    tags: "open-source|self-hosted|free-tier", listedDaysAgo: 100, website: "https://ollama.com",
    description:
      "Ollama packages open models (Llama, Qwen, Gemma, Mistral) into one-line installs with a local OpenAI-compatible API. Privacy, offline use, and zero inference bills: the tool that made local LLMs a consumer experience instead of a CUDA weekend project.",
  },
  {
    slug: "pinecone", name: "Pinecone", cat: "dev-platforms",
    tagline: "Managed vector database for search and RAG",
    pricing: "freemium", note: "free starter index, then usage",
    emoji: "🌲", gradient: "from-green-500 to-emerald-900",
    maker: "@pinecone", claimed: true, api: true,
    tags: "api-available|enterprise", listedDaysAgo: 145, website: "https://pinecone.io",
    description:
      "Pinecone is the managed vector index behind thousands of RAG systems: serverless indexes, hybrid sparse-dense search, namespaces for multi-tenancy, and relevance tuning without ops. Scale to billions of embeddings without writing a line of infrastructure code.",
  },
  {
    slug: "replicate", name: "Replicate", cat: "dev-platforms",
    tagline: "Run and fine-tune open models via a simple API",
    pricing: "freemium", note: "per-second usage billing",
    emoji: "🎛️", gradient: "from-fuchsia-400 to-purple-900",
    maker: "@replicate", claimed: true, api: true,
    tags: "api-available|open-source", listedDaysAgo: 125, website: "https://replicate.com",
    description:
      "Replicate hosts thousands of community models (image, video, voice, LLM) behind one API with per-second billing and zero cold-start management. Push your own model with Cog, or fine-tune someone else's with your data; scale happens automatically.",
  },
];

async function main() {
  console.log("🌱 Seeding Prother (search & discovery)…");
  await db.comment.deleteMany();
  await db.review.deleteMany();
  await db.collectionItem.deleteMany();
  await db.collection.deleteMany();
  await db.follow.deleteMany();
  await db.tool.deleteMany();
  await db.category.deleteMany();

  for (const c of categories) await db.category.create({ data: c });

  const catMap = new Map<string, string>();
  for (const c of await db.category.findMany()) catMap.set(c.slug, c.id);

  let seeded = 0;
  for (const t of tools) {
    await db.tool.create({
      data: {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        description: t.description,
        websiteUrl: t.website,
        logoEmoji: t.emoji,
        logoGradient: t.gradient,
        pricingModel: t.pricing,
        startingPrice: t.price?.startsWith("$?") ? null : t.price ?? null,
        pricingNote: t.note ?? null,
        hasApi: t.api ?? false,
        githubUrl: t.oss ?? null,
        docsUrl: null,
        twitterUrl: null,
        tags: t.tags ?? "",
        track: t.maker === "@prother" ? "editor_seed" : "community",
        editorsPick: t.pick ?? false,
        curated: t.curated ?? false,
        claimed: t.claimed ?? false,
        makerHandle: t.maker ?? "@prother",
        verifiedAt: daysAgo(2),
        categoryId: catMap.get(t.cat)!,
        createdAt: daysAgo(t.listedDaysAgo ?? 30),
      },
    });
    seeded++;
  }

  console.log(
    `✅ Seeded ${seeded} tools across ${categories.length} categories (search & discovery).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
