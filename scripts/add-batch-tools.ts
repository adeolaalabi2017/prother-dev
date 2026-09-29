import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { config } from "dotenv";
import * as fs from "fs";

config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  datasources: {
    db: {
      url: `file:${resolve(process.cwd(), "db/custom.db")}`,
    },
  },
});

const CATEGORIES = {
  DEV_PLATFORMS: "cmucrh2nn0006kji83fbwfgnw",
  AUTOMATION: "cmucrh2nm0005kji8p4nuxs89",
  CONVERSATIONAL_AI: "cmucrh2nj0000kji8o4lndfc1",
  DATA_ANALYTICS: "cmucrh2nm0004kji8j0rbkt76",
  GENERATIVE_CONTENT: "cmucrh2nk0001kji8qk3jr9yr",
  NLP_TEXT: "cmucrh2nl0002kji8959jrucs",
  COMPUTER_VISION: "cmucrh2nl0003kji8cdy3lonp",
};

interface ToolSpec {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  categoryLegacyId: string;
  pricingModel: string;
  startingPrice: string;
  pricingNote: string;
  hasApi: boolean;
  logoEmoji: string;
  logoGradient: string;
  tagsPipe: string;
  makerHandle: string;
  editorial: {
    longDescription: string;
    useCases: { title: string; body: string }[];
    pros: string[];
    cons: string[];
    alternatives: string[];
  };
}

