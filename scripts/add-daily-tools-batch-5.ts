/**
 * Batch 5 Ingestion: 8 New Industry-Standard AI Tools
 * 1. OpenHands (openhands) - dev-platforms
 * 2. Firecrawl (firecrawl) - automation
 * 3. ComfyUI (comfyui) - generative-content
 * 4. Continue (continue) - dev-platforms
 * 5. CrewAI (crewai) - automation
 * 6. Mem0 (mem0) - dev-platforms
 * 7. Dify (dify) - dev-platforms
 * 8. LlamaIndex (llamaindex) - data-analytics
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "node:fs";
import * as path from "node:path";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://befitting-moose-925.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);
const NOW = Date.now();

export const CATEGORY_MAP = {
  CONVERSATIONAL_AI: "cmucrh2nj0000kji8o4lndfc1",
  GENERATIVE_CONTENT: "cmucrh2nk0001kji8qk3jr9yr",
  NLP_TEXT: "cmucrh2nl0002kji8959jrucs",
  COMPUTER_VISION: "cmucrh2nl0003kji8cdy3lonp",
  DATA_ANALYTICS: "cmucrh2nm0004kji8j0rbkt76",
  AUTOMATION: "cmucrh2nm0005kji8p4nuxs89",
  DEV_PLATFORMS: "cmucrh2nn0006kji83fbwfgnw",
  AI_MODELS: "cmucrh2nz0007kji8aimodels0",
};

export const D1_CATEGORY_MAP = {
  DEV_PLATFORMS: "k175a9fam1rt3wjxfz0c2eyth18f2adb",
  AUTOMATION: "k1735pwyqnwk3s653tfkhtbn7n8f2wqe",
  GENERATIVE_CONTENT: "k175btb2w538a03m53m4e9yaj18f3frz",
  DATA_ANALYTICS: "k171yjq0df9czt3qctx2dy11k98f3n5m",
  AI_MODELS: "k17epqr8azy8tc0433j64ysjax8fbwze",
  CONVERSATIONAL_AI: "k17bmd8382gcx6g9qdmer543498f2cjh",
  NLP_TEXT: "k1778berf3zczh9d10k5s2mezh8f2xcy",
  COMPUTER_VISION: "k17f4cy63g6fy0gz9a8qskgy7s8f3pz3",
};

export function checkInvariants(obj: any, pathStr = "") {
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

export const TOOLS_BATCH_5 = [
  // 1. OpenHands
  {
    id: "cmucrh2batch5openhands000001",
    slug: "openhands",
    name: "OpenHands",
    tagline: "Open-source autonomous software engineering agent for complex codebases",
    description: "OpenHands is an open-source autonomous software development agent that plans architectures, edits code across repositories, runs bash commands inside isolated Docker sandboxes, and resolves real-world GitHub issues end-to-end.",
    websiteUrl: "https://openhands.ai",
    docsUrl: "https://docs.all-hands.dev",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Completely open-source under MIT license. Self-hostable with any LLM; optional All-Hands Cloud sandbox.",
    hasApi: true,
    logoEmoji: "🙌",
    logoGradient: "from-blue-600 to-cyan-500",
    logoUrl: "/logos/openhands.svg",
    tagsPipe: "ai-coding|autonomous-agent|developer-tools|software-engineering|docker-sandbox|github-resolver",
    makerHandle: "@openhands",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "OpenHands (formerly OpenDevin) is an open-source software engineering agent designed to tackle end-to-end software development workflows autonomously. By executing within isolated Docker runtime containers, OpenHands inspects file trees, executes unit tests, searches documentation, and iterates on bug fixes until acceptance checks pass.\n\nBuilt for community transparency and flexibility, OpenHands supports major commercial models as well as local open-weights LLMs via LiteLLM. Developers can run OpenHands through an interactive web UI, command-line interface, or headless CI/CD workflow to resolve GitHub issues automatically.",
      useCases: [
        {
          title: "Autonomous GitHub issue resolution",
          body: "Direct OpenHands to reproduce reported bugs, modify source files, run the test suite, and open verified pull requests.",
        },
        {
          title: "Large-scale codebase refactoring",
          body: "Upgrade library dependencies, migrate deprecated APIs, and verify backward compatibility across multi-repo projects.",
        },
        {
          title: "Isolated exploratory prototyping",
          body: "Scaffold full-stack web applications and microservices in sandbox environments from natural language technical specifications.",
        },
      ],
      pros: [
        "100% open-source under MIT license with active developer community",
        "Safe code execution in isolated Docker containers prevents host contamination",
        "Agnostic LLM backend supporting both local models and frontier APIs",
      ],
      cons: [
        "Requires local Docker installation and significant compute resources for self-hosting",
        "Can require human guidance on ambiguous or undertested software requirements",
      ],
    },
  },

  // 2. Firecrawl
  {
    id: "cmucrh2batch5firecrawl000002",
    slug: "firecrawl",
    name: "Firecrawl",
    tagline: "Turn entire websites and web applications into LLM-ready markdown",
    description: "Firecrawl is an API and crawling engine engineered specifically for AI agents and RAG pipelines, bypassing bot protections and converting dynamic JavaScript pages into clean, structured Markdown or JSON.",
    websiteUrl: "https://www.firecrawl.dev",
    docsUrl: "https://docs.firecrawl.dev",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free tier includes 500 scrap credits. Open-source core is self-hostable; Cloud plans start at $16 per month.",
    hasApi: true,
    logoEmoji: "🔥",
    logoGradient: "from-orange-600 to-amber-500",
    logoUrl: "/logos/firecrawl.svg",
    tagsPipe: "web-scraping|crawler|markdown|llm-ingestion|rag|agent-tools",
    makerHandle: "@firecrawl",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Firecrawl is a purpose-built web scraping and crawling platform engineered to solve the data ingestion bottleneck for AI models and LLM agents. Traditional web scrapers output noisy, bloated HTML with scripts, trackers, and navigation clutter; Firecrawl automatically renders dynamic Single Page Applications (SPAs) and distills content into pristine Markdown.\n\nWith both single-URL scrape and full-domain recursive crawl endpoints, Firecrawl maps subpages, extracts clean structured metadata, and adheres to robots.txt rules. Its enterprise proxy rotation handles Cloudflare Turnstile and anti-bot obstacles reliably.",
      useCases: [
        {
          title: "High-accuracy RAG knowledge base ingestion",
          body: "Crawl entire product documentation sites and convert technical guides into clean semantic markdown chunks for vector search.",
        },
        {
          title: "Real-time web browsing for autonomous agents",
          body: "Supply AI agents with clean, token-efficient web content without consuming excessive LLM context windows on raw HTML.",
        },
        {
          title: "Automated competitor intelligence extraction",
          body: "Extract structured pricing tables, changelog entries, and product feature specifications across competitive websites.",
        },
      ],
      pros: [
        "Direct-to-markdown output eliminates thousands of wasted tokens compared to raw HTML",
        "Handles JavaScript-heavy Single Page Applications and complex rendering out of the box",
        "Open-source core available for local Docker deployment or self-hosted enterprise clouds",
      ],
      cons: [
        "Crawl credits on hosted cloud tiers can deplete quickly on multi-thousand-page domains",
        "Deep interactive session states requiring multi-step form submissions require custom scripts",
      ],
    },
  },

  // 3. ComfyUI
  {
    id: "cmucrh2batch5comfyui000003",
    slug: "comfyui",
    name: "ComfyUI",
    tagline: "Modular node-based visual pipeline for diffusion models and generative media",
    description: "ComfyUI is the industry-standard node graph interface and inference backend for generative AI models, enabling granular visual programming of latent spaces, ControlNets, IP-Adapters, and video diffusion workflows.",
    websiteUrl: "https://www.comfy.org",
    docsUrl: "https://docs.comfy.org",
    categoryLegacyId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Completely free open-source under GPL-3.0 license. Free desktop and server execution.",
    hasApi: true,
    logoEmoji: "🧩",
    logoGradient: "from-zinc-800 to-neutral-950",
    logoUrl: "/logos/comfyui.svg",
    tagsPipe: "diffusion-models|image-generation|video-generation|node-graph|flux|stable-diffusion",
    makerHandle: "@comfyanonymous",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "ComfyUI is a modular, node-based graphical user interface and backend execution engine engineered for diffusion models including Stable Diffusion, SDXL, and Flux. By breaking image and video synthesis into discrete, interconnected functional blocks (encoders, samplers, VAEs, conditioning nodes, and model weights), ComfyUI affords creators total deterministic control over generation pipelines.\n\nIts memory-efficient execution model loads only necessary model weights into VRAM on demand, enabling high-resolution generation even on consumer-grade GPUs. ComfyUI workflows can be saved directly inside PNG metadata, making advanced pipelines effortlessly shareable and reproducible.",
      useCases: [
        {
          title: "Complex multi-stage generative image synthesis",
          body: "Chain base models, LoRAs, ControlNets, and inpainting models into unified high-resolution generation graphs.",
        },
        {
          title: "Consistent character and cinematic video pipelines",
          body: "Orchestrate AnimateDiff, Wan2.1, and frame interpolation models for consistent temporal storytelling.",
        },
        {
          title: "Headless cloud API generation workflows",
          body: "Execute complex ComfyUI workflows programmatically over WebSocket and REST APIs in production applications.",
        },
      ],
      pros: [
        "Exceptional VRAM efficiency through smart model offloading and caching mechanisms",
        "Total pipeline transparency with fully shareable, modular JSON/PNG graph workflows",
        "Vibrant open-source ecosystem with thousands of custom community nodes and model loaders",
      ],
      cons: [
        "Steep learning curve compared to simple prompt-box generators",
        "Managing conflicting custom node Python dependencies can require troubleshooting",
      ],
    },
  },

  // 4. Continue
  {
    id: "cmucrh2batch5continue000004",
    slug: "continue",
    name: "Continue",
    tagline: "Open-source AI code assistant for VS Code and JetBrains",
    description: "Continue is the leading open-source IDE companion extension connecting any foundation model directly into VS Code and JetBrains IDEs for inline code generation, multi-file chat, and custom context providers.",
    websiteUrl: "https://continue.dev",
    docsUrl: "https://docs.continue.dev",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Free and open-source under Apache-2.0. Connect your own API keys or local Ollama instances.",
    hasApi: true,
    logoEmoji: "⏩",
    logoGradient: "from-zinc-900 to-stone-900",
    logoUrl: "/logos/continue.svg",
    tagsPipe: "ai-coding|vs-code|jetbrains|ide-extension|open-source|developer-tools",
    makerHandle: "@continuedev",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Continue is an open-source AI code assistant extension designed to give software developers total ownership over their coding tools. Supporting both VS Code and JetBrains, Continue integrates chat, codebase search, refactoring shortcuts, and tab autocompletions directly into the developer's native editor without forcing an IDE migration.\n\nDevelopers can configure Continue to use local models via Ollama or LM Studio for complete offline privacy, or connect enterprise cloud endpoints from Anthropic, OpenAI, or custom internal inference gateways. Its custom context providers allow developers to tag documentation, git diffs, terminal outputs, and database schemas seamlessly.",
      useCases: [
        {
          title: "Privacy-first local code completion and chat",
          body: "Run inline completions and codebase conversations entirely on local workstation hardware using Ollama or vLLM.",
        },
        {
          title: "Context-aware multi-file refactoring",
          body: "Select code sections across modules and prompt Continue to implement architectural changes or test suites.",
        },
        {
          title: "Custom internal developer platform integration",
          body: "Build custom slash commands and context providers connecting internal API documentation and issue trackers.",
        },
      ],
      pros: [
        "Zero IDE lock-in: works seamlessly inside standard VS Code and JetBrains installations",
        "Complete freedom of model choice across local weights and commercial APIs",
        "Open-source Apache-2.0 codebase with no telemetry lock-in or forced account creation",
      ],
      cons: [
        "Inline autocompletions require tuning model temperature and latency parameters for optimal speed",
        "Multi-step autonomous agent capabilities are less automated than dedicated agent IDEs",
      ],
    },
  },

  // 5. CrewAI
  {
    id: "cmucrh2batch5crewai000005",
    slug: "crewai",
    name: "CrewAI",
    tagline: "Production multi-agent orchestration framework for autonomous role-playing teams",
    description: "CrewAI is a Python framework for orchestrating role-playing autonomous AI agents, enabling structured multi-agent collaboration, delegation, and execution on complex enterprise workflows.",
    websiteUrl: "https://crewai.com",
    docsUrl: "https://docs.crewai.com",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source under MIT license. Optional CrewAI Enterprise and Cloud orchestration platform.",
    hasApi: true,
    logoEmoji: "👥",
    logoGradient: "from-red-600 to-rose-900",
    logoUrl: "/logos/crewai.svg",
    tagsPipe: "multi-agent|orchestration|agentic-workflows|autonomous-teams|python-framework",
    makerHandle: "@crewai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "CrewAI is an agent orchestration framework built on the philosophy of specialized role assignment. Instead of relying on a single monolithic prompt, CrewAI structures complex work by creating distinct autonomous agents with specific roles, goals, backstories, and curated toolkits that collaborate sequentially or hierarchically.\n\nCrewAI features built-in support for memory, inter-agent delegation, human-in-the-loop validation, and asynchronous execution. Its modular architecture lets developers plug in any LLM backend and seamlessly connect Python tools, LangChain toolkits, and custom enterprise databases.",
      useCases: [
        {
          title: "Automated market research and report generation",
          body: "Deploy a researcher agent to search industry trends, an analyst agent to synthesize data, and an editor agent to draft polished reports.",
        },
        {
          title: "Complex customer support triage and resolution",
          body: "Coordinate agents specialized in account lookups, technical diagnosis, and empathetic customer communication.",
        },
        {
          title: "Automated software QA and code auditing",
          body: "Pair a security auditing agent with a code reviewer and documentation writer to evaluate new pull requests.",
        },
      ],
      pros: [
        "High-level, intuitive mental model based on real-world team roles and responsibilities",
        "Built-in short-term, long-term, and entity memory systems out of the box",
        "Broad support for multi-model configurations allowing small fast models for triage and frontier models for reasoning",
      ],
      cons: [
        "Can lead to high token consumption if inter-agent delegation loops are not properly bounded",
        "Complex cyclic decision graphs can require careful state guardrails to prevent stalls",
      ],
    },
  },

  // 6. Mem0
  {
    id: "cmucrh2batch5mem0000006",
    slug: "mem0",
    name: "Mem0",
    tagline: "Universal memory layer for personalized AI agents and assistants",
    description: "Mem0 provides a persistent, adaptive memory layer for LLMs and agent platforms, continuously extracting, organizing, and retrieving user context and preferences across sessions.",
    websiteUrl: "https://mem0.ai",
    docsUrl: "https://docs.mem0.ai",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Open-source core under Apache-2.0. Managed Cloud API offers a free tier with pay-as-you-go scaling.",
    hasApi: true,
    logoEmoji: "🧠",
    logoGradient: "from-purple-600 to-indigo-900",
    logoUrl: "/logos/mem0.svg",
    tagsPipe: "agent-memory|long-term-memory|personalization|llm-infrastructure|context-engineering",
    makerHandle: "@mem0",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Mem0 (The Memory Layer for AI) solves one of the most frustrating limitations of modern conversational AI: catastrophic forgetting across interactions. Rather than re-injecting entire chat transcripts into prompt windows, Mem0 dynamically analyzes conversations to extract key facts, user preferences, relationships, and evolving instructions.\n\nMem0 maintains structured entity graphs alongside semantic vector indexes, allowing AI assistants, customer support agents, and coding bots to recall relevant user context with low token latency. It supports self-hosted local setups as well as managed cloud deployments with fine-grained privacy controls.",
      useCases: [
        {
          title: "Personalized AI executive assistants",
          body: "Remember user scheduling preferences, communication tone, key colleagues, and project priorities over months of interaction.",
        },
        {
          title: "Long-horizon customer service continuity",
          body: "Provide support agents with immediate access to a customer's historical issues, hardware setup, and unresolved tickets.",
        },
        {
          title: "Adaptive developer assistant context",
          body: "Retain project conventions, preferred libraries, and architectural decisions across independent coding sessions.",
        },
      ],
      pros: [
        "Reduces token costs and latency by recalling atomic facts rather than bloated conversation logs",
        "Combines semantic similarity with structured entity graphs for precise relationship mapping",
        "Drop-in SDK compatibility with OpenAI, LangChain, LlamaIndex, and CrewAI",
      ],
      cons: [
        "Requires background extraction calls that add slight asynchronous processing overhead",
        "Complex domain taxonomies may need custom prompt fine-tuning for memory extraction filters",
      ],
    },
  },

  // 7. Dify
  {
    id: "cmucrh2batch5dify0000007",
    slug: "dify",
    name: "Dify",
    tagline: "Open-source visual LLM application development platform and orchestrator",
    description: "Dify combines AI workflow canvas design, enterprise RAG engines, prompt playgrounds, and agent capabilities into a unified self-hosted platform with production-grade APIs.",
    websiteUrl: "https://dify.ai",
    docsUrl: "https://docs.dify.ai",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Open-source under Apache-2.0. Managed Cloud service includes a generous free sandbox.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-blue-700 to-indigo-950",
    logoUrl: "/logos/dify.svg",
    tagsPipe: "llm-platform|visual-orchestration|rag|agent-builder|open-source|api-first",
    makerHandle: "@dify",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Dify is an open-source LLM application development platform engineered to bridge visual workflow composition with robust software engineering practices. Offering an intuitive drag-and-drop node canvas, Dify lets teams design complex agentic workflows, multi-step RAG pipelines, and conversational web applications with zero boilerplates.\n\nEvery visual application built in Dify is instantly accessible via authenticated REST APIs, enabling backend engineers to embed AI pipelines into existing systems effortlessly. Dify includes built-in document parsing, semantic vector database management, model performance analytics, and role-based access control.",
      useCases: [
        {
          title: "Enterprise knowledge base chatbots and RAG portals",
          body: "Upload proprietary PDF, Notion, and Word documents to build production search bots with citations and guardrails.",
        },
        {
          title: "Visual agent workflow automation",
          body: "Chain web search, custom HTTP requests, database queries, and conditional logic into reliable business automations.",
        },
        {
          title: "Backend AI feature prototyping and API serving",
          body: "Empower product managers to iterate on prompt logic while developers consume stable, versioned REST endpoints.",
        },
      ],
      pros: [
        "Comprehensive all-in-one platform unifying prompt engineering, RAG, workflows, and analytics",
        "Instant API-as-a-Service generation turns visual workflows into consumable REST APIs",
        "Self-hostable via Docker Compose with enterprise data sovereignty compliance",
      ],
      cons: [
        "Full local self-hosted stack requires significant container resources (Postgres, Redis, Weaviate/Qdrant)",
        "Extremely complex custom Python code nodes may require external microservice hooks",
      ],
    },
  },

  // 8. LlamaIndex
  {
    id: "cmucrh2batch5llamaindex000008",
    slug: "llamaindex",
    name: "LlamaIndex",
    tagline: "Context engineering and data framework for LLMs and agentic RAG",
    description: "LlamaIndex is the data framework for connecting private datasets and custom APIs to large language models, providing data connectors for over 160 formats, advanced query engines, and agentic retrieval strategies.",
    websiteUrl: "https://www.llamaindex.ai",
    docsUrl: "https://docs.llamaindex.ai",
    categoryLegacyId: CATEGORY_MAP.DATA_ANALYTICS,
    d1CategoryId: D1_CATEGORY_MAP.DATA_ANALYTICS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Core Python and TypeScript libraries are open-source under MIT license. Enterprise LlamaCloud service.",
    hasApi: true,
    logoEmoji: "🦙",
    logoGradient: "from-fuchsia-600 to-indigo-900",
    logoUrl: "/logos/llamaindex.svg",
    tagsPipe: "rag|data-framework|vector-index|knowledge-graphs|context-engineering|python-library",
    makerHandle: "@llamaindex",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "LlamaIndex is the premier data framework designed to orchestrate context augmentation for large language models. While LLMs excel at reasoning, they lack access to private enterprise data; LlamaIndex bridges this gap through robust ingestion pipelines, chunking algorithms, metadata enrichment, and advanced retrieval engines.\n\nSupporting both Python and TypeScript, LlamaIndex offers data loaders for over 160 data sources (SQL, PDF, Slack, Notion, GitHub, Google Drive). Its query architecture ranges from simple semantic search to multi-document agentic reasoning, knowledge graph indexing, and auto-merging hierarchical retrievers.",
      useCases: [
        {
          title: "Advanced multi-document agentic RAG systems",
          body: "Perform complex queries across hundreds of financial reports, legal filings, and technical specifications with accurate citations.",
        },
        {
          title: "Hybrid knowledge graph and vector retrieval",
          body: "Combine vector embeddings with structured property graphs to resolve complex relational queries across unstructured text.",
        },
        {
          title: "Structured data extraction and tabular query engines",
          body: "Synthesize natural language questions into accurate SQL queries and extract validated Pydantic models from unstructured documents.",
        },
      ],
      pros: [
        "Unrivaled ecosystem of data connectors and retrieval algorithms for complex enterprise data",
        "Deep support for advanced RAG techniques including reranking, recursive retrieval, and query transformations",
        "Available in both native Python and TypeScript for full-stack and edge environments",
      ],
      cons: [
        "Extensive API surface area can feel overwhelming for beginners building basic chatbots",
        "Frequent library updates require keeping package dependencies pinned in production",
      ],
    },
  },
];

async function main() {
  console.log("=== Checking Invariants on Batch 5 Tools ===");
  checkInvariants(TOOLS_BATCH_5);
  console.log("✓ Invariants passed: Zero em-dashes and zero en-dashes found.");

  console.log("\n=== Checking Logo Files on Disk ===");
  for (const tool of TOOLS_BATCH_5) {
    const filePath = path.join(process.cwd(), "public", tool.logoUrl.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing logo file on disk: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    console.log(`✓ Verified ${tool.slug} logo exists (${stat.size} bytes) -> ${tool.logoUrl}`);
  }

  console.log("\n=== Seeding Batch 5 Tools into Convex ===");
  console.log(`Using Convex URL: ${CONVEX_URL}`);

  // Fetch current tools in Convex to avoid double-insertion
  for (const tool of TOOLS_BATCH_5) {
    let existing: any = null;
    try {
      const page = await convex.query(api.tools.pageData, { slug: tool.slug });
      if ("tool" in page && page.tool) {
        existing = page.tool;
      }
    } catch {
      // Not existing
    }

    if (existing) {
      console.log(`Tool ${tool.slug} already exists in Convex (ID: ${existing.legacyId || existing._id}), updating metadata...`);
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: existing.legacyId || existing._id,
        logoUrl: tool.logoUrl,
        data: {
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          websiteUrl: tool.websiteUrl,
          docsUrl: tool.docsUrl,
          pricingModel: tool.pricingModel,
          startingPrice: tool.startingPrice,
          pricingNote: tool.pricingNote,
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
      console.log(`✓ Updated ${tool.name} in Convex`);
    } else {
      console.log(`Creating tool ${tool.slug}...`);
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
      console.log(`✓ Created ${tool.name} (ID: ${res.id})`);

      if (tool.docsUrl) {
        await convex.mutation(api.adminCrud.toolPatch, {
          toolLegacyId: res.id,
          data: { docsUrl: tool.docsUrl },
          nowMs: NOW,
        });
      }
    }
  }

  console.log("\n=== Verifying All 8 Tools in Convex ===");
  for (const tool of TOOLS_BATCH_5) {
    const res = await convex.query(api.tools.pageData, { slug: tool.slug });
    if ("error" in res) {
      throw new Error(`Verification failed for ${tool.slug}: ${res.error}`);
    }
    console.log(`✓ Verified ${res.tool.name} [${res.tool.slug}]:`);
    console.log(`    Category: ${res.tool.category.name} (${res.tool.category.slug})`);
    console.log(`    Pricing: ${res.tool.pricingModel} (${res.tool.startingPrice})`);
    console.log(`    Logo: ${res.logoUrl}`);
    console.log(`    Tagline: ${res.tool.tagline}`);
  }

  console.log("\n🎉 All 8 tools seeded and verified successfully in Convex!");
}

if (process.argv[1] && process.argv[1].endsWith("add-daily-tools-batch-5.ts")) {
  main().catch((err) => {
    console.error("Batch 5 ingestion failed:", err);
    process.exit(1);
  });
}
