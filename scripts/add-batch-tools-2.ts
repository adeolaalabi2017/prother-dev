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
    slug: "cue-agents",
    name: "Cue Agents",
    tagline: "Autonomous background agent execution engine by Manus",
    description: "Cue Agents is an autonomous background agent execution platform by Manus that runs scheduled, event-driven digital worker tasks across cloud sandboxes.",
    websiteUrl: "https://cue.im/",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free trial / usage credits",
    pricingNote: "Free credits upon signup; tiered pricing for high-concurrency background agent execution.",
    hasApi: true,
    logoEmoji: "🤖",
    logoGradient: "from-cyan-600 to-blue-900",
    tagsPipe: "agents|automation|background-execution|digital-worker",
    makerHandle: "@manus",
    editorial: {
      longDescription: "Cue Agents is an agentic background execution engine developed by the creators of Manus. Designed for continuous digital workflows, Cue allows developers and operators to trigger autonomous AI agents via webhook, schedule, or event loop to execute multi-step web and browser actions in isolated cloud sandboxes.\n\nIt features persistent state retention, tool calling capabilities, and automated exception handling to ensure long-running operational workflows execute reliably.",
      useCases: [
        {
          title: "Scheduled background web monitoring",
          body: "Set up background agents to scrape, analyze, and report changes across dynamic web portals automatically.",
        },
        {
          title: "Webhook-triggered task execution",
          body: "Trigger autonomous agent routines from external webhooks to handle incoming lead qualification or support triage.",
        },
        {
          title: "Multi-step operational data pipelines",
          body: "Coordinate autonomous data extraction and structured document generation without keeping a browser open.",
        },
      ],
      pros: [
        "Persistent cloud-sandbox environment built specifically for long-running agent routines",
        "Seamless event-driven integration supporting webhooks and scheduled cron pings",
        "Built-in agent observability and detailed execution trace logs",
      ],
      cons: [
        "High-concurrency background routines consume credit quotas steadily over time",
        "Requires initial tool-configuration setup for custom browser workflows",
      ],
      alternatives: ["manus", "openbot", "operator"],
    },
  },
  {
    slug: "manus",
    name: "Manus",
    tagline: "General-purpose autonomous AI agent for complex digital tasks",
    description: "Manus is a general-purpose autonomous AI agent that operates software, browses the web, writes code, and completes multi-step digital workflows end to end.",
    websiteUrl: "https://manus.im/",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free trial / $20 per month",
    pricingNote: "Initial free evaluation credits; monthly subscriptions for unlimited agentic computer tasks.",
    hasApi: true,
    logoEmoji: "🦾",
    logoGradient: "from-indigo-600 to-violet-950",
    tagsPipe: "autonomous-agents|digital-worker|computer-use|automation",
    makerHandle: "@manus",
    editorial: {
      longDescription: "Manus is a general-purpose autonomous AI agent platform designed to execute complex digital tasks. By combining advanced vision-language models with browser sandboxes, terminal environments, and API integrations, Manus breaks down high-level goal prompts into subtasks and executes them independently.\n\nIt handles web research, spreadsheet processing, code generation, and web app interactions without requiring constant step-by-step human intervention.",
      useCases: [
        {
          title: "End-to-end market research compilation",
          body: "Prompt Manus with a research goal and receive a structured report compiled across dozens of live web sources.",
        },
        {
          title: "Autonomous software testing and scraping",
          body: "Direct Manus to test web applications, capture console errors, and verify user flows automatically.",
        },
        {
          title: "Multi-platform administrative operations",
          body: "Delegate repetitive data transfer tasks between web dashboards, Google Sheets, and Notion.",
        },
      ],
      pros: [
        "Full multi-modal computer control supporting browser, terminal, and document sandboxes",
        "High autonomy in handling unexpected web popups and anti-bot challenges",
        "Clean, intuitive interface for watching agent execution streams live",
      ],
      cons: [
        "High-complexity multi-hour tasks require subscription credits",
        "Air-gapped local installations require enterprise enterprise deployments",
      ],
      alternatives: ["cue-agents", "openbot", "devin"],
    },
  },
  {
    slug: "devin",
    name: "Devin",
    tagline: "Autonomous AI software engineer for end-to-end repository tasks",
    description: "Devin is Cognition's autonomous AI software engineer capable of planning, coding, debugging, and deploying entire software projects in an isolated sandbox.",
    websiteUrl: "https://devin.ai/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "paid",
    startingPrice: "$500 per month",
    pricingNote: "Enterprise and team plans billed by ACU (Autonomous Compute Units); card required.",
    hasApi: true,
    logoEmoji: "👨‍💻",
    logoGradient: "from-blue-600 to-slate-900",
    tagsPipe: "ai-engineer|coding|autonomous|developer-tools|cognition",
    makerHandle: "@cognition-labs",
    editorial: {
      longDescription: "Devin, developed by Cognition, is the pioneer autonomous AI software engineer. Operating inside a cloud sandbox equipped with its own shell, code editor, and browser, Devin takes high-level user requests and independently plans implementation steps, writes code, fixes compilation errors, and deploys applications.\n\nDevin can learn unfamiliar technologies on the fly by reading documentation, debug complex open-source repositories, and collaborate with engineering teams via Slack or GitHub issue comments.",
      useCases: [
        {
          title: "Autonomous repository feature development",
          body: "Assign GitHub issues to Devin and let the agent write code, add unit tests, and submit a pull request.",
        },
        {
          title: "Legacy codebase migration and refactoring",
          body: "Task Devin with upgrading framework versions or refactoring deprecated APIs across large codebases.",
        },
        {
          title: "Automated bug reproduction and fixing",
          body: "Provide user bug reports and let Devin reproduce failures in its sandbox before committing fixes.",
        },
      ],
      pros: [
        "First-of-its-kind autonomous developer sandbox with shell, browser, and editor access",
        "Capable of learning new APIs and frameworks dynamically during task execution",
        "Seamless GitHub integration for automated PR creation and review cycles",
      ],
      cons: [
        "High price point targeting professional engineering teams and enterprises",
        "Complex architecture tasks still benefit from human code review",
      ],
      alternatives: ["qoder", "opencode", "aider"],
    },
  },
  {
    slug: "qoder",
    name: "Qoder",
    tagline: "AI coding agent and intelligent editor for autonomous software engineering",
    description: "Qoder is an agentic coding platform offering intelligent completions, conversational programming, and automated multi-file code generation across VS Code and JetBrains.",
    websiteUrl: "https://qoder.com/",
    githubUrl: "https://github.com/qoderAI",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free tier / $20 per month",
    pricingNote: "Free tier includes basic inline completions; Pro tier unlocks agentic multi-file refactoring.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-amber-500 to-yellow-800",
    tagsPipe: "coding|agentic|ide|vs-code|jetbrains",
    makerHandle: "@qoder_ai",
    editorial: {
      longDescription: "Qoder is a next-generation AI programming platform designed for agentic development. Compatible with major IDEs like VS Code and the JetBrains suite, Qoder goes beyond basic line completions by analyzing full repository context to perform complex multi-file refactors, unit test generation, and automated code reviews.\n\nIt features native support for leading frontier models and allows developers to alternate between inline completions, chat instructions, and autonomous agent loops.",
      useCases: [
        {
          title: "Repository-wide code generation",
          body: "Generate full features across controller, model, and template files with unified context awareness.",
        },
        {
          title: "Automated unit test suite creation",
          body: "Scan project modules and automatically write comprehensive unit tests with edge-case coverage.",
        },
        {
          title: "Interactive inline code refactoring",
          body: "Highlight legacy functions and prompt Qoder to optimize performance, clean up types, or convert syntaxes.",
        },
      ],
      pros: [
        "Deep integration with both VS Code and JetBrains IDE ecosystems",
        "Fast low-latency inline code completions and multi-file editing",
        "Generous free tier for individual open-source developers",
      ],
      cons: [
        "Agentic multi-file refactors require upgrading to the paid Pro tier",
        "Large repository indexing can consume CPU memory during initial setup",
      ],
      alternatives: ["cursor", "opencode", "aider"],
    },
  },
  {
    slug: "droid",
    name: "Droid",
    tagline: "Autonomous software development Droids built by Factory",
    description: "Droid by Factory is an enterprise autonomous software engineering platform that deploys specialized AI workers for code reviews, testing, and feature construction.",
    websiteUrl: "https://factory.com/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "paid",
    startingPrice: "Contact sales",
    pricingNote: "Enterprise seats billed per developer for autonomous Droid worker deployments.",
    hasApi: true,
    logoEmoji: "🤖",
    logoGradient: "from-red-600 to-slate-900",
    tagsPipe: "enterprise|droids|factory|software-engineering|devops",
    makerHandle: "@factory",
    editorial: {
      longDescription: "Droid is Factory's autonomous software worker system engineered for enterprise engineering organizations. Rather than acting as a simple chat assistant, Droids operate as specialized synthetic team members assigned to pull request reviews, security audits, documentation updates, and test suite maintenance.\n\nFactory Droids integrate deeply into GitHub Enterprise and GitLab pipelines, upholding organizational coding standards and accelerating sprint throughput.",
      useCases: [
        {
          title: "Automated pull request review and security audit",
          body: "Deploy Droids to review incoming PRs for security vulnerabilities, style compliance, and missing tests.",
        },
        {
          title: "Continuous documentation synchronization",
          body: "Keep internal API documentation and architecture diagrams in sync with code updates automatically.",
        },
        {
          title: "Autonomous backlog task resolution",
          body: "Assign routine maintenance issues to Droids for automated resolution and PR submission.",
        },
      ],
      pros: [
        "Purpose-built synthetic workers designed for team pipeline integration",
        "Enforces enterprise security policies and internal coding standards by default",
        "Reduces senior developer fatigue on repetitive PR reviews and triage",
      ],
      cons: [
        "Targeted primarily at mid-market and enterprise engineering teams",
        "Requires repository permissions and CI/CD workflow integration",
      ],
      alternatives: ["devin", "qoder", "opencode"],
    },
  },
  {
    slug: "google-flow",
    name: "Google Flow",
    tagline: "Google's generative AI creation workspace for interactive media and workflows",
    description: "Google Flow is a creative AI workspace by Google that integrates Gemini, Imagen, and Veo models into an interactive visual canvas for media generation and workflow design.",
    websiteUrl: "https://flow.google.com/",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "Free in Google AI Studio / Workspace",
    pricingNote: "Free generation credits in Google AI Labs; enterprise tiers billed through Google Cloud.",
    hasApi: true,
    logoEmoji: "🎨",
    logoGradient: "from-blue-500 to-purple-800",
    tagsPipe: "google|generative-ai|canvas|design|media-generation",
    makerHandle: "@google",
    editorial: {
      longDescription: "Google Flow is Google's flagship creative generative AI workspace. Combining the power of Gemini 1.5 Pro, Imagen 3, and Veo video generation models, Flow provides a node-based visual canvas where designers, storytellers, and developers can orchestrate multimodal content pipelines.\n\nUsers can chain text prompts, image assets, and video generation steps together, previewing outputs in real time and exporting assets directly to Google Cloud or Workspace.",
      useCases: [
        {
          title: "Node-based multimodal content pipelines",
          body: "Connect prompt nodes, image synthesis, and video generation into automated creative workflows.",
        },
        {
          title: "Interactive storyboarding and design prototyping",
          body: "Iterate on visual concepts and moodboards with high-resolution Imagen 3 and Veo rendering.",
        },
        {
          title: "Team collaboration on generative assets",
          body: "Share workspace canvases with team members to refine prompts and co-create marketing collateral.",
        },
      ],
      pros: [
        "Native integration of Google's frontier Imagen 3 and Veo generative models",
        "Intuitive node-based visual canvas for complex content pipeline creation",
        "Seamless export to Google Cloud Storage and Google Workspace apps",
      ],
      cons: [
        "High-definition video generation nodes require cloud processing time",
        "Full feature suite is expanding progressively across Google AI Labs regions",
      ],
      alternatives: ["midjourney", "runway", "comfyui"],
    },
  },
  {
    slug: "gemini-notebook",
    name: "Gemini Notebook",
    tagline: "Personalized AI research assistant and document grounding notebook",
    description: "Gemini Notebook (NotebookLM) is Google's AI research workspace that grounds Gemini models on your uploaded PDFs, Google Docs, web links, and audio notes.",
    websiteUrl: "https://notebook.google/",
    categoryLegacyId: CATEGORIES.NLP_TEXT,
    pricingModel: "free",
    startingPrice: "$0",
    pricingNote: "Completely free research notebook with Google account login.",
    hasApi: false,
    logoEmoji: "📓",
    logoGradient: "from-blue-600 to-indigo-900",
    tagsPipe: "notebook|google|rag|research|citations|documents",
    makerHandle: "@google",
    editorial: {
      longDescription: "Gemini Notebook (formerly NotebookLM) is Google's personalized AI research assistant. By uploading PDFs, Google Docs, slide decks, research papers, and web URLs, users create an instant grounded workspace where Gemini answers questions exclusively using the provided source material.\n\nIt features automatic citation tracking, study guide creation, timeline generation, and Audio Overview podcasts that synthesize your documents into engaging conversational discussions.",
      useCases: [
        {
          title: "Academic research and literature review",
          body: "Upload multiple research PDFs and ask cross-document synthesis questions with inline page citations.",
        },
        {
          title: "Audio Overview podcast generation",
          body: "Transform complex reports into engaging two-host conversational audio recaps automatically.",
        },
        {
          title: "Study guide and briefing doc creation",
          body: "Convert class notes or project documentation into FAQs, study cards, and executive briefs.",
        },
      ],
      pros: [
        "Strict document grounding prevents hallucination by citing uploaded sources directly",
        "Includes Audio Overview feature that generates high-quality synthetic podcast recaps",
        "Completely free to use with generous document upload context limits",
      ],
      cons: [
        "Cannot search the live ungrounded web; queries rely strictly on provided sources",
        "Lacks direct API export endpoints for programmatic integrations",
      ],
      alternatives: ["perplexity", "notion-ai", "chatpdf"],
    },
  },
  {
    slug: "google-flow-music",
    name: "Google Flow Music",
    tagline: "Generative AI music engine and creative audio workstation",
    description: "Google Flow Music is Google's AI audio generation workspace that creates full-length instrumental tracks, vocal arrangements, and stem exports from text prompts.",
    websiteUrl: "https://www.flowmusic.app/",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "Free trial",
    pricingNote: "Free generation credits; monthly subscriptions for full commercial licensing and stem exports.",
    hasApi: true,
    logoEmoji: "🎵",
    logoGradient: "from-pink-500 to-rose-900",
    tagsPipe: "music-generation|audio|google|generative-ai|stems",
    makerHandle: "@google",
    editorial: {
      longDescription: "Google Flow Music is an AI-powered audio composition workstation designed for creators, video producers, and musicians. Leveraging Google's MusicLM and audio synthesis models, Flow Music allows users to generate royalty-free background tracks, sound effects, and full compositions using descriptive natural language.\n\nIt offers granular control over tempo, key, instrumentation, and stem separation, making it easy to tailor music to video cuts or podcast productions.",
      useCases: [
        {
          title: "Royalty-free soundtrack generation for video",
          body: "Generate custom background music matching exact scene moods, tempos, and lengths for video projects.",
        },
        {
          title: "Multi-track stem export for audio editing",
          body: "Export separate drums, bass, synth, and melody stems into your Digital Audio Workstation (DAW).",
        },
        {
          title: "Sound design and texture creation",
          body: "Produce unique atmospheric soundscapes and ambient audio loops for games and apps.",
        },
      ],
      pros: [
        "Generates multi-instrumental tracks with high audio fidelity and natural structure",
        "Separate stem export capabilities for advanced DAW mixing and editing",
        "Clear commercial licensing tiers for video creators and game developers",
      ],
      cons: [
        "Vocal track synthesis is best suited for background textures rather than lead lyrics",
        "High-bitrate stem rendering consumes generation credits",
      ],
      alternatives: ["suno", "udio", "elevenlabs"],
    },
  },
  {
    slug: "google-ai-studio",
    name: "Google AI Studio",
    tagline: "Prototyping environment and API playground for Gemini models",
    description: "Google AI Studio is a fast prototyping environment for developers to experiment with Gemini 1.5 Pro, Flash, and multimodal prompts, with instant code export.",
    websiteUrl: "https://aistudio.google.com/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free (60 RPM)",
    pricingNote: "Free tier with 60 requests/minute for Gemini 1.5 Pro and Flash; pay-as-you-go Vertex AI for higher limits.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-blue-600 to-violet-900",
    tagsPipe: "google|gemini|api-playground|developer-tools|prototyping",
    makerHandle: "@google",
    editorial: {
      longDescription: "Google AI Studio is the fastest web-based prototyping playground for Google's Gemini model family. Developers can experiment with system instructions, temperature settings, 2M token context windows, and multimodal inputs (images, video, audio, code) before exporting code snippets directly to Python, JavaScript, cURL, or Swift.\n\nAI Studio offers a generous free tier with up to 60 requests per minute, making it the premier playground for building Gemini-powered applications.",
      useCases: [
        {
          title: "2M token context window experimentation",
          body: "Upload entire books, hour-long video files, or large codebases to test Gemini's long-context recall.",
        },
        {
          title: "System prompt and JSON schema tuning",
          body: "Design and validate structured JSON outputs using Gemini's native response schema parameters.",
        },
        {
          title: "One-click SDK code export",
          body: "Convert working web prompts into production-ready Python, Node.js, or cURL code immediately.",
        },
      ],
      pros: [
        "Generous free tier offering 60 requests/minute on Gemini 1.5 Flash and Pro",
        "Unlocks massive 2M token context window for video, audio, and large codebase analysis",
        "Seamless one-click code generation for Google Gen AI SDKs",
      ],
      cons: [
        "Free tier data may be used for model improvement (paid Vertex AI tier is private)",
        "Advanced team role management is handled separately in Google Cloud Console",
      ],
      alternatives: ["openrouter", "openai-api", "anthropic"],
    },
  },
  {
    slug: "ledger-ai",
    name: "Ledger AI",
    tagline: "AI financial assistant and automated bookkeeping analytics platform",
    description: "Ledger AI is an intelligent financial analytics platform that automates invoice processing, transaction categorization, and financial forecasting for businesses.",
    websiteUrl: "https://myledgerai.com/",
    categoryLegacyId: CATEGORIES.DATA_ANALYTICS,
    pricingModel: "paid",
    startingPrice: "$29 per month",
    pricingNote: "Paid subscriptions per user; 14-day evaluation period available.",
    hasApi: true,
    logoEmoji: "📈",
    logoGradient: "from-emerald-600 to-teal-950",
    tagsPipe: "finance|bookkeeping|analytics|invoices|accounting",
    makerHandle: "@ledger-ai",
    editorial: {
      longDescription: "Ledger AI is an automated financial intelligence platform tailored for small businesses, finance teams, and accountants. By integrating bank feeds, receipt scans, and ERP systems, Ledger AI categorizes expenses, detects anomalies, and generates forward-looking cash flow projections using conversational natural language.\n\nIt eliminates manual spreadsheet reconciliation, providing real-time financial health dashboards and instant tax-readiness reports.",
      useCases: [
        {
          title: "Automated receipt and invoice extraction",
          body: "Scan receipts and invoices to automatically record line items, tax categories, and vendor data.",
        },
        {
          title: "Conversational cash flow analysis",
          body: "Ask questions like 'What was our runway change this quarter?' to receive instant chart breakdowns.",
        },
        {
          title: "Financial anomaly and duplicate detection",
          body: "Identify accidental double charges, unusual vendor price increases, and unbilled expenses.",
        },
      ],
      pros: [
        "Automates tedious bookkeeping categorization and invoice data entry",
        "Provides conversational natural language querying for complex financial ledgers",
        "Export-ready reconciliation formats for QuickBooks, Xero, and Excel",
      ],
      cons: [
        "Requires connecting bank feeds or uploading transaction CSVs for initial training",
        "Complex multi-currency tax rules require CPA verification",
      ],
      alternatives: ["tableau-pulse", "hex", "polymer"],
    },
  },
  {
    slug: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    tagline: "Anthropic's flagship frontier model for complex reasoning and deep coding",
    description: "Claude Opus 5.5 is Anthropic's most intelligent frontier model, setting new benchmarks in autonomous coding, scientific reasoning, and multi-step strategy.",
    websiteUrl: "https://www.anthropic.com/claude-opus-5-5",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "paid",
    startingPrice: "$15 / $75 per million tokens",
    pricingNote: "Available via Anthropic API and Claude Pro ($20/mo) or Team plans.",
    hasApi: true,
    logoEmoji: "🧠",
    logoGradient: "from-amber-600 to-orange-950",
    tagsPipe: "llm|frontier-model|claude|reasoning|coding|anthropic",
    makerHandle: "@anthropic",
    editorial: {
      longDescription: "Claude Opus 5.5 is Anthropic's flagship frontier model built for high-stakes intellectual tasks. Designed for complex software architecture, multi-repository code refactoring, scientific research, and nuanced analysis, Opus 5.5 sets industry benchmarks across reasoning and coding evaluations.\n\nIt features a 200k token context window, extended thinking capabilities, and precise tool calling, making it the model of choice for autonomous developer agents and research pipelines.",
      useCases: [
        {
          title: "Complex software architecture design",
          body: "Architect entire multi-tier system designs, database schemas, and migration strategies with deep reasoning.",
        },
        {
          title: "Autonomous multi-file codebase refactoring",
          body: "Power developer coding agents to execute multi-file refactors with minimal hallucination.",
        },
        {
          title: "Deep research and document synthesis",
          body: "Analyze hundreds of pages of legal, financial, or scientific text to extract non-obvious insights.",
        },
      ],
      pros: [
        "State-of-the-art benchmark performance in coding, math, and scientific reasoning",
        "Exceptional instruction-following and tool-use precision for autonomous agents",
        "200k token context window with reliable middle-of-document recall",
      ],
      cons: [
        "Higher per-token pricing compared to lighter models like Claude 3.5 Haiku",
        "API rate limits apply on lower organization usage tiers",
      ],
      alternatives: ["gpt-4o", "deepseek", "gemini"],
    },
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    tagline: "AI research company behind Claude foundation models and API platform",
    description: "Anthropic is an AI safety and research company behind the Claude family of foundation models (Opus, Sonnet, Haiku), developer API, and Claude Enterprise platform.",
    websiteUrl: "https://www.anthropic.com/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free / $20 per month",
    pricingNote: "Free Claude chat access; Pro plan is $20/mo; API billed per token across Sonnet, Haiku, and Opus.",
    hasApi: true,
    logoEmoji: "🏛️",
    logoGradient: "from-stone-700 to-neutral-950",
    tagsPipe: "llm|ai-lab|claude|api-platform|safety",
    makerHandle: "@anthropic",
    editorial: {
      longDescription: "Anthropic is a leading artificial intelligence research company founded to build reliable, interpretable, and steerable AI systems. Creators of the renowned Claude foundation model family (including Claude 3.5 Sonnet and Claude Opus 5.5), Anthropic provides both a consumer chat workspace and an enterprise developer API.\n\nIts models are widely recognized as the industry benchmark for code generation, complex reasoning, computer use, and Constitutional AI alignment.",
      useCases: [
        {
          title: "Enterprise LLM API platform integration",
          body: "Build production applications using Anthropic's Claude API with tool-use and vision capabilities.",
        },
        {
          title: "Interactive AI chat workspace (Claude.ai)",
          body: "Equip teams with Claude Pro and Team plans for document analysis, coding, and writing.",
        },
        {
          title: "Computer use agent development",
          body: "Leverage Claude's native computer-use API to build autonomous desktop and browser agents.",
        },
      ],
      pros: [
        "Industry-leading code generation and technical reasoning quality",
        "Pioneered Computer Use APIs and advanced tool-calling protocols",
        "Strong focus on AI safety, alignment, and data privacy for enterprises",
      ],
      cons: [
        "High-demand API endpoints can experience temporary rate limit caps during peak usage",
        "Free web tier limits message counts during high-traffic hours",
      ],
      alternatives: ["openrouter", "google-ai-studio", "replicate"],
    },
  },
  {
    slug: "span-01",
    name: "Span-01",
    tagline: "Open telemetry and LLM observability platform for AI agents",
    description: "Span-01 by Respan is an open-telemetry and observability platform designed to monitor token latency, agent tool calls, cost allocation, and evaluation traces.",
    websiteUrl: "https://www.respan.ai",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free tier / Usage pricing",
    pricingNote: "Free developer tier for API telemetry; volume pricing based on span ingestion.",
    hasApi: true,
    logoEmoji: "📡",
    logoGradient: "from-cyan-500 to-blue-900",
    tagsPipe: "observability|telemetry|agent-monitoring|llmops|evals",
    makerHandle: "@respan-ai",
    editorial: {
      longDescription: "Span-01, created by Respan, is a developer observability and telemetry platform built specifically for agentic AI applications. By capturing OpenTelemetry spans across multi-step LLM chains, tool invocations, and vector queries, Span-01 provides deep visibility into latency bottlenecks, token costs, and prompt failures.\n\nIt enables engineering teams to run real-time evaluations, track user feedback, and optimize agent cost efficiency in production.",
      useCases: [
        {
          title: "Agent tool-call trace monitoring",
          body: "Debug multi-step agent execution chains by inspecting individual tool inputs, outputs, and latencies.",
        },
        {
          title: "LLM cost allocation and budget alerts",
          body: "Track API spend per user, feature, or model provider with customizable threshold pings.",
        },
        {
          title: "Production prompt evaluation and versioning",
          body: "Compare model response quality across prompt revisions using automated ground-truth scoring.",
        },
      ],
      pros: [
        "Native OpenTelemetry compatibility for zero-friction SDK integration",
        "Granular visualization of nested agent execution loops and tool calls",
        "Generous developer free tier for early-stage startup telemetry",
      ],
      cons: [
        "High-throughput enterprise pipelines require monitoring log storage retention limits",
        "Requires adding SDK instrumentation wrappers to agent server endpoints",
      ],
      alternatives: ["langfuse", "arize", "datadog"],
    },
  },
  {
    slug: "unsloth",
    name: "Unsloth",
    tagline: "Ultra-fast open-source LLM fine-tuning framework with 80% less VRAM",
    description: "Unsloth is an open-source Python library that accelerates LLM fine-tuning by up to 5x while reducing GPU memory consumption by 80% with zero loss in accuracy.",
    websiteUrl: "https://www.unsloth.ai",
    githubUrl: "https://github.com/unslothai/unsloth",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source Python framework; Pro/Enterprise licenses available for multi-node GPU clusters.",
    hasApi: true,
    logoEmoji: "🦥",
    logoGradient: "from-emerald-500 to-green-900",
    tagsPipe: "fine-tuning|open-source|python|gpu|vram-optimization",
    makerHandle: "@unslothai",
    editorial: {
      longDescription: "Unsloth is an open-source fine-tuning framework designed to make training custom language models fast and hardware-efficient. By rewriting PyTorch backpropagation kernels in Triton, Unsloth allows developers to fine-tune models like Llama 3, Mistral, and Qwen up to 5x faster while cutting VRAM requirements by 80%.\n\nIt enables fine-tuning 70B parameter models on single consumer GPUs or free Google Colab instances without compromising model accuracy.",
      useCases: [
        {
          title: "Low-resource local LLM fine-tuning",
          body: "Fine-tune 8B and 70B open models on single GPUs using 80% less VRAM with QLoRA and LoRA.",
        },
        {
          title: "High-throughput enterprise model customization",
          body: "Train custom domain-specific coding or medical models 5x faster to lower cloud GPU compute bills.",
        },
        {
          title: "GGUF and Ollama model export",
          body: "Export fine-tuned weights directly into GGUF formats for instant local deployment in Ollama.",
        },
      ],
      pros: [
        "Delivers 2x to 5x faster training speeds with 80% lower VRAM usage",
        "Open-source core library with native support for Llama, Qwen, and Mistral",
        "One-click export to GGUF, vLLM, and Hugging Face Hub formats",
      ],
      cons: [
        "Multi-node multi-GPU scaling features require Unsloth Pro or Enterprise licenses",
        "Requires basic Python and PyTorch fine-tuning knowledge",
      ],
      alternatives: ["axolotl", "peft", "transformers"],
    },
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    tagline: "Unified API gateway and router for open and proprietary LLMs",
    description: "OpenRouter is an open API gateway providing single-endpoint access to hundreds of AI models from OpenAI, Anthropic, Google, Meta, and open-weight creators.",
    websiteUrl: "https://www.openrouter.ai",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Pay as you go (Free models available)",
    pricingNote: "Unified API gateway billing per token across hundreds of models with no minimum subscription.",
    hasApi: true,
    logoEmoji: "🔀",
    logoGradient: "from-blue-600 to-violet-900",
    tagsPipe: "api-gateway|router|llm|open-weights|developer-tools",
    makerHandle: "@openrouter",
    editorial: {
      longDescription: "OpenRouter is a unified API gateway that aggregates hundreds of AI language and vision models under a single OpenAI-compatible endpoint. Developers can switch seamlessly between Claude 3.5 Sonnet, GPT-4o, DeepSeek R1, and open-source models like Llama 3 without managing separate provider accounts.\n\nIt features automatic fallback routing, latency optimization, transparent cost tracking, and dozens of completely free hosted models for developer testing.",
      useCases: [
        {
          title: "Single API endpoint for all major AI models",
          body: "Access OpenAI, Anthropic, Google, Meta, and DeepSeek models through one API key and billing dashboard.",
        },
        {
          title: "Automatic model fallback and load balancing",
          body: "Configure automatic failovers to secondary providers if a primary API endpoint experiences downtime.",
        },
        {
          title: "Zero-cost developer prototyping with free models",
          body: "Experiment with dozens of completely free open-weight model endpoints during initial development.",
        },
      ],
      pros: [
        "OpenAI-compatible API format enables instant drop-in replacement across frameworks",
        "Consolidates billing, API keys, and rate limits into a single unified account",
        "Offers automated fallbacks, cost controls, and latency-optimized routing",
      ],
      cons: [
        "Adds a lightweight API gateway layer between application servers and model hosts",
        "Some specialized provider-native beta features may roll out to OpenRouter with slight delays",
      ],
      alternatives: ["replicate", "google-ai-studio", "groq"],
    },
  },
  {
    slug: "wajo",
    name: "Wajo",
    tagline: "AI-powered short-form video and social media content creation suite",
    description: "Wajo is an AI content creation platform that generates short-form social videos, voiceovers, captions, and visual scripts from text prompts.",
    websiteUrl: "https://www.wajo.ai",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "Free trial credits",
    pricingNote: "Free generation credits on signup; tiered creator subscriptions for commercial export.",
    hasApi: true,
    logoEmoji: "🎬",
    logoGradient: "from-purple-500 to-pink-900",
    tagsPipe: "video-generation|social-media|content-creation|voiceover|captions",
    makerHandle: "@wajo-ai",
    editorial: {
      longDescription: "Wajo is a generative AI video creation platform built for social media creators, marketers, and indie brands. By inputting script ideas or web links, Wajo automatically generates complete short-form video drafts complete with AI voiceovers, auto-synced captions, background visuals, and transition effects.\n\nIt streamlines the production of TikToks, YouTube Shorts, and Instagram Reels, cutting editing times from hours to minutes.",
      useCases: [
        {
          title: "Automated short-form video generation",
          body: "Turn blog posts or text prompts into fully edited TikTok and YouTube Shorts videos with captions.",
        },
        {
          title: "Multilingual video dubbing and voiceovers",
          body: "Generate natural AI voiceovers across dozens of languages for global social reach.",
        },
        {
          title: "Rapid social media ad creation",
          body: "Produce multiple video ad variations for A/B testing across social marketing campaigns.",
        },
      ],
      pros: [
        "Automates scriptwriting, voiceover, captioning, and visual editing in one workflow",
        "Pre-formatted aspect ratios optimized for TikTok, Instagram, and YouTube",
        "Fast generation speed drastically reduces video production overhead",
      ],
      cons: [
        "Advanced timeline video editing capabilities are lighter than full DAWs or Premiere Pro",
        "Free tier outputs carry watermark badges until upgrading",
      ],
      alternatives: ["runway", "pika", "heygen"],
    },
  },
  {
    slug: "emdash",
    name: "EmDash",
    tagline: "Open-source AI-native CMS and editorial publishing platform",
    description: "EmDash CMS is an open-source, Astro-powered content management system built specifically for AI agents, modern web publishing, and structured content APIs.",
    websiteUrl: "https://emdashcms.com/",
    githubUrl: "https://github.com/emdash-cms/emdash",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source CMS; self-host for free or subscribe to hosted cloud managed instances.",
    hasApi: true,
    logoEmoji: "📝",
    logoGradient: "from-blue-600 to-indigo-950",
    tagsPipe: "cms|open-source|astro|publishing|cloudflare|content",
    makerHandle: "@emdashcms",
    editorial: {
      longDescription: "EmDash CMS is an open-source, AI-native content management system built on top of Astro and Cloudflare infrastructure. Designed for modern editorial teams and autonomous AI agents, EmDash provides a distraction-free writing environment, structured content schema APIs, and native agent publishing endpoints.\n\nIt allows human authors and AI agent routines to co-create blog posts, technical documentation, and product changelogs with zero performance drag.",
      useCases: [
        {
          title: "Agent-compatible headless CMS publishing",
          body: "Expose clean structured publishing endpoints for AI writing agents to draft and schedule posts.",
        },
        {
          title: "High-performance Astro blog deployment",
          body: "Deploy lightning-fast static and SSR blogs on Cloudflare Workers with zero database latency.",
        },
        {
          title: "Modular plugin and theme extension",
          body: "Extend editorial workflows with custom Markdown components, SEO metadata tools, and media galleries.",
        },
      ],
      pros: [
        "100% open-source under MIT, optimized specifically for Astro and Cloudflare Workers",
        "Built-in agent-friendly API endpoints for automated content ingestion",
        "Substantially faster page load speeds compared to monolithic legacy CMSs",
      ],
      cons: [
        "Requires basic familiarity with Astro and Git for custom theme development",
        "Plugin ecosystem is actively expanding compared to WordPress",
      ],
      alternatives: ["ghost", "strapi", "sanity"],
    },
  },
  {
    slug: "grok-bot",
    name: "Grok Bot",
    tagline: "xAI's real-time conversational agent with X platform integration",
    description: "Grok Bot is xAI's conversational assistant integrated natively into the X platform, providing real-time news analysis, code execution, and uninhibited responses.",
    websiteUrl: "https://x.ai/bot",
    categoryLegacyId: CATEGORIES.CONVERSATIONAL_AI,
    pricingModel: "paid",
    startingPrice: "Included with X Premium / Premium+",
    pricingNote: "Requires X Premium or Premium+ subscription; API billed via xAI platform.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-slate-700 to-black",
    tagsPipe: "grok|xai|conversational-ai|real-time|x-platform",
    makerHandle: "@xai",
    editorial: {
      longDescription: "Grok Bot is xAI's flagship conversational artificial intelligence agent. Integrated directly into the X (formerly Twitter) platform and accessible via the xAI API, Grok combines real-time access to global X post streams with advanced mathematical and coding reasoning.\n\nDesigned with a witty, direct personality mode as well as a rigorous Fun/Regular toggle, Grok excels at breaking news analysis, image comprehension, and live web research.",
      useCases: [
        {
          title: "Real-time news and breaking event synthesis",
          body: "Query live breaking events to receive instant summaries grounded in real-time X post data.",
        },
        {
          title: "Interactive inline code debugging on X",
          body: "Tag Grok on social posts or use the chat interface to analyze code snippets and fix bugs.",
        },
        {
          title: "Multimodal image and document analysis",
          body: "Upload images, charts, and meme screenshots to analyze visual context and extract text.",
        },
      ],
      pros: [
        "Unrivaled real-time access to breaking global news and live X platform discourse",
        "Strong mathematical, reasoning, and code synthesis capabilities",
        "Includes both concise factual modes and playful conversational toggles",
      ],
      cons: [
        "Web access requires an active X Premium or Premium+ subscription",
        "Real-time social data streams can require cross-verifying fast-moving event claims",
      ],
      alternatives: ["chatgpt", "claude", "perplexity"],
    },
  },
  {
    slug: "monid",
    name: "Monid",
    tagline: "Autonomous AI monitoring and uptime intelligence agent",
    description: "Monid is an autonomous monitoring agent that continuously tracks web application health, API endpoints, console errors, and performance metrics.",
    websiteUrl: "https://monid.ai",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "paid",
    startingPrice: "$29 per month",
    pricingNote: "14-day free trial; tiered monthly plans based on monitored workflows.",
    hasApi: true,
    logoEmoji: "🛡️",
    logoGradient: "from-blue-600 to-indigo-900",
    tagsPipe: "monitoring|uptime|observability|alerts|devops",
    makerHandle: "@monid-ai",
    editorial: {
      longDescription: "Monid is an autonomous AI monitoring and uptime intelligence platform. Unlike static ping monitors that only alert on 500 errors, Monid uses agentic crawlers to interact with web applications like a real user - testing forms, verifying auth flows, inspecting browser console errors, and reporting silent UI breakages.\n\nWhen a failure occurs, Monid generates an instant root-cause analysis report detailing the exact network request, DOM element, and suspected backend line error.",
      useCases: [
        {
          title: "Autonomous user-flow regression testing",
          body: "Continuously test login, checkout, and search flows to detect silent frontend breakage before users do.",
        },
        {
          title: "Instant AI root-cause incident reports",
          body: "Receive detailed Slack and PagerDuty alerts containing stack traces, console logs, and failure repros.",
        },
        {
          title: "API endpoint latency and schema drift monitoring",
          body: "Track API response payloads to catch unintended breaking changes and response slowdowns.",
        },
      ],
      pros: [
        "Goes beyond basic ping checks by driving interactive DOM user flows",
        "Generates actionable AI root-cause analysis reports with every incident alert",
        "Integrates with Slack, PagerDuty, and email for instant team notifications",
      ],
      cons: [
        "Requires configuring key user flow credentials for authenticated app monitoring",
        "High-frequency interactive monitoring requires an active paid subscription tier",
      ],
      alternatives: ["datadog", "sentry", "better-stack"],
    },
  },
  {
    slug: "hermes-agent",
    name: "Hermes Agent",
    tagline: "Open-source reasoning agent framework by Nous Research",
    description: "Hermes Agent is Nous Research's open-source agent framework powered by Hermes 3 models, built for autonomous tool use, multi-step planning, and local agent deployment.",
    websiteUrl: "https://hermes-agent.nousresearch.com/",
    githubUrl: "https://github.com/NousResearch/Hermes-Agent",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source agent environment by Nous Research; free to run on local or cloud GPUs.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-stone-700 to-neutral-950",
    tagsPipe: "agents|open-source|nous-research|hermes|reasoning",
    makerHandle: "@nous-research",
    editorial: {
      longDescription: "Hermes Agent is an open-source reasoning agent environment developed by Nous Research. Powered by the Hermes 3 model family, Hermes Agent is engineered specifically for advanced tool calling, structured JSON output, roleplaying, and complex multi-step task execution.\n\nIt provides developers with a transparent, highly steerable agent backbone that can be run completely offline using local open weights or connected to cloud inference providers.",
      useCases: [
        {
          title: "Autonomous local agent orchestration",
          body: "Run complex multi-step reasoning agents entirely on local hardware with zero data exfiltration.",
        },
        {
          title: "Custom tool and API function calling",
          body: "Equip Hermes Agent with custom Python tools, web search scrapers, and database connectors.",
        },
        {
          title: "Steerable synthetic persona and roleplay tasks",
          body: "Leverage Hermes's uninhibited steerability for complex synthetic data generation and simulation.",
        },
      ],
      pros: [
        "100% open-source framework built on the highly acclaimed Hermes 3 model series",
        "Exceptional tool-calling precision and multi-step reasoning steerability",
        "Supports fully offline local execution with Ollama, vLLM, or LM Studio",
      ],
      cons: [
        "Requires basic Python development experience to set up custom agent loops",
        "Performance on heavy visual tasks requires pairing with vision-capable backends",
      ],
      alternatives: ["openbot", "cue-agents", "manus"],
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
  console.log("Verifying all 20 tool logos in Convex...");
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
