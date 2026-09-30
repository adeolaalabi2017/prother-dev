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
};

interface ToolSpec {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  categoryLegacyId: string;
  pricingModel: "free" | "freemium" | "paid" | "open_source";
  startingPrice: string;
  pricingNote: string;
  hasApi: boolean;
  logoEmoji: string;
  logoGradient: string;
  tagsPipe: string;
  makerHandle: string;
  editorial: {
    longDescription: string;
    useCases: Array<{ title: string; body: string }>;
    pros: string[];
    cons: string[];
    alternatives: string[];
  };
}

const batch3Tools: ToolSpec[] = [
  {
    slug: "vorflux",
    name: "Vorflux",
    tagline: "High-performance AI agent execution and GPU compute orchestrator",
    description: "Vorflux provides scalable GPU infrastructure and agent execution environments for running complex autonomous AI workloads with minimal latency.",
    websiteUrl: "https://vorflux.com/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier with GPU compute quotas",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-sky-500 to-indigo-600",
    tagsPipe: "gpu|infra|agent-execution|orchestration|compute",
    makerHandle: "@vorflux",
    editorial: {
      longDescription: "Vorflux is a developer infrastructure platform built for running autonomous AI agents and compute-intensive workloads at scale. It abstracts server management, offering instant GPU provisioning, low-latency agent sandboxes, and reliable background task scheduling.\n\nWhether running agentic web crawlers or fine-tuning models on demand, Vorflux gives engineering teams low-overhead containerized execution with complete observability.",
      useCases: [
        {
          title: "Scalable agent task sandboxing",
          body: "Spin up isolated GPU containers on demand for executing autonomous coding or scraping agents."
        },
        {
          title: "Parallel inference & batch processing",
          body: "Distribute heavy AI workloads across high-performance GPUs without managing Kubernetes clusters."
        }
      ],
      pros: [
        "Instant container spin-up for autonomous agent runs",
        "Cost-effective GPU compute with transparent pay-per-second billing",
        "Built-in monitoring and error tracing for long-running agents"
      ],
      cons: [
        "Requires container experience for custom image setups",
        "Higher tiers require enterprise quota approvals"
      ],
      alternatives: ["replicate", "modal", "vllm"]
    }
  },
  {
    slug: "warp",
    name: "Warp",
    tagline: "The intelligent Rust-based terminal with built-in agentic AI completion",
    description: "Warp re-imagines the command line with block-based navigation, collaborative notebooks, and embedded AI command generation.",
    websiteUrl: "https://www.warp.dev/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier available for individual developers",
    hasApi: true,
    logoEmoji: "🚀",
    logoGradient: "from-emerald-500 to-teal-600",
    tagsPipe: "terminal|cli|ai-completion|rust|developer-tools",
    makerHandle: "@warpdotdev",
    editorial: {
      longDescription: "Warp is a modern, ultra-fast terminal built from the ground up in Rust with GPU hardware acceleration. It replaces traditional character-by-character output with discrete blocks, allowing developers to select, copy, and bookmark shell output effortlessly.\n\nIts integrated Warp AI assistant converts natural language directly into accurate shell commands, explains complex error outputs, and automates multi-step terminal operations.",
      useCases: [
        {
          title: "Natural language command execution",
          body: "Type plain English prompts to instantly generate git, docker, or regex commands in terminal."
        },
        {
          title: "Collaborative terminal notebooks",
          body: "Save reusable command workflows and share interactive terminal sessions across team members."
        }
      ],
      pros: [
        "Blazing-fast Rust engine with hardware acceleration",
        "Block-level output selection and AI error diagnosis",
        "Seamless team sharing of workflows and environment variables"
      ],
      cons: [
        "Requires login account for cloud synchronization features",
        "Some traditional terminal plugins require custom keybindings"
      ],
      alternatives: ["command-code", "zed", "oh-my-pi"]
    }
  },
  {
    slug: "hedr",
    name: "Hedr",
    tagline: "Multi-agent swarm coordination and workflow management platform",
    description: "Hedr empowers engineering teams to orchestrate, monitor, and connect multiple specialized AI agents into cohesive production pipelines.",
    websiteUrl: "https://herdr.dev/",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for personal agent swarms",
    hasApi: true,
    logoEmoji: "🐝",
    logoGradient: "from-amber-500 to-orange-600",
    tagsPipe: "swarms|orchestration|multi-agent|workflows|automation",
    makerHandle: "@herdr_dev",
    editorial: {
      longDescription: "Hedr provides a control plane for multi-agent systems, letting developers define roles, handoffs, and feedback loops across autonomous agent swarms. It eliminates communication bottlenecks by standardizing agent state passing and tool calls.\n\nWith real-time trajectory visualization, Hedr makes it straightforward to debug complex agent interactions, monitor token budgets, and prevent execution loops.",
      useCases: [
        {
          title: "Multi-agent software engineering",
          body: "Chain researcher, coder, and code-reviewer agents together for automated feature implementation."
        },
        {
          title: "Autonomous operations & monitoring",
          body: "Deploy swarms of monitoring agents that inspect application state and execute recovery scripts."
        }
      ],
      pros: [
        "Visual DAG map of live agent handoffs and communications",
        "Built-in state persistence and retry controls",
        "Granular cost and token management per agent node"
      ],
      cons: [
        "Setup overhead for simple single-agent use cases",
        "Requires clear role contracts for multi-agent swarms"
      ],
      alternatives: ["langchain", "cue-agents", "hermes-agent"]
    }
  },
  {
    slug: "conductor",
    name: "Conductor",
    tagline: "Desktop workspace manager for parallel AI agent workflows and git branches",
    description: "Conductor enables developers to manage multiple simultaneous AI coding sessions, git branches, and context switches without context loss.",
    websiteUrl: "https://www.conductor.build/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier with local git workspace limits",
    hasApi: true,
    logoEmoji: "🎛️",
    logoGradient: "from-violet-500 to-purple-600",
    tagsPipe: "desktop|workspaces|git|parallel-agents|context-management",
    makerHandle: "@conductor_build",
    editorial: {
      longDescription: "Conductor is a native desktop application designed for high-velocity software engineers working with AI agents. It isolates workspace environments, git worktrees, and running agent sessions so developers can run 5 to 10 feature tasks concurrently.\n\nBy managing branch isolation and diff previews natively, Conductor ensures AI-generated code edits never pollute main development branches before review.",
      useCases: [
        {
          title: "Parallel feature implementation",
          body: "Launch separate AI coding agents across isolated git branches simultaneously."
        },
        {
          title: "Clean context switching",
          body: "Switch between client projects and pull requests without tearing down active terminal sessions."
        }
      ],
      pros: [
        "Seamless git worktree integration for zero-conflict branching",
        "Fast visual diff previews of agent-written code",
        "Low memory footprint compared to running multiple IDE windows"
      ],
      cons: [
        "Requires local git workflow knowledge",
        "Currently tailored primarily for macOS and Linux"
      ],
      alternatives: ["superset", "zed", "cursor"]
    }
  },
  {
    slug: "superset",
    name: "Superset",
    tagline: "Multi-agent workspace IDE for parallel coding and instant AI reviews",
    description: "Superset provides a cloud workspace IDE where multiple AI coding agents work alongside developers on codebases in real time.",
    websiteUrl: "https://superset.sh/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier with monthly cloud compute hours",
    hasApi: true,
    logoEmoji: "💻",
    logoGradient: "from-blue-600 to-indigo-700",
    tagsPipe: "workspace|multi-agent|ide|cloud|coding",
    makerHandle: "@superset_sh",
    editorial: {
      longDescription: "Superset is a cloud-based development environment built around parallel AI agent collaboration. Instead of waiting for a single AI prompt to finish, developers spawn multiple specialized agents to write tests, implement endpoints, and update docs concurrently.\n\nFeaturing instant browser previews and automated static analysis, Superset verifies agent changes in real time before merging.",
      useCases: [
        {
          title: "Concurrent full-stack refactoring",
          body: "Assign one agent to update database schemas while another updates API endpoints and React components."
        },
        {
          title: "Automated PR review & test generation",
          body: "Generate unit tests and regression suites automatically as code is authored."
        }
      ],
      pros: [
        "Zero setup cloud containers with instant dev environments",
        "Parallel multi-agent execution in a unified interface",
        "Integrated live previews for web applications"
      ],
      cons: [
        "Requires internet connection for cloud container sessions",
        "Credit-based pricing for high GPU/CPU usage"
      ],
      alternatives: ["conductor", "cursor", "replicate"]
    }
  },
  {
    slug: "oh-my-pi",
    name: "Oh My Pi",
    tagline: "Open-source terminal AI assistant framework and CLI power tool",
    description: "Oh My Pi (omp) brings extensible agentic CLI capabilities to zsh and bash, enabling natural language shell navigation and script automation.",
    websiteUrl: "https://omp.sh/",
    githubUrl: "https://github.com/omp-sh/omp",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "100% open source framework",
    hasApi: true,
    logoEmoji: "🥧",
    logoGradient: "from-pink-500 to-rose-600",
    tagsPipe: "cli|terminal|zsh|bash|open-source|automation",
    makerHandle: "@ompsh",
    editorial: {
      longDescription: "Oh My Pi (omp) is an open-source terminal framework that supercharges unix shells with intelligent AI assistance. Built with customizability in mind, omp integrates directly into zsh, bash, and fish configurations to provide inline command suggestions and log analysis.\n\nDevelopers can write custom plugins and aliases to connect omp with local LLMs or cloud providers seamlessly.",
      useCases: [
        {
          title: "Instant terminal error analysis",
          body: "Pipe failing command outputs directly into omp for step-by-step resolution advice."
        },
        {
          title: "Automated bash script generation",
          body: "Create complex shell scripts and one-liners using natural language prompts."
        }
      ],
      pros: [
        "100% open source and privacy conscious",
        "Supports local offline LLMs via Ollama or vLLM",
        "Zero footprint extension for existing terminal shells"
      ],
      cons: [
        "Requires basic terminal configuration setup",
        "Community plugin ecosystem is rapidly evolving"
      ],
      alternatives: ["warp", "command-code", "aider"]
    }
  },
  {
    slug: "aside",
    name: "Aside",
    tagline: "Contextual AI research overlay and intelligent knowledge companion",
    description: "Aside delivers instant, ambient contextual answers and codebase intelligence overlay directly inside developer workflows.",
    websiteUrl: "https://aside.com/",
    categoryLegacyId: CATEGORIES.NLP_TEXT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free plan with monthly query allowance",
    hasApi: true,
    logoEmoji: "💡",
    logoGradient: "from-cyan-500 to-blue-600",
    tagsPipe: "research|context|rag|knowledge|productivity",
    makerHandle: "@aside_app",
    editorial: {
      longDescription: "Aside is an ambient AI context companion that stays active alongside your browser and code editor. It continuously indexes documentation, pull requests, and codebase context to answer technical questions instantly without breaking focus.\n\nRather than searching across multiple browser tabs, Aside surfaces relevant documentation snippets, API specs, and architecture decisions right when needed.",
      useCases: [
        {
          title: "In-line documentation lookup",
          body: "Highlight obscure API functions or error messages to see contextual explanations instantly."
        },
        {
          title: "Codebase architecture Q&A",
          body: "Ask natural language questions about complex multi-repo dependencies."
        }
      ],
      pros: [
        "Seamless non-intrusive floating overlay",
        "Instant vector index over private codebase and docs",
        "Fast response latency with smart context filtering"
      ],
      cons: [
        "Requires initial repo indexing step",
        "Free tier limits monthly context queries"
      ],
      alternatives: ["supermemory", "perplexity", "pi-aside"]
    }
  },
  {
    slug: "command-code",
    name: "Command Code",
    tagline: "Natural language command line assistant and terminal agent",
    description: "Command Code converts natural language descriptions into verified shell scripts, git commands, and DevOps workflows directly in terminal.",
    websiteUrl: "https://www.commandcode.ai",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for CLI command completion",
    hasApi: true,
    logoEmoji: "⌨️",
    logoGradient: "from-slate-700 to-zinc-900",
    tagsPipe: "cli|terminal|devops|automation|commands",
    makerHandle: "@commandcode_ai",
    editorial: {
      longDescription: "Command Code is an AI terminal companion built to simplify command-line operations for developers and DevOps engineers. By analyzing operating system flags, environment variables, and directory structure, it generates safe shell commands with full safety verification.\n\nBefore executing any destructive action (like git resets or docker purges), Command Code provides plain-English explanations of what the command will alter.",
      useCases: [
        {
          title: "Safe DevOps command generation",
          body: "Generate complex kubectl, aws-cli, or docker compose commands safely."
        },
        {
          title: "Interactive shell troubleshooting",
          body: "Diagnose permission errors, broken symlinks, and port collisions interactively."
        }
      ],
      pros: [
        "Safety dry-run explanations before running commands",
        "Cross-platform support across macOS, Linux, and Windows PowerShell",
        "Custom alias creation for frequently used AI prompts"
      ],
      cons: [
        "Requires CLI executable installation",
        "Advanced cloud provider flags require occasional prompt tuning"
      ],
      alternatives: ["warp", "oh-my-pi", "aider"]
    }
  },
  {
    slug: "pi-aside",
    name: "Pi by Aside",
    tagline: "Lightweight AI knowledge assistant and developer research overlay",
    description: "Pi by Aside provides instant conversational intelligence and reference lookup overlay designed specifically for developers and researchers.",
    websiteUrl: "https://aside.com/",
    categoryLegacyId: CATEGORIES.NLP_TEXT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier integrated with Aside account",
    hasApi: true,
    logoEmoji: "🔍",
    logoGradient: "from-sky-400 to-blue-500",
    tagsPipe: "knowledge|research|overlay|assistant|developer",
    makerHandle: "@aside_app",
    editorial: {
      longDescription: "Pi by Aside is a focused, minimal conversational interface designed for quick developer queries, snippet explanations, and architectural gut-checks. It runs alongside your primary workspace to provide immediate answers without cluttering main editor windows.\n\nWith deep integration into Aside's knowledge index, Pi references project docs and codebase history seamlessly.",
      useCases: [
        {
          title: "Quick code snippet sanity checks",
          body: "Ask quick questions about algorithm complexity or regex patterns without leaving your editor."
        },
        {
          title: "Instant API reference summary",
          body: "Get concise summaries of third-party API specs and endpoint structures."
        }
      ],
      pros: [
        "Minimalist, low-distraction user interface",
        "Fast response time optimized for quick lookups",
        "Shares unified context index with Aside"
      ],
      cons: [
        "Tailored for conversational queries rather than multi-file edits",
        "Requires Aside account integration"
      ],
      alternatives: ["aside", "claude", "supermemory"]
    }
  },
  {
    slug: "tiny-fish",
    name: "Tiny Fish",
    tagline: "Headless browser infrastructure and web automation API for AI agents",
    description: "Tiny Fish provides scalable, anti-detect browser cloud instances for AI agents to scrape, automate, and interact with the web reliably.",
    websiteUrl: "https://www.tinyfish.ai/",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free monthly browser runtime minutes",
    hasApi: true,
    logoEmoji: "🐟",
    logoGradient: "from-blue-400 to-cyan-500",
    tagsPipe: "browser-automation|scraping|agent-infra|headless|api",
    makerHandle: "@tinyfish_ai",
    editorial: {
      longDescription: "Tiny Fish is developer infrastructure built for AI agents that interact with web applications. It offers managed headless browser instances with automatic CAPTCHA solving, proxy rotation, and full Playwright/Puppeteer DOM control.\n\nAI agents can navigate complex single-page apps, execute JavaScript, and extract structured data reliably without hitting rate limits or bot blocks.",
      useCases: [
        {
          title: "Autonomous agent web navigation",
          body: "Equip AI agents with reliable web browsing and form interaction capabilities."
        },
        {
          title: "Structured web data extraction",
          body: "Extract clean JSON data from dynamically rendered JavaScript websites automatically."
        }
      ],
      pros: [
        "Built-in proxy rotation and stealth anti-detection",
        "High-concurrency parallel browser instance scaling",
        "Simple API integration for Playwright and Python/Node agents"
      ],
      cons: [
        "Usage billing scales with browser execution minutes",
        "Requires basic web automation protocol knowledge"
      ],
      alternatives: ["hyperbrowser", "viso-suite", "n8n"]
    }
  },
  {
    slug: "hyperbrowser",
    name: "Hyperbrowser",
    tagline: "Cloud browser platform designed specifically for autonomous AI agents",
    description: "Hyperbrowser delivers high-performance, secure cloud browser sessions with DOM inspection APIs for agentic scraping and workflows.",
    websiteUrl: "https://www.hyperbrowser.ai/",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier with active session limits",
    hasApi: true,
    logoEmoji: "🌐",
    logoGradient: "from-indigo-500 to-blue-600",
    tagsPipe: "cloud-browser|agent-infra|scraping|automation|api",
    makerHandle: "@hyperbrowser_ai",
    editorial: {
      longDescription: "Hyperbrowser is a specialized cloud browser infrastructure platform created for AI agent developers. It exposes low-latency WebSocket and REST APIs to control sandboxed browser sessions, capture visual snapshots, and extract interactive DOM trees.\n\nDesigned for speed and reliability, Hyperbrowser supports session persistence, cookies management, and enterprise security compliance.",
      useCases: [
        {
          title: "Agent visual web auditing",
          body: "Run visual regression checks and screenshot audits using autonomous AI web browsers."
        },
        {
          title: "Complex web task execution",
          body: "Automate multi-step web workflows involving authentication, file uploads, and downloads."
        }
      ],
      pros: [
        "Ultra-low latency cloud browser WebSocket connection",
        "Rich DOM snapshot and accessibility tree extraction APIs",
        "Built-in session recording and execution replay"
      ],
      cons: [
        "Pricing tier scales with total session runtime hours",
        "Requires API key configuration for production pipelines"
      ],
      alternatives: ["tiny-fish", "viso-suite", "n8n"]
    }
  },
  {
    slug: "open-design",
    name: "Open Design",
    tagline: "AI design engine and UI system generator for text-to-code interfaces",
    description: "Open Design converts text prompts and wireframes into clean, production-ready React components and vector design systems.",
    websiteUrl: "https://open-design.ai/",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free plan for component generation",
    hasApi: true,
    logoEmoji: "🎨",
    logoGradient: "from-purple-500 to-pink-500",
    tagsPipe: "ui|design-systems|react|components|generative-ui",
    makerHandle: "@opendesign_ai",
    editorial: {
      longDescription: "Open Design is an open design engine that bridges visual UI layout and code generation. It converts natural language layout descriptions or sketched wireframes directly into polished Tailwind CSS and React component trees.\n\nUnlike traditional design tools, Open Design enforces accessibility standards, color tokens, and responsive layouts out of the box.",
      useCases: [
        {
          title: "Rapid UI prototype generation",
          body: "Turn product briefs into functional Tailwind/React component prototypes in seconds."
        },
        {
          title: "Design system token synchronization",
          body: "Generate consistent color palettes, typography scales, and component libraries automatically."
        }
      ],
      pros: [
        "Clean, human-readable React and Tailwind CSS output",
        "Strict adherence to accessibility and contrast ratios",
        "Exports design tokens directly to code repos"
      ],
      cons: [
        "Requires manual review for ultra-custom complex animations",
        "Free tier limits high-resolution vector exports"
      ],
      alternatives: ["overlay", "figma-ai", "midjourney"]
    }
  },
  {
    slug: "pen",
    name: "Pen",
    tagline: "AI documentation workspace for engineering specs and technical docs",
    description: "Pen combines collaborative markdown editing with AI intelligence for writing architecture decision records, PRDs, and API documentation.",
    websiteUrl: "https://www.pen.dev/",
    categoryLegacyId: CATEGORIES.NLP_TEXT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for personal engineering specs",
    hasApi: true,
    logoEmoji: "🖊️",
    logoGradient: "from-emerald-600 to-teal-700",
    tagsPipe: "docs|technical-writing|specs|markdown|collaboration",
    makerHandle: "@pen_dev",
    editorial: {
      longDescription: "Pen is a modern documentation workspace tailored specifically for software engineering teams. It connects directly with GitHub repositories to keep technical specs, API docs, and architecture decision records (ADRs) synchronized with source code.\n\nIts integrated AI writing partner helps developers write clear RFCs, auto-generate OpenAPI specs from codebase changes, and review documentation clarity.",
      useCases: [
        {
          title: "Automated technical spec writing",
          body: "Draft comprehensive PRDs and architecture decision records with AI guidance."
        },
        {
          title: "Repo-synced documentation maintenance",
          body: "Keep engineering documentation up to date automatically when codebase APIs change."
        }
      ],
      pros: [
        "Native GitHub markdown sync with version control",
        "Automated OpenAPI and schema document generation",
        "Clean, distraction-free collaborative editor"
      ],
      cons: [
        "Focused strictly on technical docs rather than general copy",
        "Requires GitHub authorization for automatic repo sync"
      ],
      alternatives: ["notion-ai", "emdash", "grammarly"]
    }
  },
  {
    slug: "zed",
    name: "Zed",
    tagline: "Next-gen multiplayer Rust code editor with built-in AI agent capabilities",
    description: "Zed is a high-performance, open-source code editor written in Rust with real-time multiplayer collaboration and integrated AI assistant.",
    websiteUrl: "https://zed.dev/",
    githubUrl: "https://github.com/zed-industries/zed",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "100% open source editor core",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-rose-500 to-red-600",
    tagsPipe: "editor|ide|rust|open-source|multiplayer|ai-coding",
    makerHandle: "@zeddotdev",
    editorial: {
      longDescription: "Zed is an open-source, next-generation code editor built by the creators of Atom and Tree-sitter. Written in Rust to leverage multi-core processors and GPU acceleration, Zed starts instantly and renders at 120 FPS even on massive codebases.\n\nIt features built-in support for Anthropic Claude, OpenAI, and custom local models, providing inline agentic completions, code transformation, and multi-user paired programming.",
      useCases: [
        {
          title: "High-performance AI paired programming",
          body: "Edit large enterprise repos with instant 120 FPS rendering and integrated AI assistance."
        },
        {
          title: "Real-time multiplayer coding sessions",
          body: "Collaborate with team members in shared editor buffers with live AI completions."
        }
      ],
      pros: [
        "Blazing-fast startup and 120 FPS GPU rendering engine",
        "100% open-source core with native multiplayer collaboration",
        "Flexible model selection supporting Anthropic, OpenAI, and Ollama"
      ],
      cons: [
        "Extension ecosystem is smaller than VS Code marketplace",
        "Windows support is in active rapid development"
      ],
      alternatives: ["cursor", "warp", "cline"]
    }
  },
  {
    slug: "kilocode",
    name: "Kilocode",
    tagline: "Enterprise AI agent platform for large-scale codebase refactoring",
    description: "Kilocode provides agentic AI tools for refactoring legacy enterprise codebases, managing dependency upgrades, and enforcing security patterns.",
    websiteUrl: "https://kilo.ai/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for personal repositories",
    hasApi: true,
    logoEmoji: "⚖️",
    logoGradient: "from-amber-600 to-orange-700",
    tagsPipe: "refactoring|enterprise|agents|codebase|legacy",
    makerHandle: "@kilo_ai",
    editorial: {
      longDescription: "Kilocode (Kilo AI) is an enterprise-grade AI coding platform engineered for complex, multi-million-line codebases. It deploys autonomous agents capable of performing multi-file refactoring, upgrading deprecated dependencies, and enforcing organizational coding standards.\n\nWith strict data privacy controls and self-hosted deployment options, Kilocode ensures enterprise code remains secure while accelerating migration projects.",
      useCases: [
        {
          title: "Automated framework & library migrations",
          body: "Migrate legacy codebases between framework versions across hundreds of repositories."
        },
        {
          title: "Enterprise security & lint rule enforcement",
          body: "Scan codebases for security vulnerabilities and auto-apply patches at scale."
        }
      ],
      pros: [
        "Handles massive enterprise repos with multi-file reasoning",
        "SOC2 compliant with self-hosted and private cloud options",
        "Automated pull request generation for dependency upgrades"
      ],
      cons: [
        "Optimized for enterprise engineering scale",
        "Requires repository setup and indexing"
      ],
      alternatives: ["qoder", "devin", "cline"]
    }
  },
  {
    slug: "cline",
    name: "Cline",
    tagline: "Open-source autonomous coding agent for VS Code with terminal CLI control",
    description: "Cline (formerly Claude Dev) is an open-source autonomous agent for VS Code that reads files, writes code, executes commands, and fixes errors.",
    websiteUrl: "https://cline.bot/",
    githubUrl: "https://github.com/cline/cline",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "100% open source extension (BYOK)",
    hasApi: true,
    logoEmoji: "🤖",
    logoGradient: "from-sky-500 to-blue-700",
    tagsPipe: "vs-code|open-source|autonomous-agent|cli|extension",
    makerHandle: "@cline_bot",
    editorial: {
      longDescription: "Cline is a powerful open-source autonomous coding assistant extension for VS Code. It acts as an autonomous pair programmer that can inspect directory structures, analyze code context, write and edit files, run terminal commands, and launch local browser tests.\n\nWith explicit human-in-the-loop safety checkpoints, developers approve tool executions step by step while maintaining complete control over file system modifications.",
      useCases: [
        {
          title: "End-to-end feature implementation",
          body: "Ask Cline to implement complex API endpoints, write tests, and fix compilation errors automatically."
        },
        {
          title: "Terminal error debugging",
          body: "Allow Cline to run build commands, inspect stack traces, and apply corrective code edits."
        }
      ],
      pros: [
        "100% open-source VS Code extension with active developer community",
        "Human-in-the-loop permission approvals for file writes and CLI commands",
        "Supports OpenRouter, Anthropic, OpenAI, and local Ollama models"
      ],
      cons: [
        "Requires API key setup (BYOK - Bring Your Own Key)",
        "Token consumption can be high during complex multi-step tasks"
      ],
      alternatives: ["aider", "cursor", "zed"]
    }
  }
];

