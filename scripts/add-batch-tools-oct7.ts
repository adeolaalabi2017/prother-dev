/**
 * Script to add the 11 new tools to Convex directory:
 * 1. Hedwig (hedwig-ai.com)
 * 2. Lorca (lorca.app)
 * 3. Cezarie (cezar.run)
 * 4. Openmercato (openmercato.com)
 * 5. Maestro (maestro.dev)
 * 6. Kolibri (aleph-alpha.com)
 * 7. Noodle / Doodle (usenoodle.app)
 * 8. Maus Bot (mausbot.com)
 * 9. Ghost Core (ghost.ai)
 * 10. Reason 1.0 (reasonmachines.com)
 * 11. Hark Pro (hark.com)
 *
 * Adheres strictly to AGENTS.md guidelines:
 * - Authentic logo thumbnails committed to public/logos/<slug>.<ext>
 * - Zero em-dashes or en-dashes
 * - Convex is the single source of truth
 * - Verified via Convex queries
 */
import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import fs from "fs";
import path from "path";

const NOW = Date.now();

function checkInvariants(obj: any, pathStr = "") {
  if (typeof obj === "string") {
    if (obj.includes("\u2014") || obj.includes("\u2013")) {
      throw new Error(`Banned dash found at ${pathStr}: ${obj}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => checkInvariants(item, `${pathStr}[${i}]`));
  } else if (typeof obj === "object" && obj !== null) {
    Object.entries(obj).forEach(([k, v]) => checkInvariants(v, `${pathStr}.${k}`));
  }
}

interface ToolSeed {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  docsUrl?: string;
  categoryLegacyId: string;
  pricingModel: string;
  startingPrice: string;
  pricingNote: string;
  hasApi: boolean;
  logoEmoji: string;
  logoGradient: string;
  logoUrl: string;
  tagsPipe: string;
  makerHandle: string;
  status: string;
  editorsPick: boolean;
  curated: boolean;
  editorial: {
    longDescription: string;
    useCases: { title: string; body: string }[];
    pros: string[];
    cons: string[];
    alternatives: string[];
    pricingChecked: boolean;
  };
}

const TOOLS_TO_ADD: ToolSeed[] = [
  // 1. Hedwig
  {
    id: "cmucrh2hedwig0000000000001",
    slug: "hedwig",
    name: "Hedwig",
    tagline: "Canvas workspace integrating email, calendar, notes, and AI agents",
    description: "Hedwig is an agentic productivity workspace that combines an infinite spatial canvas with email, calendar, notes, and autonomous AI agents to manage daily workflow.",
    websiteUrl: "https://hedwig-ai.com",
    docsUrl: "https://hedwig-ai.com",
    categoryLegacyId: "cmucrh2nm0005kji8p4nuxs89", // Automation
    pricingModel: "freemium",
    startingPrice: "Free tier available",
    pricingNote: "Free plan includes spatial canvas, connected email, and basic AI assistant turns. Pro plan unlocks persistent background agents and team collaboration.",
    hasApi: true,
    logoEmoji: "🦉",
    logoGradient: "from-slate-700 to-zinc-900",
    logoUrl: "/logos/hedwig.png",
    tagsPipe: "productivity|canvas|workspace|email|calendar|ai-agents",
    makerHandle: "@hedwigai",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Hedwig reimagines personal and professional organization by uniting disconnected productivity silos onto a single dynamic canvas. Instead of jumping between an inbox, calendar client, and scratchpad, Hedwig surfaces threads, scheduling invites, and reference materials side by side. Autonomous agents operate directly on the canvas to draft replies, consolidate agenda notes, and coordinate follow-up items.",
      useCases: [
        {
          title: "Unified spatial task and agenda management",
          body: "Organize incoming email threads, calendar invites, and research notes visually across an infinite canvas.",
        },
        {
          title: "Context-aware email and message drafting",
          body: "Deploy autonomous agents that reference adjacent notes and calendar schedules to draft replies and summaries.",
        },
        {
          title: "Automated schedule coordination",
          body: "Let AI agents propose meeting slots and prep documents directly linked to calendar events.",
        },
      ],
      pros: [
        "Reduces context switching by uniting email, calendar, and note taking in one view",
        "Visual spatial canvas allows freeform organization of complex projects",
        "Context-aware agents can read adjacent canvas objects to draft responses",
      ],
      cons: [
        "Requires connecting primary email and calendar providers for full utility",
        "Spatial canvas paradigm requires an initial learning curve compared to standard lists",
      ],
      alternatives: ["linear", "notra", "chatbase"],
      pricingChecked: true,
    },
  },

  // 2. Lorca
  {
    id: "cmucrh2lorca00000000000001",
    slug: "lorca",
    name: "Lorca",
    tagline: "AI teammates that run locally on your computer with multi-agent coordination",
    description: "Lorca is a local-first desktop application that runs AI teammates on your computer. Chat with individual agents or group chats, allow them to edit files and run commands, and pair with mobile devices via encrypted relays.",
    websiteUrl: "https://lorca.app",
    docsUrl: "https://lorca.app/docs",
    categoryLegacyId: "cmucrh2nj0000kji8o4lndfc1", // Conversational AI
    pricingModel: "free",
    startingPrice: "Free",
    pricingNote: "Completely free application. Bring your own AI provider keys (ChatGPT, Grok, DeepSeek, or local models). End-to-end encrypted device relay included.",
    hasApi: true,
    logoEmoji: "💻",
    logoGradient: "from-violet-600 to-cyan-500",
    logoUrl: "/logos/lorca.png",
    tagsPipe: "local-first|multi-agent|desktop-app|group-chat|privacy|e2ee",
    makerHandle: "@egoist",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Built by egoist, Lorca delivers a privacy-first multi-agent operating environment for macOS, Windows, and Linux. Users configure specialized AI teammates (starting with Chef, who assists in creating customized team members) that collaborate in unified group chats. Each agent takes turns responding based on task relevancy, reads and edits local files within designated folders, executes shell commands with explicit consent, and synchronizes across paired desktop and mobile clients via end-to-end encrypted relays.",
      useCases: [
        {
          title: "Collaborative local multi-agent teams",
          body: "Coordinate specialized bot teammates (such as developers, researchers, and project managers) in a shared group chat.",
        },
        {
          title: "Safe local file and terminal execution",
          body: "Assign tasks to bots constrained to specific folders on your computer with full terminal audit logs.",
        },
        {
          title: "Encrypted cross-device continuity",
          body: "Pair mobile devices to desktop runners through an end-to-end encrypted relay without central data storage.",
        },
      ],
      pros: [
        "Runs entirely on your machine without third-party cloud data persistence",
        "True multi-agent group chats with turn-taking and bot-to-bot handoffs",
        "End-to-end encrypted sync between desktop runners and mobile companions",
        "Cross-platform support across macOS, Windows, Linux, and iOS",
      ],
      cons: [
        "Requires bringing your own API keys or running local LLM inference engines",
        "Requires runner machines to remain awake for remote mobile pairing",
      ],
      alternatives: ["open-webui", "cursor", "aider"],
      pricingChecked: true,
    },
  },

  // 3. Cezarie
  {
    id: "cmucrh2cezarie000000000001",
    slug: "cezarie",
    name: "Cezarie",
    tagline: "Open-source orchestrator for Claude Code and coding agents 24/7",
    description: "Cezarie is an open-source autonomous agent supervisor that manages Claude Code, Codex, and coding assistants around the clock, providing structured supervision, issue queueing, and test-verified pull requests.",
    websiteUrl: "https://cezar.run",
    docsUrl: "https://github.com/cezar-run",
    categoryLegacyId: "cmucrh2nn0006kji83fbwfgnw", // Dev Platforms
    pricingModel: "open_source",
    startingPrice: "Free / Open Source",
    pricingNote: "Permissive open-source project. Self-hostable on any local machine, VPS, or cloud cluster using your own LLM provider credentials.",
    hasApi: true,
    logoEmoji: "⚙️",
    logoGradient: "from-rose-600 to-pink-500",
    logoUrl: "/logos/cezarie.svg",
    tagsPipe: "claude-code|agent-orchestration|coding-agents|developer-tools|automation",
    makerHandle: "@cezarrun",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Cezarie acts as an always-on supervisor for autonomous developer agents. While CLI coding harnesses like Claude Code excel at interactive single-session modifications, running them asynchronously against large backlogs requires careful bounds, test validation, retry budgets, and git isolation. Cezarie manages work queues, executes automated test suites, verifies diff integrity, and packages verified changes into clean GitHub pull requests without developer intervention.",
      useCases: [
        {
          title: "Continuous background issue remediation",
          body: "Assign GitHub issues or bug reports to autonomous Claude Code runners operating in isolated worktrees.",
        },
        {
          title: "Nightly test repair and dependency upgrades",
          body: "Schedule batch refactoring, test fixes, and dependency security patches overnight.",
        },
        {
          title: "Multi-agent code generation pipelines",
          body: "Chain specialized agents to generate implementations, audit for vulnerabilities, and run linting.",
        },
      ],
      pros: [
        "Provides continuous 24/7 unattended operation for CLI coding agents",
        "Isolates modifications in dedicated git branches with automated rollback",
        "Completely open source and self-hostable with no vendor lock-in",
      ],
      cons: [
        "Requires configuring test runners and clear issue acceptance criteria",
        "Can generate significant API token consumption if run against large backlogs",
      ],
      alternatives: ["aider", "openchamber", "devin"],
      pricingChecked: true,
    },
  },

  // 4. Openmercato
  {
    id: "cmucrh2mercato000000000001",
    slug: "openmercato",
    name: "Openmercato",
    tagline: "Modular open-source ERP and CRM framework with native MCP integration",
    description: "Openmercato is an open-source, modular enterprise platform uniting CRM, ERP, and supply chain operations with Model Context Protocol (MCP) support for AI agents.",
    websiteUrl: "https://openmercato.com",
    docsUrl: "https://github.com/openmercato",
    categoryLegacyId: "cmucrh2nm0005kji8p4nuxs89", // Automation
    pricingModel: "open_source",
    startingPrice: "Free / Open Source (MIT)",
    pricingNote: "Permissive open-source MIT license. Fully self-hostable without license fees. Optional enterprise hosting and support available.",
    hasApi: true,
    logoEmoji: "📦",
    logoGradient: "from-blue-600 to-indigo-800",
    logoUrl: "/logos/openmercato.png",
    tagsPipe: "erp|crm|open-source|mcp|business-automation|modular",
    makerHandle: "@openmercato",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Openmercato modernizes enterprise resource planning and customer relationship management with an API-first, modular architecture built for the agentic era. By exposing business entities, transactional workflows, and inventory tracking through standardized Model Context Protocol (MCP) servers, Openmercato enables AI agents to query orders, update customer records, process refunds, and balance inventory deterministically.",
      useCases: [
        {
          title: "Agent-driven customer support and order management",
          body: "Empower support bots to lookup order statuses, initiate replacements, and modify account records via MCP.",
        },
        {
          title: "Automated inventory and supply chain tracking",
          body: "Connect enterprise forecasting models directly to live warehouse levels and procurement schedules.",
        },
        {
          title: "Self-hosted ERP and CRM data sovereignty",
          body: "Deploy a complete modular business backoffice on private infrastructure under the MIT license.",
        },
      ],
      pros: [
        "Permissive MIT open-source license allows full customization and white-labeling",
        "Native MCP endpoints make business data accessible to LLMs and agents safely",
        "Modular architecture allows adopting CRM, billing, or inventory incrementally",
      ],
      cons: [
        "Enterprise ERP migrations require substantial data mapping and operational planning",
        "Ecosystem of third-party plugins is still growing compared to legacy platforms",
      ],
      alternatives: ["n8n", "plane", "linear"],
      pricingChecked: true,
    },
  },

  // 5. Maestro
  {
    id: "cmucrh2maestro000000000001",
    slug: "maestro",
    name: "Maestro",
    tagline: "Agentic UI testing and deterministic E2E automation for mobile and web",
    description: "Maestro is a modern UI automation and testing framework for iOS, Android, and web apps, enabling declarative YAML flows and AI agent-driven test generation.",
    websiteUrl: "https://maestro.dev",
    docsUrl: "https://maestro.dev/docs",
    categoryLegacyId: "cmucrh2nn0006kji83fbwfgnw", // Dev Platforms
    pricingModel: "open_source",
    startingPrice: "Free / Open Source CLI",
    pricingNote: "Open-source CLI and Maestro Studio are free forever. Maestro Cloud provides parallel cloud device test execution on paid subscription tiers.",
    hasApi: true,
    logoEmoji: "🎯",
    logoGradient: "from-emerald-500 to-green-700",
    logoUrl: "/logos/maestro.svg",
    tagsPipe: "testing|mobile|e2e|automation|developer-tools|agentic-qa",
    makerHandle: "@mobile__dev",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Built by mobile.dev, Maestro simplifies mobile and web UI testing by replacing flaky WebDriver scripts with declarative, highly resilient test definitions. With built-in tolerance for animations, network latency, and UI shifts, Maestro runs deterministically across real devices and emulators. Its Studio tool and agentic integrations enable software engineers and AI coding assistants to automatically generate, validate, and maintain End-to-End test suites.",
      useCases: [
        {
          title: "Deterministic mobile app E2E regression testing",
          body: "Author resilient UI test flows for iOS and Android apps with declarative YAML syntax.",
        },
        {
          title: "Interactive test authoring with Maestro Studio",
          body: "Inspect live device view hierarchies and generate robust test assertions interactively.",
        },
        {
          title: "Autonomous QA generation via coding assistants",
          body: "Equip coding assistants to write and execute UI test flows that verify feature pull requests.",
        },
      ],
      pros: [
        "Extremely fast test execution with built-in flakiness mitigation",
        "Simple declarative syntax is easy for humans and AI agents to author and maintain",
        "Maestro Studio provides visual device inspection in the browser",
        "Free and open source for local development and CI runs",
      ],
      cons: [
        "Cloud parallel test farm on physical devices requires a paid Maestro Cloud plan",
        "Deeply customized native gestures may require specialized configuration",
      ],
      alternatives: ["openchamber", "aider", "cursor"],
      pricingChecked: true,
    },
  },

  // 6. Kolibri
  {
    id: "cmucrh2kolibri000000000001",
    slug: "kolibri",
    name: "Kolibri",
    tagline: "European sovereign 78B Mixture of Experts open foundation model",
    description: "Kolibri is an open 78B parameter Mixture of Experts foundation model developed by Aleph Alpha, designed for sovereign enterprise deployment, European data compliance, and deep contextual reasoning.",
    websiteUrl: "https://aleph-alpha.com",
    docsUrl: "https://docs.aleph-alpha.com",
    categoryLegacyId: "cmucrh2nz0007kji8aimodels0", // AI Models
    pricingModel: "open_source",
    startingPrice: "Open Weights (Apache 2.0)",
    pricingNote: "Model weights released under permissive open licenses for self-hosting. Hosted API inference available through Aleph Alpha enterprise cloud.",
    hasApi: true,
    logoEmoji: "🦅",
    logoGradient: "from-blue-700 to-indigo-900",
    logoUrl: "/logos/kolibri.png",
    tagsPipe: "foundation-model|moe|open-weights|sovereign-ai|enterprise-llm",
    makerHandle: "@Aleph__Alpha",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Developed by Aleph Alpha, Kolibri represents a milestone in European sovereign AI infrastructure. Built on a sparse 78B Mixture of Experts (MoE) architecture, Kolibri activates a subset of parameters per token to achieve frontier-level reasoning and multilingual fluency while retaining manageable inference compute requirements. The model is specifically tuned for transparent fact tracing, rigorous data privacy compliance, and on-premises deployment in regulated industries.",
      useCases: [
        {
          title: "Regulated enterprise and public sector NLP",
          body: "Deploy sovereign language models on private European infrastructure complying with strict data standards.",
        },
        {
          title: "High-efficiency sparse MoE inference",
          body: "Achieve 78B model intelligence at the inference speed and memory footprint of much smaller models.",
        },
        {
          title: "Transparent citation and factual auditing",
          body: "Leverage Aleph Alpha fact-tracing explainability features to verify AI outputs.",
        },
      ],
      pros: [
        "Open weights allow complete data sovereignty and local on-prem deployment",
        "MoE sparse architecture balances high reasoning capacity with efficient inference",
        "Optimized for multilingual European languages and regulatory standards",
      ],
      cons: [
        "Self-hosting 78B parameters requires multi-GPU enterprise hardware (e.g. 2-4x A100/H100)",
        "Ecosystem tooling is smaller compared to mainstream American open weight models",
      ],
      alternatives: ["deepseek", "vllm", "haiku-5-5"],
      pricingChecked: true,
    },
  },

  // 7. Noodle
  {
    id: "cmucrh2noodle0000000000001",
    slug: "noodle",
    name: "Noodle",
    tagline: "Desktop AI agent collaboration app with browser and local workflow automation",
    description: "Noodle is an open-source desktop collaboration workspace for AI agent teams. Organize multi-agent workflows, grant local app and browser automation capabilities, and coordinate team operations.",
    websiteUrl: "https://usenoodle.app",
    docsUrl: "https://github.com/usenoodle",
    categoryLegacyId: "cmucrh2nj0000kji8o4lndfc1", // Conversational AI
    pricingModel: "free",
    startingPrice: "Free / Open Source",
    pricingNote: "Free desktop application. Bring your own AI provider keys or run against local inference engines without platform charges.",
    hasApi: true,
    logoEmoji: "🍜",
    logoGradient: "from-amber-600 to-orange-800",
    logoUrl: "/logos/noodle.png",
    tagsPipe: "agent-teams|desktop-app|browser-automation|local-ai|collaboration",
    makerHandle: "@usenoodle",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Noodle provides a dedicated desktop environment for coordinating autonomous agent teams. Designed for users who want agents to interact with both the local computer and the web, Noodle bundles browser control, filesystem operations, and agent-to-agent communication into a streamlined interface. Team members can assign tasks to specialized bots, observe real-time execution steps, and collaborate across complex research and operational pipelines.",
      useCases: [
        {
          title: "Agentic web research and automated browsing",
          body: "Direct agents to navigate web applications, extract structured data, and summarize findings.",
        },
        {
          title: "Multi-agent task decomposition",
          body: "Assign broad operational objectives to an agent team that divides tasks and reports status.",
        },
        {
          title: "Local application control and file processing",
          body: "Allow agents to inspect files, run local commands, and compile documentation on your desktop.",
        },
      ],
      pros: [
        "Intuitive desktop workspace designed specifically for multi-agent workflows",
        "Built-in browser automation capabilities alongside local file tools",
        "Free to use with direct API key integration",
      ],
      cons: [
        "Browser automation requires monitoring to ensure agents stay on task",
        "Requires bringing your own API keys for proprietary LLM providers",
      ],
      alternatives: ["lorca", "open-webui", "maus-bot"],
      pricingChecked: true,
    },
  },

  // 8. Maus Bot
  {
    id: "cmucrh2mausbot000000000001",
    slug: "maus-bot",
    name: "Maus Bot",
    tagline: "Open-source desktop workspace for local multi-agent teams and MCP servers",
    description: "Maus Bot is an open-source desktop chat environment engineered for local multi-agent teams. Connect local LLMs, configure Model Context Protocol (MCP) servers, and orchestrate privacy-first agent collaboration.",
    websiteUrl: "https://mausbot.com",
    docsUrl: "https://github.com/mausbot",
    categoryLegacyId: "cmucrh2nj0000kji8o4lndfc1", // Conversational AI
    pricingModel: "open_source",
    startingPrice: "Free / Open Source (MIT)",
    pricingNote: "Permissive MIT open-source license. Run locally on macOS, Windows, or Linux with zero subscription or telemetry fees.",
    hasApi: true,
    logoEmoji: "🐭",
    logoGradient: "from-emerald-600 to-teal-800",
    logoUrl: "/logos/maus-bot.svg",
    tagsPipe: "multi-agent|desktop-chat|mcp|open-source|local-llm|privacy",
    makerHandle: "@mausbot",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Maus Bot is a desktop chat client crafted for engineers and power users who demand total control over their AI toolchain. With native support for the Model Context Protocol (MCP), Maus Bot connects directly to databases, codebases, and development tools while running against local models (Ollama, LM Studio) or cloud providers. Its clean interface facilitates multi-agent conversation, custom agent personas, and strict prompt sandboxing.",
      useCases: [
        {
          title: "Privacy-preserving local code and document chat",
          body: "Chat with local models running on Ollama or vLLM without transmitting prompts to the cloud.",
        },
        {
          title: "Tool-augmented agent execution via MCP",
          body: "Connect desktop agents to filesystem, git, and custom MCP tool servers for live execution.",
        },
        {
          title: "Multi-agent brainstorming and review",
          body: "Create custom personas that review documents, debate architectural proposals, and refine copy.",
        },
      ],
      pros: [
        "Open source under MIT license with complete privacy and zero data tracking",
        "First-class Model Context Protocol (MCP) server integration",
        "Native support for local inference backends like Ollama and LM Studio",
      ],
      cons: [
        "Setting up custom MCP servers requires developer familiarity with CLI tools",
        "Local model performance depends heavily on host GPU and VRAM hardware",
      ],
      alternatives: ["open-webui", "lorca", "lm-studio"],
      pricingChecked: true,
    },
  },

  // 9. Ghost Core
  {
    id: "cmucrh2ghostcore0000000001",
    slug: "ghost-core",
    name: "Ghost Core",
    tagline: "Personal AI computer hardware running local foundation models on device",
    description: "Ghost Core is a dedicated personal AI computer engineered to run frontier-scale models completely locally on dedicated hardware with zero cloud subscriptions.",
    websiteUrl: "https://ghost.ai",
    docsUrl: "https://ghost.ai",
    categoryLegacyId: "cmucrh2nn0006kji83fbwfgnw", // Dev Platforms
    pricingModel: "paid",
    startingPrice: "$3,499 one-time purchase",
    pricingNote: "Single hardware purchase price. Zero monthly subscriptions or token billing fees. Runs local foundation models continuously on private silicon.",
    hasApi: true,
    logoEmoji: "👻",
    logoGradient: "from-sky-500 to-blue-900",
    logoUrl: "/logos/ghost-core.png",
    tagsPipe: "hardware|edge-ai|local-inference|privacy|personal-computer|ai-silicon",
    makerHandle: "@ghostai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Ghost Core represents a new paradigm in personal computing: a dedicated hardware appliance purpose-built to run advanced AI models on premise. Instead of renting cloud GPU clusters or paying recurring monthly subscription fees to third-party providers, Ghost Core houses unified high-bandwidth memory and custom acceleration to run foundation models, local agent loops, and personal data indexing entirely within your home or office network.",
      useCases: [
        {
          title: "Dedicated on-premise local model inference",
          body: "Run continuous agent loops and LLM workloads without cloud latency, downtime, or token meter costs.",
        },
        {
          title: "Complete privacy and data sovereignty",
          body: "Keep confidential source code, legal records, and personal communications strictly on device.",
        },
        {
          title: "Always-on home and office intelligence hub",
          body: "Serve local MCP endpoints and assistant interfaces across all devices on your local network.",
        },
      ],
      pros: [
        "Zero recurring subscription or token billing fees for the lifetime of the hardware",
        "Absolute privacy with all inference executing locally on device silicon",
        "High-bandwidth unified memory designed specifically for large model parameters",
      ],
      cons: [
        "High upfront capital expenditure ($3,499 purchase price)",
        "Hardware capabilities are fixed to the physical silicon without cloud auto-scaling",
      ],
      alternatives: ["vllm", "open-webui", "antigravity"],
      pricingChecked: true,
    },
  },

  // 10. Reason 1.0
  {
    id: "cmucrh2reason1000000000001",
    slug: "reason-1-0",
    name: "Reason 1.0",
    tagline: "Autonomous AI software engineer and cloud coding agent for GitHub",
    description: "Reason 1.0 is an autonomous software engineer and cloud coding agent. Connect your repository, assign GitHub issues, and receive evidence-backed pull requests with recordings, logs, and tested diffs.",
    websiteUrl: "https://reasonmachines.com",
    docsUrl: "https://docs.reasonmachines.com",
    categoryLegacyId: "cmucrh2nn0006kji83fbwfgnw", // Dev Platforms
    pricingModel: "paid",
    startingPrice: "Usage-based / Team plans",
    pricingNote: "Cloud agent sessions billed on compute usage. Includes $1,000 YC founder credits. Claude Code and Codex MCP plugins available for seamless developer access.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-amber-500 to-stone-900",
    logoUrl: "/logos/reason-1-0.png",
    tagsPipe: "autonomous-engineer|coding-agent|github|mcp|swe-bench|cloud-agent",
    makerHandle: "@reasonmachines",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Developed by Reason Machines, Reason 1.0 is an autonomous cloud coding agent engineered to resolve real-world software engineering issues. Reason connects directly to GitHub repositories, spins up isolated sandbox computers, runs test fixtures, diagnoses root causes, and produces complete pull requests accompanied by screencasts, terminal logs, and execution evidence. With first-class MCP support and top-tier benchmark results on DeepSWE v1.1, Reason solves issues with up to 39% lower median time than competing baselines.",
      useCases: [
        {
          title: "Autonomous GitHub issue triage and resolution",
          body: "Assign bug reports and feature requests directly on GitHub and receive review-ready pull requests with proof.",
        },
        {
          title: "Complex codebase refactoring and migrations",
          body: "Execute structural refactoring across legacy services (such as C++ to Rust migrations) with parity verification.",
        },
        {
          title: "CODEX and Claude Code MCP orchestration",
          body: "Connect your favorite developer harness to Reason cloud execution environments via official MCP plugins.",
        },
      ],
      pros: [
        "Every pull request includes screen recordings and terminal logs proving changes work",
        "Top-tier DeepSWE benchmark performance with 39% faster median solving time",
        "Official publisher-owned MCP plugins for Claude Code and OpenAI Codex",
        "Full repository sandbox isolation with reproducible test verification",
      ],
      cons: [
        "Commercial service requiring account configuration and usage credits",
        "Complex multi-repo enterprise setups require configuring workspace permissions",
      ],
      alternatives: ["devin", "aider", "openchamber"],
      pricingChecked: true,
    },
  },

  // 11. Hark Pro
  {
    id: "cmucrh2harkpro000000000001",
    slug: "hark-pro",
    name: "Hark Pro",
    tagline: "Personal intelligence assistant for voice, travel planning, and automated tasks",
    description: "Hark Pro is an advanced personal intelligence system that handles real-world requests: booking trips, comparing insurance, ordering meals, and managing appointments.",
    websiteUrl: "https://hark.com",
    docsUrl: "https://hark.com",
    categoryLegacyId: "cmucrh2nj0000kji8o4lndfc1", // Conversational AI
    pricingModel: "freemium",
    startingPrice: "Free tier with Pro subscription",
    pricingNote: "Free tier available on web, iOS, and Android. Hark Pro subscription unlocks priority personal intelligence task fulfillment and multi-modal voice processing.",
    hasApi: false,
    logoEmoji: "✨",
    logoGradient: "from-slate-800 to-indigo-950",
    logoUrl: "/logos/hark-pro.png",
    tagsPipe: "personal-assistant|voice-ai|travel-booking|lifestyle|task-automation",
    makerHandle: "@hark",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Hark Pro represents a leap forward in consumer-facing personal intelligence. Rather than functioning simply as a conversational text generator, Hark is designed to take autonomous action across daily life: finding the cheapest flights and booking hotels, researching and switching insurance policies, scheduling medical appointments that match insurance networks, and ordering from favorite restaurants. Featuring dynamic celestial sky visualizations and native iOS and Android apps, Hark brings agentic task fulfillment to everyday users.",
      useCases: [
        {
          title: "Autonomous travel and itinerary booking",
          body: "Ask Hark to book entire weekend itineraries, locating budget flights and boutique hotels.",
        },
        {
          title: "Healthcare and insurance comparison",
          body: "Locate in-network medical specialists and evaluate equivalent insurance policies automatically.",
        },
        {
          title: "Everyday errand and order fulfillment",
          body: "Order meals from favorite neighborhood restaurants and coordinate recurring personal errands.",
        },
      ],
      pros: [
        "True action-taking personal assistant that executes real-world transactions",
        "Beautiful native mobile applications for iOS and Android with dynamic ambient UI",
        "Handles tedious consumer research like insurance quotes and doctor appointments",
      ],
      cons: [
        "Third-party bookings require payment authorizations and service access",
        "Currently focused on consumer personal tasks rather than developer APIs",
      ],
      alternatives: ["chatgpt", "perplexity", "gemini"],
      pricingChecked: true,
    },
  },
];

async function main() {
  console.log("=== Validating Invariants ===");
  TOOLS_TO_ADD.forEach((tool) => {
    checkInvariants(tool, `tool:${tool.slug}`);

    // Verify logo file existence on disk
    const relativeLogo = tool.logoUrl.replace(/^\//, "");
    const diskPath = path.join(process.cwd(), "public", relativeLogo);
    if (!fs.existsSync(diskPath)) {
      throw new Error(`Logo file missing on disk for ${tool.slug}: ${diskPath}`);
    }
    console.log(`✓ Verified logo exists: ${tool.logoUrl} (${fs.statSync(diskPath).size} bytes)`);
  });
  console.log("✓ All invariants verified! Zero em-dashes / en-dashes, all local logos verified.\n");

  const convex = createServerConvexClient();
  if (!convex) {
    throw new Error("Convex client could not be initialized");
  }

  for (const tool of TOOLS_TO_ADD) {
    console.log(`\n--- Processing ${tool.name} (${tool.slug}) ---`);

    // Check if tool already exists in Convex
    const existing = await convex.query(api.tools.pageData, { slug: tool.slug });

    if (!("error" in existing) && existing.tool) {
      console.log(`Tool ${tool.slug} already exists in Convex (ID: ${existing.tool.id}). Patching...`);
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: existing.tool.id,
        logoUrl: tool.logoUrl,
        data: {
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          websiteUrl: tool.websiteUrl,
          docsUrl: tool.docsUrl,
          categoryLegacyId: tool.categoryLegacyId,
          pricingModel: tool.pricingModel,
          startingPrice: tool.startingPrice,
          pricingNote: tool.pricingNote,
          hasApi: tool.hasApi,
          logoEmoji: tool.logoEmoji,
          logoGradient: tool.logoGradient,
          tagsPipe: tool.tagsPipe,
          makerHandle: tool.makerHandle,
          status: tool.status,
          editorsPick: tool.editorsPick,
          curated: tool.curated,
        },
        editorial: tool.editorial,
        nowMs: NOW,
      });
      console.log(`✓ Successfully patched ${tool.name}`);
    } else {
      console.log(`Creating tool ${tool.name} in Convex...`);
      const res = await convex.mutation(api.adminCrud.toolCreate, {
        id: tool.id,
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
        logoUrl: tool.logoUrl,
        tagsPipe: tool.tagsPipe,
        makerHandle: tool.makerHandle,
        status: tool.status,
        editorsPick: tool.editorsPick,
        curated: tool.curated,
        createdAt: NOW,
        editorial: tool.editorial,
      });
      console.log(`✓ Successfully created ${tool.name} (ID: ${res.id})`);

      if (tool.docsUrl) {
        await convex.mutation(api.adminCrud.toolPatch, {
          toolLegacyId: res.id,
          data: { docsUrl: tool.docsUrl },
          nowMs: NOW,
        });
      }
    }
  }

  // ── Verification Step ──
  console.log("\n=== Verifying All 11 Tools in Convex ===");
  for (const tool of TOOLS_TO_ADD) {
    const verified = await convex.query(api.tools.pageData, { slug: tool.slug });
    if ("error" in verified) {
      throw new Error(`Verification failed for ${tool.slug}: ${verified.error}`);
    }
    console.log(`✓ Verified ${verified.tool.name} [${verified.tool.slug}]:`);
    console.log(`    Pricing: ${verified.tool.pricingModel}`);
    console.log(`    Category: ${verified.tool.category.name}`);
    console.log(`    Logo: ${verified.logoUrl}`);
    console.log(`    Tagline: ${verified.tool.tagline}`);
  }

  console.log("\n🎉 All 11 tools have been seeded and verified successfully in Convex!");
}

main().catch((err) => {
  console.error("Batch seed failed:", err);
  process.exit(1);
});