const NEW_TOOLS: ToolSpec[] = [
  {
    slug: "naive-n0-5-flash",
    name: "Naive-N0.5-Flash",
    tagline: "Open-weight 309B MoE model for coding and AI R&D with 1M context",
    description: "Naive-N0.5-Flash is a 309B parameter Mixture-of-Experts open-weight frontier model optimized for coding, AI R&D, and low-latency inference up to 2,000 tokens per second.",
    websiteUrl: "https://naive.ai/en/",
    githubUrl: "https://huggingface.co/NaiveAI",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free (Open Weights)",
    pricingNote: "Open weights on Hugging Face; pay-as-you-go API platform available for hosted inference.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-amber-500 to-orange-800",
    tagsPipe: "llm|open-weights|coding|moe|developer-tools",
    makerHandle: "@naive-ai",
    editorial: {
      longDescription: "Naive-N0.5-Flash is a 309B parameter Mixture-of-Experts (MoE) model developed by Naive AI specifically for software engineering, code synthesis, and autonomous research workflows. Built with an architecture that reaches 2,000 tokens per second on specialized hardware, it combines high throughput with a native 1M token context window.\n\nThe model weights are openly accessible on Hugging Face, allowing enterprise teams and independent researchers to deploy them in private environments or run inference via Naive's managed cloud platform.",
      useCases: [
        {
          title: "High-throughput coding agent execution",
          body: "Power autonomous agent loops with up to 2,000 tokens/sec generation speed for real-time refactoring and code generation.",
        },
        {
          title: "Large-codebase context analysis",
          body: "Analyze entire repositories and comprehensive technical documentation within its native 1M token context window.",
        },
        {
          title: "Private self-hosted deployment",
          body: "Host frontier-class MoE weights inside VPC or on-premise clusters for strict compliance and privacy.",
        },
      ],
      pros: [
        "Extremely high inference throughput reaching up to 2,000 tokens/sec",
        "Generous 1M token native context window for complex codebases",
        "Open-weight distribution on Hugging Face with no vendor lock-in",
      ],
      cons: [
        "Large 309B MoE footprint requires significant multi-GPU compute for local hosting",
        "Specialized architecture requires modern inference runtime configurations",
      ],
      alternatives: ["deepseek", "qwen", "llama"],
    },
  },
  {
    slug: "overlay",
    name: "Overlay",
    tagline: "Unified open-source AI interaction layer and workspace",
    description: "Overlay is an open-source AI workspace combining chat, voice notes, browser automations, persistent context, and agent workflows into a single unified desktop interface.",
    websiteUrl: "https://www.getoverlay.io/",
    githubUrl: "https://github.com/getoverlay",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source interaction layer; self-hostable workspace with optional cloud syncing.",
    hasApi: true,
    logoEmoji: "🖥️",
    logoGradient: "from-blue-600 to-indigo-900",
    tagsPipe: "ai-workspace|desktop|agents|voice-notes|open-source",
    makerHandle: "@getoverlay",
    editorial: {
      longDescription: "Overlay is an open-source desktop application that serves as a unified interaction layer across AI models, local tools, and web services. Rather than jumping between isolated browser tabs and chatbots, Overlay provides a persistent interface for executing multi-step tasks, voice dictation, web scraping, and agent automations.\n\nIt features native support for local models through Ollama as well as API connections to Anthropic, OpenAI, and custom endpoints, ensuring user data and project contexts remain entirely under developer control.",
      useCases: [
        {
          title: "System-wide AI interaction layer",
          body: "Summon a persistent assistant anywhere in your desktop workflow to summarize screens, run code, or capture ideas.",
        },
        {
          title: "Voice-driven note capture and structure",
          body: "Speak naturally to generate clean markdown notes, action items, and task lists organized automatically.",
        },
        {
          title: "Agentic browser automations",
          body: "Delegate repetitive web tasks like research collection and form fills to autonomous browser sub-agents.",
        },
      ],
      pros: [
        "Open-source core architecture with full local model compatibility",
        "Integrates chat, voice, browser actions, and automations into one UI",
        "Clean, minimal desktop interface designed for fast keyboard operation",
      ],
      cons: [
        "Desktop app requires initial setup of model provider credentials or local runners",
        "Browser agent workflows may occasionally need manual user intervention on complex logins",
      ],
      alternatives: ["chatgpt", "claude", "openbot"],
    },
  },
  {
    slug: "computer",
    name: "Computer",
    tagline: "Autonomous digital worker and multi-model agent execution environment",
    description: "Computer by Perplexity is a general-purpose digital worker that breaks down complex workflows, orchestrates over 20 models, and executes tasks autonomously across cloud sandboxes and connected apps.",
    websiteUrl: "https://www.perplexity.ai/computer",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "paid",
    startingPrice: "Included with Perplexity Max",
    pricingNote: "Available to Perplexity Max subscribers; credit-based usage for multi-step agent execution.",
    hasApi: true,
    logoEmoji: "💻",
    logoGradient: "from-cyan-600 to-teal-900",
    tagsPipe: "autonomous-agents|digital-worker|cloud-sandbox|automation",
    makerHandle: "@perplexity-ai",
    editorial: {
      longDescription: "Computer is Perplexity's autonomous agent system engineered to function as a general-purpose digital worker. Unlike conversational answer engines, Computer executes end-to-end operational workflows: managing recurring schedules, writing and executing code in isolated sandboxes, analyzing datasets, and coordinating with professional platforms like Slack, Notion, and Google Drive.\n\nIt leverages a dynamic routing architecture across more than 20 specialized models, assigning research, coding, or reasoning subtasks to the optimal provider while maintaining persistent state across days or weeks.",
      useCases: [
        {
          title: "Autonomous research and document generation",
          body: "Assign complex market research or competitor analysis goals and receive complete verified synthesis reports with sources.",
        },
        {
          title: "Scheduled digital work routines",
          body: "Set up standing background jobs that monitor industry alerts, process spreadsheets, or sync summaries to Slack.",
        },
        {
          title: "Isolated code and data execution",
          body: "Run Python scripts, data transformations, and chart generation in secure cloud sandboxes without local dependencies.",
        },
      ],
      pros: [
        "Intelligent multi-model routing matches specific subtasks to best-in-class models",
        "Persistent background execution handles long-running jobs reliably",
        "Deep integrations with enterprise workspace apps like Notion, Drive, and Slack",
      ],
      cons: [
        "Restricted to Perplexity Max subscribers with credit-metered execution limits",
        "Complex automated web interactions can incur high token usage over multi-day tasks",
      ],
      alternatives: ["perplexity", "operator", "manus"],
    },
  },
  {
    slug: "minimax-m3-1-flash",
    name: "MiniMax M3.1 Flash",
    tagline: "High-speed multimodal frontier model optimized for coding and low latency",
    description: "MiniMax M3.1 Flash is MiniMax's ultra-low-latency multimodal model, engineered for high-throughput coding agent tasks, rapid document parsing, and real-time conversational streaming.",
    websiteUrl: "https://minimax.io",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free trial credits",
    pricingNote: "Free trial tokens upon registration; tiered usage-based API pricing per million tokens.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-rose-500 to-pink-900",
    tagsPipe: "llm|multimodal|coding|api|low-latency",
    makerHandle: "@minimax-ai",
    editorial: {
      longDescription: "MiniMax M3.1 Flash represents MiniMax's frontier multimodal model family designed for high-speed developer workflows and conversational agents. Engineered to deliver exceptional tokens-per-second throughput without sacrificing complex reasoning, M3.1 Flash excels at structured data generation, multi-file code assistance, and visual document understanding.\n\nIt offers competitive developer pricing, full tool-calling capabilities, and OpenAI-compatible API endpoints for drop-in replacement across agent frameworks.",
      useCases: [
        {
          title: "Real-time coding copilot streaming",
          body: "Power interactive IDE inline completions and code suggestions with sub-second time-to-first-token latency.",
        },
        {
          title: "Document and UI screenshot extraction",
          body: "Parse complex invoices, diagrams, and mobile screenshots into validated JSON structures in milliseconds.",
        },
        {
          title: "Interactive voice and chat agent backends",
          body: "Serve high-concurrency conversational agents where latency directly impacts user experience.",
        },
      ],
      pros: [
        "Remarkable time-to-first-token latency and high throughput generation",
        "Native multimodal comprehension supporting images, documents, and code",
        "OpenAI API compatibility for seamless integration into existing agent stacks",
      ],
      cons: [
        "Peak reasoning on highly abstract mathematical proofs trails larger flagship variants",
        "Per-token rate limits apply on lower-tier developer accounts",
      ],
      alternatives: ["deepseek", "claude", "gpt-4o"],
    },
  },
  {
    slug: "opencode",
    name: "Opencode",
    tagline: "Open-source AI coding assistant and agent environment",
    description: "Opencode is an open-source terminal and editor-native AI coding agent that orchestrates multi-file edits, autonomous refactors, and test verification.",
    websiteUrl: "https://opencode.ai/",
    githubUrl: "https://github.com/anomalyco/opencode",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Completely open source under MIT license; run locally with your own LLM providers.",
    hasApi: true,
    logoEmoji: "⌨️",
    logoGradient: "from-neutral-700 to-zinc-950",
    tagsPipe: "coding|open-source|cli|developer-tools|agent",
    makerHandle: "@anomalyco",
    editorial: {
      longDescription: "Opencode is an open-source autonomous coding tool created by Anomaly. Designed for developers who prefer full control over their coding assistant, Opencode runs natively in your terminal or development environment, reading repository contexts, drafting multi-file changes, and running test loops to verify bug fixes.\n\nIt avoids proprietary cloud lock-in by supporting direct API connections to OpenAI, Anthropic, DeepSeek, and locally hosted models via Ollama or vLLM.",
      useCases: [
        {
          title: "Terminal-first multi-file code refactoring",
          body: "Instruct Opencode from your command line to migrate APIs, update dependencies, and refactor architecture across files.",
        },
        {
          title: "Test-driven autonomous bug patching",
          body: "Feed failing test logs to Opencode and let the agent iteratively apply patches until the test suite turns green.",
        },
        {
          title: "Private air-gapped software development",
          body: "Connect Opencode to local open-weight models for zero data exfiltration on proprietary enterprise repos.",
        },
      ],
      pros: [
        "100% open-source under MIT with a rapidly growing community (200k+ GitHub stars)",
        "Zero vendor lock-in; works with any OpenAI-compatible or local model endpoint",
        "Native git integration with clean reviewable diffs and rollback capabilities",
      ],
      cons: [
        "Requires users to manage their own API keys or local GPU compute",
        "Lacks the graphical visual editor polish of full standalone IDEs like Cursor",
      ],
      alternatives: ["aider", "cursor", "openchamber"],
    },
  },
  {
    slug: "openship",
    name: "Openship",
    tagline: "Open-source deployment platform for cloud and self-hosted servers",
    description: "Openship is an open-source, self-hostable application deployment platform featuring container builds, instant rollbacks, multi-server fan-out, and zero vendor lock-in.",
    websiteUrl: "https://openship.io/",
    githubUrl: "https://github.com/openship/openship",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free self-hosted / $10/mo managed",
    pricingNote: "Apache-2.0 open-source engine; self-host on any server for free, or use managed Openship Cloud.",
    hasApi: true,
    logoEmoji: "🚢",
    logoGradient: "from-teal-500 to-cyan-900",
    tagsPipe: "deployment|devops|docker|self-hosted|open-source",
    makerHandle: "@openship",
    editorial: {
      longDescription: "Openship is an open-source platform-as-a-service (PaaS) that lets developers build, deploy, and manage web applications on any Linux server. Designed as a self-hostable alternative to Vercel and Heroku, Openship turns standard servers from Hetzner, DigitalOcean, or AWS into an automated deployment fleet.\n\nIt features zero-downtime rolling deployments, automated HTTPS certificates, build pipelines, and seamless workload migration between managed cloud and private VPS nodes.",
      useCases: [
        {
          title: "Self-hosted PaaS on commodity VPS",
          body: "Connect affordable cloud servers and deploy Git repositories automatically with zero management overhead.",
        },
        {
          title: "Hybrid cloud and private server routing",
          body: "Host frontends on managed cloud edges while running database-heavy microservices on private bare metal.",
        },
        {
          title: "Instant preview environments for pull requests",
          body: "Spin up isolated container environments for every pull request with automatic HTTPS domain provisioning.",
        },
      ],
      pros: [
        "Apache-2.0 licensed with complete freedom to self-host on any Linux machine",
        "Supports multi-server fan-out across providers with no proprietary agent lock-in",
        "Substantially lowers hosting bills compared to premium serverless vendors",
      ],
      cons: [
        "Requires basic server administration familiarity for self-hosted maintenance",
        "Advanced enterprise SSO and compliance features are part of managed tiers",
      ],
      alternatives: ["coolify", "railway", "render"],
    },
  },
  {
    slug: "openbot",
    name: "Openbot",
    tagline: "Open-source desktop AI agent for autonomous computer workflows",
    description: "Openbot is an open-source autonomous desktop agent for macOS, Windows, and Linux that performs browser tasks, terminal commands, and system-level workflows.",
    websiteUrl: "https://openbot.run/",
    githubUrl: "https://github.com/nightly-labs/openbot",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "100% open source under Apache-2.0; connects to local and cloud LLM providers via BYOK.",
    hasApi: true,
    logoEmoji: "🤖",
    logoGradient: "from-purple-500 to-violet-900",
    tagsPipe: "desktop-agent|automation|computer-use|open-source",
    makerHandle: "@nightly-labs",
    editorial: {
      longDescription: "Openbot is an open-source desktop AI agent developed by Nightly Labs. It enables users to automate complex digital tasks across operating systems, including browser navigation, CLI script execution, file manipulation, and third-party application control.\n\nAvailable across macOS, Windows, and Linux, Openbot is built with a modular plugin architecture that lets developers configure custom skills, connect vision-language models, and run automated routines completely locally or via cloud APIs.",
      useCases: [
        {
          title: "Cross-application desktop task automation",
          body: "Delegate multi-step digital chores like data entry across spreadsheets, email clients, and CRM dashboards.",
        },
        {
          title: "Automated browser data extraction",
          body: "Direct Openbot to navigate authenticated web portals, extract reports, and organize structured downloads.",
        },
        {
          title: "Developer system workflow orchestration",
          body: "Automate repetitive local setup tasks, environment provisioning, and testing routines using natural language.",
        },
      ],
      pros: [
        "Fully open source under Apache-2.0 with cross-platform desktop support",
        "Extensible plugin system allowing custom tool integrations and skills",
        "BYOK architecture ensures API key safety and supports local open models",
      ],
      cons: [
        "Autonomous desktop control requires granting system accessibility permissions",
        "Complex screen layouts can require occasional corrective human guidance",
      ],
      alternatives: ["computer", "overlay", "operator"],
    },
  },
  {
    slug: "notra",
    name: "Notra",
    tagline: "Generative engine optimization and AI search citation tracking",
    description: "Notra is a Generative Engine Optimization (GEO) platform that monitors brand visibility, sentiment, and citation frequencies across ChatGPT, Claude, Perplexity, and Gemini.",
    websiteUrl: "https://www.usenotra.com/",
    categoryLegacyId: CATEGORIES.DATA_ANALYTICS,
    pricingModel: "paid",
    startingPrice: "$49 per month",
    pricingNote: "Free initial domain citation scan; monthly subscriptions for continuous engine tracking.",
    hasApi: true,
    logoEmoji: "📊",
    logoGradient: "from-purple-400 to-indigo-900",
    tagsPipe: "geo|ai-search|seo|brand-monitoring|analytics",
    makerHandle: "@usenotra",
    editorial: {
      longDescription: "Notra is a Generative Engine Optimization (GEO) and AI analytics platform designed to help marketing teams understand how their brand appears in AI-generated answers. By simulating thousands of real buyer queries across ChatGPT, Claude, Gemini, and Perplexity, Notra tracks whether a company is cited, what competitors are recommended instead, and which web sources drive recommendations.\n\nIt provides actionable recommendations on content gaps, technical schema optimizations, and digital PR placements to increase organic AI referral traffic.",
      useCases: [
        {
          title: "AI answer engine visibility monitoring",
          body: "Track how often your product is recommended by ChatGPT, Claude, and Perplexity for high-intent search queries.",
        },
        {
          title: "Competitor recommendation benchmarking",
          body: "Discover which competing tools show up in AI search answers and analyze the underlying source citations.",
        },
        {
          title: "Generative engine content optimization",
          body: "Identify specific documentation and landing page gaps needed to win citations in LLM synthesis summaries.",
        },
      ],
      pros: [
        "Continuous multi-engine query tracking across ChatGPT, Claude, Gemini, and Perplexity",
        "Actionable source-attribution insights revealing exactly where models get their data",
        "Clear competitor share-of-voice visualizations and trend alerts",
      ],
      cons: [
        "GEO tactics evolve rapidly as AI labs alter retrieval mechanisms and safety filters",
        "Ongoing citation monitoring requires an active monthly subscription tier",
      ],
      alternatives: ["profound", "otterly", "peec"],
    },
  },
  {
    slug: "mimo-v2-6",
    name: "MiMo-V2.6",
    tagline: "Natively omnimodal AI model for complex reasoning and agentic workflows",
    description: "MiMo-V2.6 is Xiaomi's flagship omnimodal AI foundation model, providing native end-to-end processing across audio, image, video, and text for advanced reasoning and device agency.",
    websiteUrl: "https://mimo.xiaomi.com/mimo-v2-6",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free demo / pay-as-you-go",
    pricingNote: "Free access in the Xiaomi MiMo research portal; pay-per-token API endpoints for production.",
    hasApi: true,
    logoEmoji: "📱",
    logoGradient: "from-orange-500 to-amber-900",
    tagsPipe: "omnimodal|foundation-model|vision|audio|reasoning",
    makerHandle: "@xiaomi-ai",
    editorial: {
      longDescription: "MiMo-V2.6 is a natively omnimodal artificial intelligence model developed by Xiaomi. Unlike pipeline architectures that stitch separate vision and audio encoders together, MiMo-V2.6 processes text, high-resolution imagery, video sequences, and audio streams in a single unified transformer backbone.\n\nOptimized for edge device deployment as well as cloud-scale inference, MiMo-V2.6 demonstrates high proficiency in visual question answering, code synthesis, spatial understanding, and autonomous device interactions.",
      useCases: [
        {
          title: "Native multi-sensory reasoning",
          body: "Analyze synchronized video and audio feeds to detect context, describe physical scenes, and identify sound events.",
        },
        {
          title: "Edge device intelligence and agency",
          body: "Power next-generation smart home, mobile, and automotive interfaces with low-latency multimodal comprehension.",
        },
        {
          title: "Complex technical document and chart parsing",
          body: "Extract complex tabular data, architectural blueprints, and financial charts with high optical accuracy.",
        },
      ],
      pros: [
        "Native omnimodal tokenization delivers superior coherence across text, image, video, and audio",
        "State-of-the-art visual reasoning benchmarks matching top-tier industry frontier models",
        "Engineered for scalable edge deployment and low-latency mobile device integration",
      ],
      cons: [
        "Global API access and English documentation are more restricted than western cloud providers",
        "High-resolution video inference requires substantial server bandwidth and GPU memory",
      ],
      alternatives: ["gpt-4o", "gemini", "claude"],
    },
  },
  {
    slug: "chatbase",
    name: "Chatbase",
    tagline: "Custom AI chatbots trained on your data and documents",
    description: "Chatbase is a no-code chatbot builder that lets businesses train custom conversational agents on PDFs, websites, Notion pages, and APIs, embeddable on any website.",
    websiteUrl: "https://www.chatbase.co/",
    categoryLegacyId: CATEGORIES.CONVERSATIONAL_AI,
    pricingModel: "freemium",
    startingPrice: "Free / $19 per month",
    pricingNote: "Free tier with 20 message credits/mo; paid plans add higher message quotas, custom domains, and MCP integration.",
    hasApi: true,
    logoEmoji: "💬",
    logoGradient: "from-violet-600 to-indigo-950",
    tagsPipe: "chatbot|customer-support|no-code|mcp|rag",
    makerHandle: "@chatbase",
    editorial: {
      longDescription: "Chatbase is an AI chatbot creation platform that transforms company knowledge bases into interactive customer support agents. By uploading documents, syncing Notion databases, or scraping public websites, users can deploy custom-trained conversational bots in under five minutes.\n\nIt features live support agent handoff, lead capture forms, multilingual responses, and Model Context Protocol (MCP) integrations allowing connections to Claude and ChatGPT without engineering overhead.",
      useCases: [
        {
          title: "Automated 24/7 website customer support",
          body: "Embed a conversational support widget that resolves routine user questions by referencing your help docs.",
        },
        {
          title: "Internal company knowledge base search",
          body: "Create private Slack or web chatbots for employee onboarding and company policy lookups.",
        },
        {
          title: "Lead qualification and meeting booking",
          body: "Capture visitor contact details and qualify buyer interest automatically within chat conversations.",
        },
      ],
      pros: [
        "Zero-code setup trains on website URLs, PDFs, and Notion in minutes",
        "Supports Model Context Protocol (MCP) for direct connections to Claude and ChatGPT",
        "Embeddable widget with customizable themes and human agent fallback",
      ],
      cons: [
        "Free plan is restricted to 20 message credits per month for testing",
        "Complex enterprise workflows require paid subscription tiers for custom domains and API access",
      ],
      alternatives: ["intercom-fin", "botpress", "voiceflow"],
    },
  },
  {
    slug: "plane",
    name: "Plane",
    tagline: "Open-source project management platform built for modern engineering teams",
    description: "Plane is an open-source, extensible project management tool and Jira alternative featuring issue tracking, cycles, roadmap modules, and AI-assisted triage.",
    websiteUrl: "https://plane.so/",
    githubUrl: "https://github.com/makeplane/plane",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free self-hosted / $8 per user",
    pricingNote: "Open-source Community Edition is free forever; Plane Pro cloud adds advanced cycles, modules, and analytics.",
    hasApi: true,
    logoEmoji: "📐",
    logoGradient: "from-blue-500 to-slate-900",
    tagsPipe: "project-management|open-source|jira-alternative|issue-tracking|developer-tools",
    makerHandle: "@makeplane",
    editorial: {
      longDescription: "Plane is an open-source software development management tool built as an agile alternative to Jira and Linear. It empowers product and engineering teams to track issues, plan project cycles, organize modular epics, and monitor team velocity without heavy enterprise bureaucracy.\n\nOffered both as a completely self-hostable Docker platform and a managed cloud service, Plane features GitHub sync, customized workflows, time tracking, and AI-assisted issue summaries.",
      useCases: [
        {
          title: "Engineering sprint and cycle planning",
          body: "Organize tasks into iterative release cycles with automated burndown tracking and backlog grooming.",
        },
        {
          title: "Self-hosted project management for privacy",
          body: "Deploy Plane via Docker on private servers to retain complete sovereignty over code issue data.",
        },
        {
          title: "Cross-functional roadmap and initiative tracking",
          body: "Connect high-level company initiatives and modules to granular developer issues and pull requests.",
        },
      ],
      pros: [
        "Fully open-source Community Edition with simple Docker and Kubernetes deployment",
        "Clean, responsive UI with keyboard shortcuts and customizable board/list views",
        "Deep GitHub and GitLab integrations for automated issue status updates on merge",
      ],
      cons: [
        "Self-hosted setup requires managing Docker containers and database maintenance",
        "Advanced team velocity analytics and SAML SSO require the Pro cloud tier",
      ],
      alternatives: ["linear", "jira", "github"],
    },
  },
];

