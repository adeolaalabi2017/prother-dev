/**
 * Script to add 10 newly requested tools to Prother.dev:
 * 1. Openchamber
 * 2. Nebula
 * 3. Open-slide
 * 4. Paperclip
 * 5. Linear
 * 6. OpenViking
 * 7. Julia 1 (by Supersonic Labs)
 * 8. Jev (by TypeSafe AI)
 * 9. Supermemory
 * 10. Antigravity (by Google)
 *
 * Downloads real vector/high-res logos, uploads them to Convex storage,
 * and dual-writes to Convex (source of truth) and SQLite (custom.db).
 *
 * Run: bun scripts/add-ten-tools.ts
 */
import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  datasources: {
    db: {
      url: `file:${resolve(process.cwd(), "db/custom.db")}`,
    },
  },
});

// Category Legacy IDs
const CAT_DEV_PLATFORMS = "cmucrh2nn0006kji83fbwfgnw";
const CAT_AUTOMATION = "cmucrh2nm0005kji8p4nuxs89";
const CAT_CONVERSATIONAL_AI = "cmucrh2nj0000kji8o4lndfc1";
const CAT_GENERATIVE_CONTENT = "cmucrh2nk0001kji8qk3jr9yr";

const NOW = Date.now();

interface ToolSpec {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  categoryLegacyId: string;
  pricingModel: string;
  startingPrice?: string;
  pricingNote?: string;
  hasApi: boolean;
  logoEmoji: string;
  logoGradient: string;
  tagsPipe: string;
  makerHandle: string;
  status: string;
  editorsPick: boolean;
  curated: boolean;
  rawLogoUrl: string;
  logoExt: "svg" | "png";
  contentType: string;
  editorial: {
    longDescription: string;
    useCases: { title: string; body: string }[];
    pros: string[];
    cons: string[];
    alternatives: string[];
    pricingChecked: boolean;
  };
}