async function runBatchIngestion() {
  const convex = createServerConvexClient();
  if (!convex) throw new Error("Convex client is not initialized");

  for (const tool of batch3Tools) {
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
        status: "published",
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
            longDescription: tool.editorial.longDescription,
            useCases: JSON.stringify(tool.editorial.useCases),
            pros: JSON.stringify(tool.editorial.pros),
            cons: JSON.stringify(tool.editorial.cons),
            alternatives: JSON.stringify(tool.editorial.alternatives),
            tags: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            status: "published",
            curated: true,
            editorsPick: true,
            createdAt: new Date(),
            contentUpdatedAt: new Date(),
            pricingCheckedAt: new Date(),
            verifiedAt: new Date(),
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
            categoryId: tool.categoryLegacyId,
            pricingModel: tool.pricingModel,
            startingPrice: tool.startingPrice,
            pricingNote: tool.pricingNote,
            hasApi: tool.hasApi,
            logoEmoji: tool.logoEmoji,
            logoGradient: tool.logoGradient,
            logoUrl: logoUrl,
            longDescription: tool.editorial.longDescription,
            useCases: JSON.stringify(tool.editorial.useCases),
            pros: JSON.stringify(tool.editorial.pros),
            cons: JSON.stringify(tool.editorial.cons),
            alternatives: JSON.stringify(tool.editorial.alternatives),
            tags: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            contentUpdatedAt: new Date(),
            pricingCheckedAt: new Date(),
          },
        });
        console.log(`✓ SQLite: Updated tool ${tool.name}`);
      }
    } catch (e: any) {
      console.error(`✗ SQLite Error for ${tool.slug}:`, e?.message);
    }
  }

  console.log(`\n==========================================`);
  console.log(`Verifying all 16 tool logos in Convex...`);
  console.log(`==========================================`);

  for (const tool of batch3Tools) {
    const page = await convex.query(api.tools.pageData, { slug: tool.slug });
    const isMatch = page?.logoUrl === `/logos/${tool.slug}.svg` || page?.logoUrl === `/logos/${tool.slug}.png`;
    console.log(`${tool.slug.padEnd(25)} -> ${isMatch ? "✓ MATCH:" : "✗ MISMATCH:"} ${page?.logoUrl}`);
    if (!isMatch) {
      throw new Error(`CRITICAL VERIFICATION FAILURE for ${tool.slug}: expected /logos/${tool.slug}.ext, got ${page?.logoUrl}`);
    }
  }

  await db.$disconnect();
}

runBatchIngestion().catch((e) => {
  console.error("Fatal Error during batch 3 ingestion:", e);
  process.exit(1);
});