async function main() {
  console.log("Connecting to Convex...");
  const convex = createServerConvexClient();
  if (!convex) throw new Error("No convex client");

  for (const tool of NEW_TOOLS) {
    console.log(`\n========================================`);
    console.log(`Processing ${tool.name} (${tool.slug})...`);
    console.log(`========================================`);

    const svgLogoPath = resolve(process.cwd(), `public/logos/${tool.slug}.svg`);
    const pngLogoPath = resolve(process.cwd(), `public/logos/${tool.slug}.png`);
    const ext = fs.existsSync(svgLogoPath) ? "svg" : fs.existsSync(pngLogoPath) ? "png" : null;
    if (!ext) {
      throw new Error(`CRITICAL: Logo file missing for ${tool.slug} in public/logos/!`);
    }
    const logoUrl = `/logos/${tool.slug}.${ext}`;
    console.log(`✓ Logo asset verified: ${logoUrl}`);

    const NOW = Date.now();
    const toolId = "cmucr_" + tool.slug.replace(/[^a-zA-Z0-9]/g, "") + "_" + Math.random().toString(36).substring(2, 8);

    // 1. Ingest / Update in Convex
    const existingPage = await convex.query(api.tools.pageData, { slug: tool.slug });
    if (existingPage?.tool?.id) {
      console.log(`ℹ Convex: ${tool.name} exists, patching logoUrl and metadata...`);
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: existingPage.tool.id,
        data: {
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          websiteUrl: tool.websiteUrl,
          githubUrl: tool.githubUrl,
          pricingModel: tool.pricingModel,
          startingPrice: tool.startingPrice,
          pricingNote: tool.pricingNote,
          hasApi: tool.hasApi,
          logoEmoji: tool.logoEmoji,
          logoGradient: tool.logoGradient,
        },
        logoUrl,
        editorial: {
          longDescription: tool.editorial.longDescription,
          useCases: tool.editorial.useCases,
          pros: tool.editorial.pros,
          cons: tool.editorial.cons,
          alternatives: tool.editorial.alternatives,
          pricingChecked: true,
        },
        nowMs: NOW,
      });
      console.log(`✓ Convex: Patched existing ${tool.slug} with ${logoUrl}`);
    } else {
      const toolData = {
        id: toolId,
        slug: tool.slug,
        name: tool.name,
        tagline: tool.tagline,
        description: tool.description,
        websiteUrl: tool.websiteUrl,
        categoryLegacyId: tool.categoryLegacyId,
        pricingModel: tool.pricingModel,
        startingPrice: tool.startingPrice,
        pricingNote: tool.pricingNote,
        hasApi: tool.hasApi,
        logoEmoji: tool.logoEmoji,
        logoGradient: tool.logoGradient,
        logoUrl: logoUrl,
        tagsPipe: tool.tagsPipe,
        makerHandle: tool.makerHandle,
        status: "live",
        editorsPick: true,
        curated: true,
        createdAt: NOW,
        editorial: {
          longDescription: tool.editorial.longDescription,
          useCases: tool.editorial.useCases,
          pros: tool.editorial.pros,
          cons: tool.editorial.cons,
          alternatives: tool.editorial.alternatives,
          pricingChecked: true,
        },
      };

      const res = await convex.mutation(api.adminCrud.toolCreate, toolData);
      console.log(`✓ Convex: Created ${tool.name} (Legacy ID: ${res.id})`);
      if (tool.githubUrl) {
        await convex.mutation(api.adminCrud.toolPatch, {
          toolLegacyId: res.id,
          data: { githubUrl: tool.githubUrl },
          nowMs: NOW,
        });
        console.log(`✓ Convex: Patched githubUrl`);
      }
    }

    // 2. Ingest into SQLite
    try {
      const existing = await db.tool.findUnique({ where: { slug: tool.slug } });
      if (!existing) {
        await db.tool.create({
          data: {
            id: toolId,
            slug: tool.slug,
            name: tool.name,
            tagline: tool.tagline,
            description: tool.description,
            websiteUrl: tool.websiteUrl,
            githubUrl: tool.githubUrl,
            categoryId: tool.categoryLegacyId,
            pricingModel: tool.pricingModel,
            startingPrice: tool.startingPrice,
            pricingNote: tool.pricingNote,
            hasApi: tool.hasApi,
            logoEmoji: tool.logoEmoji,
            logoGradient: tool.logoGradient,
            logoUrl: logoUrl,
            tags: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            status: "live",
            editorsPick: true,
            curated: true,
            claimed: false,
            pinned: 0,
          },
        });
        console.log(`✓ SQLite: Created tool ${tool.name}`);
      } else {
        await db.tool.update({
          where: { slug: tool.slug },
          data: {
            name: tool.name,
            tagline: tool.tagline,
            description: tool.description,
            websiteUrl: tool.websiteUrl,
            githubUrl: tool.githubUrl,
            pricingModel: tool.pricingModel,
            startingPrice: tool.startingPrice,
            pricingNote: tool.pricingNote,
            hasApi: tool.hasApi,
            logoEmoji: tool.logoEmoji,
            logoGradient: tool.logoGradient,
            logoUrl: logoUrl,
            tags: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            status: "live",
            editorsPick: true,
            curated: true,
          },
        });
        console.log(`✓ SQLite: Updated tool ${tool.name}`);
      }

      await db.$executeRawUnsafe(
        `UPDATE Tool SET
           longDescription = ?,
           useCases = ?,
           pros = ?,
           cons = ?,
           alternatives = ?,
           pricingModel = ?,
           startingPrice = ?,
           pricingNote = ?,
           pricingCheckedAt = ?,
           contentUpdatedAt = ?
         WHERE slug = ?`,
        tool.editorial.longDescription,
        JSON.stringify(tool.editorial.useCases),
        JSON.stringify(tool.editorial.pros),
        JSON.stringify(tool.editorial.cons),
        tool.editorial.alternatives.join("|"),
        tool.pricingModel,
        tool.startingPrice,
        tool.pricingNote,
        new Date(),
        new Date(),
        tool.slug
      );
      console.log(`✓ SQLite: Editorial updated for ${tool.name}`);
    } catch (err) {
      console.error(`✗ SQLite error for ${tool.name}:`, err);
      throw err;
    }
  }

  // 3. Verification across Convex
  console.log("\n==========================================");
  console.log("Verifying all 11 tool logos in Convex...");
  console.log("==========================================");
  const dir = await convex.query(api.tools.directory, { page: 1, pageSize: 100, sort: "newest" });
  const rows = "rows" in dir && Array.isArray(dir.rows) ? dir.rows : [];
  for (const tool of NEW_TOOLS) {
    const row = rows.find((r) => r.slug === tool.slug);
    const expectedSvg = `/logos/${tool.slug}.svg`;
    const expectedPng = `/logos/${tool.slug}.png`;
    const isMatch = row?.logoUrl === expectedSvg || row?.logoUrl === expectedPng;
    console.log(`${tool.slug.padEnd(25)} -> ${isMatch ? "✓ MATCH" : "✗ MISMATCH"}: ${row?.logoUrl}`);
  }
}

main()
  .catch((err) => {
    console.error("Batch execution failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