const TOOLS: ToolSpec[] = [
  {
    slug: "openchamber",
    name: "Openchamber",
    tagline: "Open-source agentic development environment and web IDE for AI coding",
    description:
      "Openchamber is an open-source agentic development environment and web-based IDE engineered for autonomous coding agents. It provides sandboxed execution, terminal access, dynamic file tree management, and multi-agent coordination.",
    websiteUrl: "https://openchamber.dev",
    categoryLegacyId: CAT_DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote:
      "Open source under MIT license. Self-hostable for free or run locally in Docker.",
    hasApi: true,
    logoEmoji: "🏛️",
    logoGradient: "from-indigo-600 to-purple-900",
    tagsPipe: "coding|ide|agents|open-source|developer-tools",
    makerHandle: "@openchamber",
    status: "live",
    editorsPick: true,
    curated: true,
    rawLogoUrl: "https://openchamber.dev/favicon.svg",
    logoExt: "svg",
    contentType: "image/svg+xml",
    editorial: {
      longDescription:
        "Openchamber is an open-source agentic development environment designed to run, test, and observe autonomous coding agents inside full-featured developer workspaces. Unlike conventional sandboxes that treat agent actions as opaque black boxes, Openchamber provides a reactive web IDE interface equipped with real-time file tree synchronization, terminal streaming, multi-file diff previews, and agent telemetry.\n\nDevelopers can deploy Openchamber as a self-hosted platform or containerized environment to give autonomous agents like Claude Code, Aider, and custom agent loops safe access to real execution runtimes. The architecture isolates dangerous commands inside ephemeral containers while giving engineers visual oversight of every bash command, package installation, and code patch.",
      useCases: [
        {
          title: "Sandboxed execution runtime for coding agents",
          body: "Provide autonomous agents with an isolated Linux filesystem and terminal runtime where they can execute tests, install packages, and compile code safely.",
        },
        {
          title: "Visual multi-file diff review and rollback",
          body: "Inspect agent edits in real time through an interactive Monaco editor with visual git-style diffs and one-click patch revert.",
        },
        {
          title: "Multi-agent orchestration and delegation",
          body: "Coordinate multiple specialized subagents working concurrently across separate workspace worktrees without merge conflicts.",
        },
        {
          title: "Self-hosted private developer cloud",
          body: "Deploy on internal Kubernetes clusters or bare-metal servers to retain proprietary codebase context entirely within your firewall.",
        },
      ],
      pros: [
        "Fully open source and self-hostable with Docker and Kubernetes support",
        "Reactive web IDE with live terminal streaming and Monaco editor integration",
        "Granular permission controls and execution timeouts for agent commands",
        "Compatible with major agent protocols and CLI-driven coding tools",
      ],
      cons: [
        "Self-hosting requires infrastructure configuration for container sandboxing",
        "Web IDE features are focused on agent observation rather than manual editing",
        "Ecosystem and extension marketplace are smaller than standard desktop IDEs",
      ],
      alternatives: ["cursor", "windsurf", "aider"],
      pricingChecked: true,
    },
  },
  {
    slug: "nebula",
    name: "Nebula",
    tagline: "The multiplayer collaborative workspace for teams and autonomous agents",
    description:
      "Nebula is a multiplayer operating canvas and collaborative workspace connecting human teams with autonomous AI agents. It orchestrates background workflows, real-time context streaming, and agent collaboration in a shared virtual workspace.",
    websiteUrl: "https://www.nebula.gg",
    categoryLegacyId: CAT_AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$20 per user/mo",
    pricingNote:
      "Free personal tier with basic agent orchestration. Team tier starting at $20 per user per month with unlimited agent parallel runs.",
    hasApi: true,
    logoEmoji: "🌌",
    logoGradient: "from-violet-600 to-indigo-900",
    tagsPipe: "collaboration|agents|workspace|automation|multiplayer",
    makerHandle: "@nebulagg",
    status: "live",
    editorsPick: false,
    curated: true,
    rawLogoUrl: "https://nebula.gg/icon.svg",
    logoExt: "svg",
    contentType: "image/svg+xml",
    editorial: {
      longDescription:
        "Nebula is a collaborative multiplayer operating workspace engineered to bridge the gap between human team members and autonomous software agents. Built around a spatial canvas and shared live state, Nebula allows engineers, product managers, and designers to co-work with agents in real time, assigning tickets, inspecting running jobs, and sharing research findings seamlessly.\n\nThe platform integrates background task dispatch, live status broadcasts, and persistent project memory. Teams can supervise autonomous agents that draft pull requests, analyze production telemetry, and build customer documentation while retaining complete visibility through synchronized cursors, presence indicators, and comment threads.",
      useCases: [
        {
          title: "Multiplayer human-agent task dispatch",
          body: "Assign tasks to specialized AI agents directly on a visual workspace board and watch real-time output streams with teammates.",
        },
        {
          title: "Cross-functional knowledge sharing and brainstorming",
          body: "Collaborate on project specs and system architectures with agents synthesizing external docs and team meeting transcripts.",
        },
        {
          title: "Autonomous workflow supervision and approvals",
          body: "Establish human-in-the-loop review checkpoints where team members inspect agent proposals before production execution.",
        },
        {
          title: "Synchronized project memory and persistent context",
          body: "Maintain a living project context graph that all team members and agents query to avoid duplicated work.",
        },
      ],
      pros: [
        "True multiplayer presence with synchronized cursors and collaborative canvas",
        "Unified workspace bridging chat, documents, and agent execution logs",
        "Intuitive human-in-the-loop approval workflows for critical operations",
        "Integrates with popular developer platforms, GitHub, and Slack",
      ],
      cons: [
        "Team features require paid subscription for multiple concurrent seats",
        "Spatial canvas paradigm has an initial learning curve for text-only users",
        "Large agent task queues require monitoring to manage token consumption",
      ],
      alternatives: ["paperclip", "linear", "zapier"],
      pricingChecked: true,
    },
  },
  {
    slug: "open-slide",
    name: "Open-slide",
    tagline: "React-first presentation framework authored and structured by AI agents",
    description:
      "Open-slide is a modern, developer-friendly presentation framework built on React and Tailwind CSS, designed for interactive decks generated and edited directly by AI agents.",
    websiteUrl: "https://open-slide.dev",
    categoryLegacyId: CAT_GENERATIVE_CONTENT,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote:
      "Free and open source under MIT license. Host and build decks with standard React and Next.js tooling.",
    hasApi: true,
    logoEmoji: "📽️",
    logoGradient: "from-emerald-500 to-teal-800",
    tagsPipe: "presentations|slides|react|generative-content|open-source",
    makerHandle: "@openslide",
    status: "live",
    editorsPick: false,
    curated: true,
    rawLogoUrl: "https://open-slide.dev/open-slide.png",
    logoExt: "png",
    contentType: "image/png",
    editorial: {
      longDescription:
        "Open-slide is an open-source presentation framework built from the ground up for the agentic era. While traditional slide makers like PowerPoint and Google Slides trap presentations inside proprietary binary or GUI formats that language models struggle to manipulate, Open-slide structures every slide as a clean React component styled with Tailwind CSS.\n\nThis code-first architecture allows autonomous AI agents to draft, refactor, and update complete slide decks through standard code generation. Decks can include interactive charts, runnable code snippets, live web embeds, and responsive layouts that look crisp on both mobile screens and 4K conference displays.",
      useCases: [
        {
          title: "AI-generated technical slide decks",
          body: "Instruct AI coding agents to create clean, responsive slide presentations directly from technical whitepapers, RFCs, or changelogs.",
        },
        {
          title: "Interactive components in live presentations",
          body: "Embed interactive React components, live 3D models, and dynamic calculators directly inside presentation slides.",
        },
        {
          title: "Automated quarterly and reporting decks",
          body: "Connect slide templates to live databases and APIs so agents update charts and metrics automatically every week.",
        },
        {
          title: "Version-controlled presentations in Git",
          body: "Review presentation edits via pull requests with standard git diffs, automated linting, and preview deployments.",
        },
      ],
      pros: [
        "Code-first React and Tailwind architecture is ideal for AI agent generation",
        "Zero vendor lock-in with standard Next.js and static HTML export",
        "Supports interactive React components, animations, and live data widgets",
        "Version control every slide deck cleanly using standard Git workflows",
      ],
      cons: [
        "Requires familiarity with React and web development tooling",
        "No drag-and-drop WYSIWYG editor for non-technical team members",
        "Offline presentation mode requires building static exports ahead of time",
      ],
      alternatives: ["notion-ai", "midjourney", "synthesia"],
      pricingChecked: true,
    },
  },
  {
    slug: "paperclip",
    name: "Paperclip",
    tagline: "The desktop and web operating system to manage autonomous AI agents for work",
    description:
      "Paperclip is an agent management operating platform that organizes autonomous AI agents into goal-oriented teams. It handles agent permissions, tool execution, budget caps, and multi-agent coordination.",
    websiteUrl: "https://paperclip.ing",
    categoryLegacyId: CAT_AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$15 per month",
    pricingNote:
      "Free plan for single agent workspaces. Pro and Team tiers with persistent memory and advanced orchestration start at $15 per month.",
    hasApi: true,
    logoEmoji: "📎",
    logoGradient: "from-amber-500 to-orange-700",
    tagsPipe: "agents|orchestration|automation|productivity|workflow",
    makerHandle: "@paperclip_ing",
    status: "live",
    editorsPick: false,
    curated: true,
    rawLogoUrl: "https://paperclip.ing/favicon.svg",
    logoExt: "svg",
    contentType: "image/svg+xml",
    editorial: {
      longDescription:
        "Paperclip is an agent management system and desktop operating environment designed to organize autonomous AI agents into high-output digital teams. Rather than managing loose chat windows or disjointed scripts, Paperclip gives operators a unified dashboard to assign roles, provision tools, set spend limits, and monitor long-running background tasks.\n\nPaperclip orchestrates multi-agent handoffs with deterministic validation, ensuring that research agents pass structured findings to drafting agents, who in turn submit work to verification agents. The application includes deep OS integrations for file system access, browser automation, and local script execution under strict permission guardrails.",
      useCases: [
        {
          title: "Goal-driven multi-agent team orchestration",
          body: "Configure teams of specialized agents with distinct personas, tools, and supervisor review steps to accomplish complex multi-day projects.",
        },
        {
          title: "Budget and token expenditure guardrails",
          body: "Enforce strict per-task and per-agent token limits and cost ceilings to prevent runaway LLM API expenses.",
        },
        {
          title: "Local desktop and browser automation",
          body: "Empower agents to interact with desktop applications, extract web data, and process local spreadsheets autonomously.",
        },
        {
          title: "Persistent agent memory and audit trails",
          body: "Audit every prompt, tool invocation, and decision path with full searchable execution logs and persistent team memory.",
        },
      ],
      pros: [
        "Structured multi-agent workflows with clear supervisor and worker hierarchy",
        "Granular token budgets, cost limits, and security permission controls",
        "Native desktop client with system automation and local file capabilities",
        "Clean, distraction-free interface built specifically for agent supervision",
      ],
      cons: [
        "Desktop app installation required for full OS-level automation features",
        "Requires users to supply their own LLM API keys for custom models",
        "Complex multi-agent graphs require thoughtful prompt tuning to prevent loops",
      ],
      alternatives: ["nebula", "n8n", "relay-app"],
      pricingChecked: true,
    },
  },
  {
    slug: "linear",
    name: "Linear",
    tagline: "Purpose-built project management system engineered for high-velocity software teams and AI agents",
    description:
      "Linear is the gold-standard issue tracking and project planning system designed for high-performing engineering teams. Built with first-class APIs, webhooks, and agent integration, Linear unifies backlog planning, roadmaps, automated triage, and agentic workflows.",
    websiteUrl: "https://linear.app",
    categoryLegacyId: CAT_AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$8 per user/mo",
    pricingNote:
      "Free for small teams with unlimited members and 250 active issues. Standard plan is $8 per user per month billed annually.",
    hasApi: true,
    logoEmoji: "📐",
    logoGradient: "from-slate-700 to-zinc-900",
    tagsPipe: "project-management|issue-tracking|developer-tools|automation|engineering",
    makerHandle: "@linear",
    status: "live",
    editorsPick: true,
    curated: true,
    rawLogoUrl: "https://linear.app/static/favicon.svg",
    logoExt: "svg",
    contentType: "image/svg+xml",
    editorial: {
      longDescription:
        "Linear is the purpose-built project management and issue tracking system that sets the benchmark for software engineering velocity. Built with an obsessive focus on performance, keyboard ergonomics, and design craft, Linear synchronizes state instantly across clients with an offline-first architecture.\n\nWith the rise of agentic software development, Linear has emerged as the premier system of record for autonomous workflows. Through its GraphQL API, webhooks, and automated triage capabilities, teams can connect AI coding agents like Devin, Cursor, and Openchamber directly to Linear issues. Agents can read task specifications, self-assign bugs, post PR progress updates, and close cycles upon successful deployment.",
      useCases: [
        {
          title: "Autonomous issue triage and AI ticket assignment",
          body: "Connect AI agents to automatically classify incoming bug reports, reproduce issues from logs, and assign tickets to appropriate team members.",
        },
        {
          title: "Agent-driven pull request linking and cycle closing",
          body: "Enable coding agents to pull issue requirements, generate branch names, link pull requests, and transition status upon merge.",
        },
        {
          title: "High-velocity sprint and roadmap planning",
          body: "Plan engineering milestones, track project roadmaps, and eliminate estimation overhead with streamlined cycles and project insights.",
        },
        {
          title: "Keyboard-first backlog management",
          body: "Navigate projects and execute bulk operations with lightning-fast command menus and instant offline-first synchronization.",
        },
      ],
      pros: [
        "Industry-leading speed with offline-first synchronization and instant search",
        "First-class GraphQL API and webhook ecosystem for AI agent integration",
        "Flawless keyboard navigation and command palette ergonomics",
        "Clean, minimalist aesthetic that eliminates project management bloat",
      ],
      cons: [
        "Free tier limits active issues to 250 across the workspace",
        "Focus on engineering velocity may not suit complex traditional Gantt workflows",
        "Requires team buy-in to adhere to opinionated cycle-based methodologies",
      ],
      alternatives: ["notion-ai", "zapier", "relay-app"],
      pricingChecked: true,
    },
  },
  {
    slug: "openviking",
    name: "OpenViking",
    tagline: "The open-source context database and knowledge engine for AI agents",
    description:
      "OpenViking is an open-source context database designed specifically for AI agents and LLM applications. It unifies hybrid retrieval, vector search, graph relationships, and document hierarchies to give autonomous agents persistent episodic memory.",
    websiteUrl: "https://openviking.ai",
    categoryLegacyId: CAT_DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote:
      "Open source database engine. Community edition is freely hostable with enterprise clustering options.",
    hasApi: true,
    logoEmoji: "🛡️",
    logoGradient: "from-blue-700 to-cyan-900",
    tagsPipe: "database|vector-database|agents|memory|context|open-source",
    makerHandle: "@openviking_ai",
    status: "live",
    editorsPick: false,
    curated: true,
    rawLogoUrl:
      "https://res.gcloudcache.com/volc-fe/openviking/playground/openviking-logo.png",
    logoExt: "png",
    contentType: "image/png",
    editorial: {
      longDescription:
        "OpenViking is a purpose-built context database engineered to solve the persistent memory bottleneck in autonomous AI agents. While generic vector databases index flat embedding collections, OpenViking models context as a multi-dimensional graph combining semantic vectors, hierarchical document nodes, temporal timestamps, and causal entity relationships.\n\nThis hybrid architecture enables agents to retrieve relevant information using both semantic similarity and relational traversals. Agents can recall past user preferences, trace multi-turn reasoning steps, and ground answers in structured enterprise knowledge with millisecond retrieval latencies.",
      useCases: [
        {
          title: "Episodic and long-term agent memory storage",
          body: "Persist agent interactions and user preferences across distinct sessions with automatic relevance scoring and temporal decay.",
        },
        {
          title: "Hybrid vector and graph knowledge retrieval",
          body: "Execute compound queries that combine high-dimensional vector embeddings with relationship graph traversals for deeper context.",
        },
        {
          title: "Enterprise codebase and documentation indexing",
          body: "Index large repositories with hierarchical AST awareness so coding agents retrieve exact function definitions and import graphs.",
        },
        {
          title: "Local and on-premise privacy-preserving search",
          body: "Deploy on private infrastructure without sending sensitive corporate documents to third-party managed vector providers.",
        },
      ],
      pros: [
        "Unifies vector embeddings, relational graphs, and hierarchical documents",
        "Built specifically for agentic retrieval rather than generic text search",
        "Open source with self-hosted container deployments for strict data privacy",
        "Low query latency optimized for real-time agent decision loops",
      ],
      cons: [
        "Relatively new project with an evolving client library ecosystem",
        "Setting up optimal graph schemas requires database modeling experience",
        "Self-hosted clustering requires operational knowledge for high-availability setups",
      ],
      alternatives: ["pinecone", "supermemory", "langchain"],
      pricingChecked: true,
    },
  },
  {
    slug: "julia-1",
    name: "Julia 1",
    tagline: "Fast, local System 1 foundation model for instant reasoning and autonomous workflows",
    description:
      "Julia 1 by Supersonic Labs is an ultra-low-latency, local System 1 artificial intelligence model engineered for rapid instinctual reasoning, edge execution, and real-time agentic tool invocation without cloud round-trips.",
    websiteUrl: "https://supersoniclabs.ia.br",
    categoryLegacyId: CAT_CONVERSATIONAL_AI,
    pricingModel: "free",
    startingPrice: "Free",
    pricingNote:
      "Open weights and local deployment available for research and personal use.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-rose-600 to-pink-900",
    tagsPipe: "llm|local-ai|system-1|edge-ai|open-weights",
    makerHandle: "@supersoniclabs",
    status: "live",
    editorsPick: false,
    curated: true,
    rawLogoUrl: "https://supersoniclabs.ia.br/favicon.svg",
    logoExt: "svg",
    contentType: "image/svg+xml",
    editorial: {
      longDescription:
        "Julia 1, developed by Supersonic Labs, is a specialized System 1 foundation model designed for near-instantaneous cognitive inference and edge deployment. Inspired by cognitive dual-process theory, Julia 1 handles the fast, intuitive, and reflexive operations of software agents, allowing complex reasoning pipelines to offload routing, classification, and schema extraction to a model that runs at hundreds of tokens per second.\n\nOptimized for lightweight local runtimes like Apple Silicon, NVIDIA RTX GPUs, and edge appliances, Julia 1 eliminates the latency and privacy risks of cloud API round-trips. It is an ideal companion for agent orchestrators needing sub-50ms tool selection and intent parsing before invoking larger frontier models.",
      useCases: [
        {
          title: "Instant tool selection and query routing",
          body: "Parse user prompts in under 50 milliseconds to decide which agent tool, database, or downstream model to activate.",
        },
        {
          title: "Offline edge intelligence and local workflows",
          body: "Run autonomous agents on local workstations and edge hardware without Internet connectivity or external API keys.",
        },
        {
          title: "Real-time stream filtering and safety classification",
          body: "Classify incoming customer queries and filter toxic content on the fly before forwarding requests to production databases.",
        },
        {
          title: "High-throughput structured data extraction",
          body: "Extract JSON schemas and entities from thousands of raw log lines and documents with maximum throughput.",
        },
      ],
      pros: [
        "Exceptional inference speed exceeding 200 tokens per second on consumer hardware",
        "Zero API costs and complete data privacy with local weight execution",
        "Fine-tuned specifically for fast System 1 heuristic reasoning and tool routing",
        "Small memory footprint compatible with standard laptops and workstations",
      ],
      cons: [
        "Narrower general knowledge compared to frontier 400B+ parameter models",
        "Requires local compute resources such as modern Apple Silicon or NVIDIA GPUs",
        "Not designed for multi-page complex essay writing or deep mathematical proofs",
      ],
      alternatives: ["ollama", "claude", "chatgpt"],
      pricingChecked: true,
    },
  },
  {
    slug: "jev",
    name: "Jev",
    tagline: "Machine-native intelligence infrastructure and System 1 model for automated software engineering",
    description:
      "Jev by TypeSafe AI is machine-native intelligence infrastructure designed to run high-throughput code synthesis, validation, and real-time system transformations with deterministic safety guarantees.",
    websiteUrl: "https://typesafe.ai",
    categoryLegacyId: CAT_DEV_PLATFORMS,
    pricingModel: "paid",
    startingPrice: "Custom",
    pricingNote:
      "Enterprise infrastructure pricing with dedicated compute instances and developer seats.",
    hasApi: true,
    logoEmoji: "🔒",
    logoGradient: "from-blue-600 to-sky-900",
    tagsPipe: "developer-tools|infrastructure|system-1|code-synthesis|typesafe",
    makerHandle: "@typesafe_ai",
    status: "live",
    editorsPick: false,
    curated: true,
    rawLogoUrl:
      "https://framerusercontent.com/images/aNFzSFxM4fjICmnibw7npfZjcQ.png",
    logoExt: "png",
    contentType: "image/png",
    editorial: {
      longDescription:
        "Jev, built by TypeSafe AI, is machine-native intelligence infrastructure engineered for high-assurance software engineering and continuous codebase transformations. Unlike consumer-oriented chat assistants that generate speculative code snippets, Jev pairs specialized neural models with formal type-checking compilers and deterministic static analysis.\n\nEvery code synthesis and refactor executed by Jev is verified against compiler type signatures and system invariants before output emission. This machine-native feedback loop virtually eliminates hallucinated imports, broken type contracts, and runtime syntax errors, making it particularly valuable for enterprise codebases migrating large monorepos or standardizing APIs.",
      useCases: [
        {
          title: "Compiler-verified automated code refactoring",
          body: "Execute complex monorepo migrations where every transformation is verified by static type checkers before commit.",
        },
        {
          title: "Machine-native API and schema synchronization",
          body: "Automatically synchronize backend schemas, GraphQL types, and frontend client models across distributed microservices.",
        },
        {
          title: "Automated test suite synthesis and mutation testing",
          body: "Generate comprehensive unit test coverage with strict boundary condition checks and zero hallucinated fixtures.",
        },
        {
          title: "Continuous codebase modernization and security patching",
          body: "Upgrade deprecated library calls and patch vulnerable dependencies across millions of lines of code systematically.",
        },
      ],
      pros: [
        "Compiler-grounded synthesis with deterministic type safety guarantees",
        "Prevents hallucinated methods, broken imports, and syntax regressions",
        "High-throughput pipeline optimized for automated monorepo transformations",
        "Enterprise-grade security and isolation for proprietary source code",
      ],
      cons: [
        "Enterprise-oriented solution requiring custom pricing and sales onboarding",
        "Optimized for statically typed ecosystems such as TypeScript, Go, and Rust",
        "Steeper configuration required to wire up custom compiler toolchains",
      ],
      alternatives: ["cursor", "aider", "windsurf"],
      pricingChecked: true,
    },
  },
  {
    slug: "supermemory",
    name: "Supermemory",
    tagline: "The memory and personalized context engine for AI agents and applications",
    description:
      "Supermemory provides persistent memory infrastructure and personalization APIs for AI agents, chatbots, and developers. It transforms unstructured user interactions, documents, and bookmarks into organized long-term knowledge graphs.",
    websiteUrl: "https://supermemory.ai",
    categoryLegacyId: CAT_DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$19 per month",
    pricingNote:
      "Free tier with up to 1000 memory items and API access. Pro tier starts at $19 per month for extensive knowledge indexing and high-throughput query limits.",
    hasApi: true,
    logoEmoji: "🧠",
    logoGradient: "from-indigo-500 to-purple-800",
    tagsPipe: "memory|context|knowledge-base|agents|developer-tools",
    makerHandle: "@supermemory_ai",
    status: "live",
    editorsPick: true,
    curated: true,
    rawLogoUrl: "https://supermemory.ai/favicon.svg",
    logoExt: "svg",
    contentType: "image/svg+xml",
    editorial: {
      longDescription:
        "Supermemory is a state-of-the-art memory and personalized context infrastructure platform designed for AI agents, assistants, and intelligent applications. While basic LLMs treat every conversation as a blank slate, Supermemory extracts facts, preferences, relationships, and context from user inputs, organizing them into a living semantic memory graph.\n\nThrough simple REST and TypeScript SDK integrations, developers can query user profiles, semantic memories, and domain documents with sub-100ms response times. The platform handles deduplication, contradictory fact updates, and relevance decay automatically, allowing teams to deliver deeply personalized AI experiences without building custom vector pipelines.",
      useCases: [
        {
          title: "Personalized agent assistant memory",
          body: "Equip chatbots and personal assistants with long-term memory of user habits, previous decisions, and work context.",
        },
        {
          title: "Semantic bookmarking and research capture",
          body: "Save web pages, code snippets, and PDFs into an organized knowledge base that agents recall during research tasks.",
        },
        {
          title: "Dynamic user profile generation",
          body: "Automatically synthesize static facts and evolving preferences from conversations without manual user surveys.",
        },
        {
          title: "Enterprise knowledge base RAG integration",
          body: "Index company documentation and team notes with automatic deduplication and hybrid search for instant team answers.",
        },
      ],
      pros: [
        "Turnkey memory API requiring zero vector database management or chunking setup",
        "Automatic fact extraction, deduplication, and memory conflict resolution",
        "Fast TypeScript SDK and REST API with sub-100ms retrieval latency",
        "Generous free tier with 1000 memories for individual developers and prototypes",
      ],
      cons: [
        "Cloud-hosted service requires external network requests for memory lookups",
        "Pro plan required for large knowledge bases exceeding initial item limits",
        "Automatic fact extraction requires clear user phrasing for optimal accuracy",
      ],
      alternatives: ["openviking", "pinecone", "langchain"],
      pricingChecked: true,
    },
  },
  {
    slug: "antigravity",
    name: "Antigravity",
    tagline: "The next-generation autonomous agent development platform and IDE by Google",
    description:
      "Antigravity is Google's advanced agentic coding environment and developer platform. It unites an AI-first IDE, autonomous multi-agent execution, terminal and browser sidecars, and deep codebase reasoning into a unified workflow.",
    websiteUrl: "https://antigravity.google",
    categoryLegacyId: CAT_DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote:
      "Developer preview is free with Google account. Enterprise configurations available for engineering organizations.",
    hasApi: true,
    logoEmoji: "🚀",
    logoGradient: "from-blue-600 to-emerald-700",
    tagsPipe: "agents|google|ide|coding|developer-tools|autonomous",
    makerHandle: "@google",
    status: "live",
    editorsPick: true,
    curated: true,
    rawLogoUrl:
      "https://antigravity.google/assets/image/antigravity-logo.png",
    logoExt: "png",
    contentType: "image/png",
    editorial: {
      longDescription:
        "Google Antigravity is an agentic AI coding assistant and development platform designed by Google to redefine human-agent pair programming. Built on frontier Gemini models with ultra-large context windows, Antigravity functions as a fully capable autonomous software engineer capable of navigating entire multi-gigabyte codebases, writing tests, debugging build failures, and driving web browsers.\n\nAntigravity introduces a unified agent runtime that features persistent terminal sessions, automated background verification, interactive generative UI artifacts, and specialized skill plugins. Developers can delegate complete end-to-end features, complex refactors, and full-stack testing workflows while retaining interactive oversight through the desktop IDE or CLI.",
      useCases: [
        {
          title: "Autonomous multi-file feature implementation",
          body: "Delegate full feature specifications: Antigravity plans steps, edits multiple components, runs test suites, and verifies live application behavior.",
        },
        {
          title: "Full codebase exploration with mega-context",
          body: "Index millions of lines of code to resolve cross-package dependencies and understand legacy architectures without manual file selection.",
        },
        {
          title: "Automated browser verification and accessibility testing",
          body: "Use integrated Chrome DevTools sidecars to click elements, inspect network traffic, and verify accessibility compliance automatically.",
        },
        {
          title: "Modular skills and custom subagent orchestration",
          body: "Equip the assistant with specialized domain skills and invoke concurrent subagents to parallelize large refactors.",
        },
      ],
      pros: [
        "Powered by Google's frontier Gemini models with massive context windows",
        "Integrated browser and terminal sidecars for autonomous verification",
        "Support for generative UI, visual artifacts, and interactive walkthroughs",
        "Extensible skill ecosystem supporting custom tools and multi-agent teams",
      ],
      cons: [
        "Currently in developer preview with evolving documentation and APIs",
        "Requires active Google account authentication and network connection",
        "High agent autonomy requires careful review on production database migrations",
      ],
      alternatives: ["cursor", "windsurf", "aider"],
      pricingChecked: true,
    },
  },
];

// Verify NO em or en dashes exist in any text
for (const tool of TOOLS) {
  const texts = [
    tool.description,
    tool.tagline,
    tool.editorial.longDescription,
    ...tool.editorial.useCases.flatMap((u) => [u.title, u.body]),
    ...tool.editorial.pros,
    ...tool.editorial.cons,
    tool.pricingNote ?? "",
  ];
  for (const t of texts) {
    if (/[\u2014\u2013]/.test(t)) {
      console.error(`✗ Copy check failed: em or en dash found in ${tool.slug}!`);
      process.exit(1);
    }
  }
}
console.log("✓ Copy hygiene verified: 0 em/en dashes found across all 10 tools.");

async function main() {
  console.log("Connecting to Convex...");
  const convex = createServerConvexClient();
  if (!convex) throw new Error("Could not initialize Convex client.");

  if (!existsSync("public/logos")) {
    mkdirSync("public/logos", { recursive: true });
  }

  // 1. Process logos (download & upload to Convex storage)
  const logoUrlMap = new Map<string, string>();

  for (const tool of TOOLS) {
    const localPath = `public/logos/${tool.slug}.${tool.logoExt}`;
    try {
      // Check if tool already exists in Convex with a storage logoUrl
      const existingConvex = await convex.query(api.tools.detail, { slug: tool.slug });
      if (!("error" in existingConvex) && existingConvex?.logoUrl?.includes("befitting-moose-925.convex.cloud")) {
        console.log(`✓ Reusing existing Convex storage logo for ${tool.slug}: ${existingConvex.logoUrl}`);
        logoUrlMap.set(tool.slug, existingConvex.logoUrl);
        if (!existsSync(localPath)) {
          const res = await fetch(tool.rawLogoUrl, {
            headers: { "User-Agent": "Mozilla/5.0 ProtherBot/1.0" },
          });
          if (res.ok) {
            writeFileSync(localPath, Buffer.from(await res.arrayBuffer()));
            console.log(`✓ Saved local copy to ${localPath}`);
          }
        }
        continue;
      }

      console.log(`\nFetching logo for ${tool.name} from ${tool.rawLogoUrl}...`);
      let buf: Buffer;
      if (existsSync(localPath)) {
        buf = readFileSync(localPath);
        console.log(`✓ Loaded local logo from ${localPath}`);
      } else {
        const res = await fetch(tool.rawLogoUrl, {
          headers: { "User-Agent": "Mozilla/5.0 ProtherBot/1.0" },
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch logo: ${res.status} ${res.statusText}`);
        }
        buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(localPath, buf);
        console.log(`✓ Saved local logo to ${localPath} (${buf.byteLength} bytes)`);
      }

      // Upload to Convex storage
      console.log(`Requesting Convex mediaUploadUrl for ${tool.slug}...`);
      const uploadUrl: string = await convex.mutation(api.media.mediaUploadUrl, {});
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": tool.contentType,
          "Content-Length": String(buf.byteLength),
        },
        body: buf as unknown as BodyInit,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to Convex failed: ${uploadRes.status} ${await uploadRes.text()}`);
      }

      const { storageId } = (await uploadRes.json()) as { storageId: string };
      const storageUrl = `https://befitting-moose-925.convex.cloud/api/storage/${storageId}`;
      console.log(`✓ Uploaded ${tool.slug} logo to Convex storage: ${storageUrl}`);
      logoUrlMap.set(tool.slug, storageUrl);
    } catch (err) {
      console.error(`Error processing logo for ${tool.slug}:`, err);
      throw err;
    }
  }

  // 2. Add tools to Convex
  console.log("\n==========================================");
  console.log("Writing tools to Convex...");
  console.log("==========================================");

  for (const tool of TOOLS) {
    const storageLogoUrl = logoUrlMap.get(tool.slug);
    const id = "cmucr_" + tool.slug.replace(/[^a-z0-9]/g, "_") + "_" + Math.random().toString(36).substring(2, 9);

    const payload = {
      id,
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
      logoUrl: storageLogoUrl,
      tagsPipe: tool.tagsPipe,
      makerHandle: tool.makerHandle,
      status: tool.status,
      editorsPick: tool.editorsPick,
      curated: tool.curated,
      createdAt: NOW,
      editorial: tool.editorial,
    };

    const existingDetail = await convex.query(api.tools.detail, { slug: tool.slug });
    if (!("error" in existingDetail)) {
      console.log(`ℹ Convex: ${tool.name} (${tool.slug}) already exists, patching with logoUrl and editorial...`);
      const page = await convex.query(api.tools.pageData, { slug: tool.slug });
      const toolLegacyId = page?.tool?.id || id;
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId,
        data: {
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
          tagsPipe: tool.tagsPipe,
          makerHandle: tool.makerHandle,
          status: tool.status,
          editorsPick: tool.editorsPick,
          curated: tool.curated,
        },
        logoUrl: storageLogoUrl,
        editorial: tool.editorial,
        nowMs: NOW,
      });
      console.log(`✓ Convex: Patched ${tool.name}`);
    } else {
      try {
        const createdId = await convex.mutation(api.adminCrud.toolCreate, payload);
        console.log(`✓ Convex: Created ${tool.name} (${tool.slug}) -> _id: ${createdId}`);
      } catch (err: any) {
        console.error(`✗ Convex error creating ${tool.name}:`, err);
        throw err;
      }
    }
  }

  // 3. Dual-write to SQLite (db/custom.db)
  console.log("\n==========================================");
  console.log("Writing tools to SQLite (custom.db)...");
  console.log("==========================================");

  for (const tool of TOOLS) {
    const storageLogoUrl = logoUrlMap.get(tool.slug);
    const existing = await db.tool.findUnique({ where: { slug: tool.slug } });

    if (!existing) {
      const id = "cmucr_" + tool.slug.replace(/[^a-z0-9]/g, "_") + "_" + Math.random().toString(36).substring(2, 9);
      await db.tool.create({
        data: {
          id,
          slug: tool.slug,
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          websiteUrl: tool.websiteUrl,
          categoryId: tool.categoryLegacyId,
          pricingModel: tool.pricingModel,
          startingPrice: tool.startingPrice,
          pricingNote: tool.pricingNote,
          hasApi: tool.hasApi,
          logoEmoji: tool.logoEmoji,
          logoGradient: tool.logoGradient,
          logoUrl: storageLogoUrl,
          tags: tool.tagsPipe,
          makerHandle: tool.makerHandle,
          status: tool.status,
          editorsPick: tool.editorsPick,
          curated: tool.curated,
          claimed: false,
          pinned: 0,
        },
      });
      console.log(`✓ SQLite: Inserted ${tool.name}`);
    } else {
      await db.tool.update({
        where: { slug: tool.slug },
        data: {
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          websiteUrl: tool.websiteUrl,
          categoryId: tool.categoryLegacyId,
          pricingModel: tool.pricingModel,
          startingPrice: tool.startingPrice,
          pricingNote: tool.pricingNote,
          hasApi: tool.hasApi,
          logoEmoji: tool.logoEmoji,
          logoGradient: tool.logoGradient,
          logoUrl: storageLogoUrl,
          tags: tool.tagsPipe,
          makerHandle: tool.makerHandle,
          status: tool.status,
          editorsPick: tool.editorsPick,
          curated: tool.curated,
        },
      });
      console.log(`✓ SQLite: Updated ${tool.name}`);
    }

    // Apply editorial enrichment in SQLite
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
      tool.startingPrice ?? null,
      tool.pricingNote ?? null,
      new Date(),
      new Date(),
      tool.slug
    );
    console.log(`✓ SQLite: Enriched editorial fields for ${tool.name}`);
  }

  // 4. Verify all 10 tools in Convex
  console.log("\n==========================================");
  console.log("Verifying all 10 tools in Convex...");
  console.log("==========================================");

  let allVerified = true;
  for (const tool of TOOLS) {
    const detail = await convex.query(api.tools.detail, { slug: tool.slug });
    if ("error" in detail) {
      console.error(`✗ Verification failed for ${tool.slug}:`, detail.error);
      allVerified = false;
    } else {
      console.log(`✓ ${tool.name} (${tool.slug}) verified!`);
      console.log(`    Category: ${detail.category.name} (${detail.category.slug})`);
      console.log(`    Logo URL: ${detail.logoUrl}`);
      console.log(`    Alternatives: ${detail.alternatives.map((a: any) => a.name).join(", ")}`);
    }
  }

  if (!allVerified) {
    throw new Error("One or more tools failed Convex verification!");
  }

  console.log("\n All 10 tools added and verified successfully!");
}

main()
  .catch((err) => {
    console.error("Execution error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
