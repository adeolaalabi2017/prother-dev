/**
 * Script to ingest Tier-1 essential AI tools into Prother.dev:
 * 1. Inserts LiteLLM, Groq, Qdrant, Langfuse, DeepSeek into Convex & SQLite.
 * 2. Patches authentic logos on Perplexity and n8n in Convex & SQLite.
 *
 * Adheres strictly to AGENTS.md standards:
 * - NO em-dashes or en-dashes in any text or comments.
 * - Authentic brand logos committed to public/logos/<slug>.svg.
 * - Dual-write to Convex and SQLite.
 *
 * Run: bun scripts/ingest-tier1-tools.ts
 */

import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
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

const DEV_PLATFORMS_CAT_ID = "cmucrh2nn0006kji83fbwfgnw";
const CONVERSATIONAL_AI_CAT_ID = "cmucrh2nj0000kji8o4lndfc1";
const NOW = Date.now();

const NEW_TOOLS = [
  {
    id: "cmucr_litellm_" + Math.random().toString(36).substring(2, 9),
    slug: "litellm",
    name: "LiteLLM",
    tagline: "Call 100+ LLM APIs using the OpenAI format with load balancing",
    description:
      "LiteLLM is an open-source IO library and proxy server that standardizes calls to over 100 LLMs using the OpenAI input and output format, complete with load balancing, fallback routing, and spend tracking.",
    websiteUrl: "https://litellm.ai",
    githubUrl: "https://github.com/BerriAI/litellm",
    categoryLegacyId: DEV_PLATFORMS_CAT_ID,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote:
      "Free and open source for the core library. Enterprise proxy features offer managed support and team SLAs.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-sky-500 to-blue-800",
    logoUrl: "/logos/litellm.svg",
    tagsPipe: "proxy|gateway|llm-ops|developer-tools|open-source",
    makerHandle: "@berriai",
    status: "live",
    editorsPick: false,
    curated: true,
    createdAt: NOW,
    editorial: {
      longDescription:
        "LiteLLM acts as a unified translation layer across the fragmented LLM landscape. Instead of rewriting SDK calls when switching between OpenAI, Anthropic Claude, Google Vertex AI, AWS Bedrock, or self-hosted Ollama endpoints, developers use LiteLLM to speak a single OpenAI-compatible protocol.\n\nBeyond basic API normalization, LiteLLM features a high-throughput proxy server equipped with multi-key load balancing, automatic provider fallbacks when rate limits or 500 errors hit, and granular spend tracking with budget caps per user or project. It has become essential plumbing for production AI applications seeking resilience and multi-vendor redundancy without rewriting application logic.",
      useCases: [
        {
          title: "Unified multi-provider fallback",
          body: "Route requests from Anthropic to Bedrock or Azure automatically on rate limit errors.",
        },
        {
          title: "Team budget guardrails",
          body: "Enforce spending caps and track token costs per user, key, or internal department.",
        },
        {
          title: "OpenAI SDK drop-in replacement",
          body: "Switch providers by changing the model parameter without modifying application code.",
        },
      ],
      pros: [
        "Drop-in OpenAI format support for over 100 LLM providers",
        "Native rate limit retry, load balancing, and fallback routing",
        "Detailed cost and latency tracking per API key",
        "Active open-source community with rapid support for new models",
      ],
      cons: [
        "Advanced proxy features require self-hosting or enterprise license",
        "Provider-specific parameters can sometimes lag behind native SDKs",
      ],
      alternatives: ["openrouter", "vllm", "langchain"],
      pricingChecked: true,
    },
  },
  {
    id: "cmucr_groq_" + Math.random().toString(36).substring(2, 9),
    slug: "groq",
    name: "Groq",
    tagline: "Ultra-fast LPU inference engine for real-time generative AI",
    description:
      "Groq builds custom Language Processing Unit (LPU) hardware delivering real-time LLM inference speeds exceeding 300 to 500 tokens per second for frontier open models like Llama 3, Gemma, and Whisper.",
    websiteUrl: "https://groq.com",
    categoryLegacyId: DEV_PLATFORMS_CAT_ID,
    pricingModel: "freemium",
    startingPrice: "Pay-as-you-go",
    pricingNote:
      "Generous free tier with daily token limits. Commercial API starts around $0.05 to $0.79 per million tokens depending on model size.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-orange-500 to-red-800",
    logoUrl: "/logos/groq.svg",
    tagsPipe: "inference|lpu|hardware|speed|api-available|freemium",
    makerHandle: "@groqinc",
    status: "live",
    editorsPick: false,
    curated: true,
    createdAt: NOW,
    editorial: {
      longDescription:
        "Groq delivers conversational speed inference for large language models through its custom-designed Language Processing Unit (LPU) architecture. By ditching standard GPU memory bottlenecks in favor of deterministic on-chip SRAM, Groq achieves speeds that allow open-weight models like Llama 3 and Mixtral to generate responses at 300 to 500+ tokens per second.\n\nThis speed threshold unlocks real-time voice agents, conversational search synthesis, and multi-turn iterative coding loops that feel instantaneous. The GroqCloud API mirrors standard OpenAI formatting, making it trivial to test alongside traditional cloud hosts. While context window sizes and maximum model parameters are constrained by on-chip memory density, for production speed and latency-critical workloads Groq sets the current hardware performance standard.",
      useCases: [
        {
          title: "Real-time interactive voice agents",
          body: "Eliminate audio latency by generating responses at 400+ tokens per second.",
        },
        {
          title: "Iterative agentic code loops",
          body: "Run multi-step validation checks and test suites in seconds rather than minutes.",
        },
        {
          title: "High-speed structured extraction",
          body: "Parse messy PDFs and raw documents into JSON schemas instantaneously.",
        },
      ],
      pros: [
        "Fastest inference speeds in the industry for open-weight models",
        "OpenAI-compatible REST API for easy integration",
        "Generous free tier with instant developer signup",
        "Sub-second time-to-first-token latency",
      ],
      cons: [
        "Only hosts select open-weight models; closed models unavailable",
        "Context windows can be limited compared to specialized long-context GPU clouds",
      ],
      alternatives: ["vllm", "openrouter", "replicate"],
      pricingChecked: true,
    },
  },
  {
    id: "cmucr_qdrant_" + Math.random().toString(36).substring(2, 9),
    slug: "qdrant",
    name: "Qdrant",
    tagline: "High-performance vector database and similarity search engine in Rust",
    description:
      "Qdrant is an open-source vector database built in Rust for high-throughput semantic search and retrieval-augmented generation (RAG), featuring advanced payload filtering, quantization, and hybrid search.",
    websiteUrl: "https://qdrant.tech",
    githubUrl: "https://github.com/qdrant/qdrant",
    categoryLegacyId: DEV_PLATFORMS_CAT_ID,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote:
      "Open source Apache 2.0. Managed Qdrant Cloud includes a free 1GB cluster, with paid production tiers starting at $25 per month.",
    hasApi: true,
    logoEmoji: "🎯",
    logoGradient: "from-red-600 to-rose-900",
    logoUrl: "/logos/qdrant.svg",
    tagsPipe: "vector-database|rag|search|rust|open-source",
    makerHandle: "@qdrant_engine",
    status: "live",
    editorsPick: false,
    curated: true,
    createdAt: NOW,
    editorial: {
      longDescription:
        "Qdrant is a specialized vector similarity search engine and vector database written in Rust. Designed specifically for production retrieval-augmented generation (RAG) and recommendation systems, it provides sub-millisecond nearest neighbor search over millions of high-dimensional embeddings.\n\nUnlike traditional databases with bolted-on vector indexes, Qdrant integrates payload filtering directly into the HNSW graph traversal, preventing search recall degradation when querying with boolean constraints. It supports scalar, product, and binary quantization to dramatically reduce RAM consumption, plus full support for sparse-dense hybrid retrieval (BM25 + embeddings). It runs self-hosted via Docker or on managed Qdrant Cloud with multi-region high availability.",
      useCases: [
        {
          title: "Enterprise RAG pipelines",
          body: "Store document chunks with metadata filtering by user, tenant, and date.",
        },
        {
          title: "Hybrid search",
          body: "Combine keyword precision with semantic vector understanding in a single query.",
        },
        {
          title: "Recommendation engines",
          body: "Match user profiles to items based on multimodal similarity embeddings.",
        },
      ],
      pros: [
        "Written in Rust with exceptional memory safety and query latency",
        "Filter-aware HNSW indexing prevents recall collapse under strict filters",
        "Binary and scalar quantization cut memory requirements by up to 8x",
        "True open-source with Apache 2.0 license",
      ],
      cons: [
        "Requires dedicated cluster sizing and resource planning for large corpora",
        "Steeper operational learning curve than managed serverless key-value stores",
      ],
      alternatives: ["pinecone", "chroma", "weaviate"],
      pricingChecked: true,
    },
  },
  {
    id: "cmucr_langfuse_" + Math.random().toString(36).substring(2, 9),
    slug: "langfuse",
    name: "Langfuse",
    tagline: "Open-source LLM observability, prompt management, and evaluation",
    description:
      "Langfuse is an open-source LLM engineering platform that provides production tracing, prompt versioning, automated evaluations, and token cost analytics for agentic pipelines and generative applications.",
    websiteUrl: "https://langfuse.com",
    githubUrl: "https://github.com/langfuse/langfuse",
    categoryLegacyId: DEV_PLATFORMS_CAT_ID,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote:
      "Self-hosted is free (MIT licensed). Managed Cloud includes 50k free traces per month, with Pro at $59 per month.",
    hasApi: true,
    logoEmoji: "🔍",
    logoGradient: "from-amber-500 to-yellow-800",
    logoUrl: "/logos/langfuse.svg",
    tagsPipe: "observability|tracing|evals|prompts|open-source",
    makerHandle: "@langfuse",
    status: "live",
    editorsPick: false,
    curated: true,
    createdAt: NOW,
    editorial: {
      longDescription:
        "Langfuse is an open-source observability and analytics platform purpose-built for LLM applications. It instruments the entire lifecycle of generative AI features, capturing nested traces of agent tool calls, retrieval steps, model latencies, and token consumption.\n\nThe platform integrates prompt management with visual version history and SDK-driven dynamic parameter injection, eliminating the risk of unversioned prompt edits in production. Its evaluation framework supports human-in-the-loop annotation, user feedback collection (thumbs up/down), and model-based scoring pipelines. With native integrations for LangChain, LlamaIndex, LiteLLM, and raw OpenAI SDKs, Langfuse provides teams with visibility into where agent loops fail, costs spike, or hallucinated responses occur.",
      useCases: [
        {
          title: "Agent trajectory debugging",
          body: "Trace nested multi-step tool calls and inspect exact input and output payloads.",
        },
        {
          title: "Prompt version control",
          body: "Update and roll back prompts via web UI without redeploying backend code.",
        },
        {
          title: "Cost and latency attribution",
          body: "Track spend per model, feature, and end-user organization.",
        },
      ],
      pros: [
        "Permissive MIT license with complete self-hosting Docker compose support",
        "Low-latency asynchronous telemetry that never blocks user requests",
        "Comprehensive SDKs for Python, TypeScript, and popular AI frameworks",
        "Built-in prompt management and scoring dashboards",
      ],
      cons: [
        "Self-hosting requires Postgres, ClickHouse, and worker infrastructure",
        "Setup requires deliberate telemetry instrumentation across your codebase",
      ],
      alternatives: ["langchain", "datadog"],
      pricingChecked: true,
    },
  },
  {
    id: "cmucr_deepseek_" + Math.random().toString(36).substring(2, 9),
    slug: "deepseek",
    name: "DeepSeek",
    tagline: "Open frontier reasoning and coding models with unmatched cost efficiency",
    description:
      "DeepSeek develops frontier open-weights models including DeepSeek-V3 and DeepSeek-R1, offering state-of-the-art coding, mathematics, and chain-of-thought reasoning at a fraction of incumbent API costs.",
    websiteUrl: "https://deepseek.com",
    categoryLegacyId: CONVERSATIONAL_AI_CAT_ID,
    pricingModel: "freemium",
    startingPrice: "Free / API usage",
    pricingNote:
      "Free web chat interface. Commercial API is famously cost-efficient at roughly $0.14 to $0.55 per million tokens with prompt caching.",
    hasApi: true,
    logoEmoji: "🐳",
    logoGradient: "from-blue-600 to-indigo-900",
    logoUrl: "/logos/deepseek.svg",
    tagsPipe: "ai-models|reasoning|coding|open-weights|api-available",
    makerHandle: "@deepseek_ai",
    status: "live",
    editorsPick: true,
    curated: true,
    createdAt: NOW,
    editorial: {
      longDescription:
        "DeepSeek is an artificial intelligence research company known for disrupting the frontier model landscape with DeepSeek-V3 and DeepSeek-R1. Built using Multi-head Latent Attention (MLA) and DeepSeekMoE architectures, their models match or exceed proprietary frontier models in software engineering, mathematics, and multi-step reasoning while requiring vastly lower training and inference compute.\n\nDeepSeek-R1 employs large-scale reinforcement learning to develop natural chain-of-thought reasoning without relying on human demonstration data for intermediate steps. Both models are released with open weights under permissive licenses, allowing local deployment via Ollama and vLLM or scalable cloud access via the official DeepSeek API. The API features aggressive prompt caching, making it one of the most economical engines available for complex coding agents and automated research.",
      useCases: [
        {
          title: "Complex code refactoring and architecture design",
          body: "Generate full-stack features and refactor legacy code using DeepSeek-V3 and R1.",
        },
        {
          title: "Deep mathematical and logic problem-solving",
          body: "Execute complex algorithmic tasks with transparent chain-of-thought verification.",
        },
        {
          title: "High-volume agentic backends",
          body: "Power autonomous coding agents with frontier reasoning at near-commodity token costs.",
        },
      ],
      pros: [
        "Benchmark-leading reasoning and programming capabilities rivaling proprietary models",
        "Open weights available for local deployment and private enterprise hosting",
        "Extraordinarily low API pricing with generous prompt caching discounts",
        "Permissive open licensing for commercial and research applications",
      ],
      cons: [
        "Official API endpoints experience periodic rate limiting during global traffic surges",
        "Full 671B MoE parameter weights require multi-GPU setups or quantization for local hosting",
      ],
      alternatives: ["chatgpt", "claude", "ollama"],
      pricingChecked: true,
    },
  },
];

// Check all new tools for forbidden punctuation (em-dash, en-dash)
for (const tool of NEW_TOOLS) {
  const texts = [
    tool.description,
    tool.tagline,
    tool.editorial.longDescription,
    ...tool.editorial.useCases.flatMap((u) => [u.title, u.body]),
    ...tool.editorial.pros,
    ...tool.editorial.cons,
    tool.pricingNote,
  ];
  for (const t of texts) {
    if (/[\u2014\u2013]/.test(t ?? "")) {
      console.error(`✗ VIOLATION: em/en-dash found in ${tool.slug}: "${t}"`);
      process.exit(1);
    }
  }
}

async function main() {
  console.log("Connecting to Convex client...");
  const convex = createServerConvexClient();
  if (!convex) {
    throw new Error("Could not create Convex client. Check NEXT_PUBLIC_CONVEX_URL.");
  }

  // 1. Ingest New Tools into Convex
  console.log("\n--- Ingesting New Tools into Convex ---");
  for (const tool of NEW_TOOLS) {
    try {
      const { githubUrl, ...convexTool } = tool;
      const id = await convex.mutation(api.adminCrud.toolCreate, convexTool);
      console.log(`✓ Convex: Added ${tool.name} (${tool.slug}) -> ID: ${id}`);
    } catch (err: any) {
      if (err.message?.includes("slug_taken")) {
        console.log(`ℹ Convex: ${tool.name} (${tool.slug}) already exists. Patching logo and details...`);
        const page = await convex.query(api.tools.pageData, { slug: tool.slug });
        if (page?.tool?.id) {
          await convex.mutation(api.adminCrud.toolPatch, {
            toolLegacyId: page.tool.id,
            data: { status: "live" },
            logoUrl: tool.logoUrl,
            nowMs: Date.now(),
          });
          console.log(`✓ Convex: Patched ${tool.name} logo to ${tool.logoUrl}`);
        }
      } else {
        console.error(`✗ Convex error for ${tool.name}:`, err);
        throw err;
      }
    }
  }

  // 2. Patch Existing Tools (Perplexity and n8n) in Convex
  console.log("\n--- Patching Existing Tools in Convex ---");
  const EXISTING_PATCHES: Record<string, string> = {
    perplexity: "/logos/perplexity.svg",
    n8n: "/logos/n8n.svg",
  };

  for (const [slug, logoUrl] of Object.entries(EXISTING_PATCHES)) {
    try {
      const page = await convex.query(api.tools.pageData, { slug });
      if (page?.tool?.id) {
        await convex.mutation(api.adminCrud.toolPatch, {
          toolLegacyId: page.tool.id,
          data: {},
          logoUrl,
          nowMs: Date.now(),
        });
        console.log(`✓ Convex: Patched ${slug} logoUrl -> ${logoUrl}`);
      } else {
        console.warn(`! Convex: Tool ${slug} not found`);
      }
    } catch (err) {
      console.error(`✗ Convex patch error for ${slug}:`, err);
    }
  }

  // 3. Ingest New Tools into SQLite
  console.log("\n--- Ingesting New Tools into SQLite (db/custom.db) ---");
  for (const tool of NEW_TOOLS) {
    try {
      const existing = await db.tool.findUnique({ where: { slug: tool.slug } });
      if (!existing) {
        await db.tool.create({
          data: {
            id: tool.id,
            slug: tool.slug,
            name: tool.name,
            tagline: tool.tagline,
            description: tool.description,
            websiteUrl: tool.websiteUrl,
            githubUrl: tool.githubUrl ?? null,
            categoryId: tool.categoryLegacyId,
            pricingModel: tool.pricingModel,
            startingPrice: tool.startingPrice,
            pricingNote: tool.pricingNote,
            hasApi: tool.hasApi,
            logoEmoji: tool.logoEmoji,
            logoGradient: tool.logoGradient,
            logoUrl: tool.logoUrl,
            tags: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            status: tool.status,
            editorsPick: tool.editorsPick,
            curated: tool.curated,
            claimed: false,
            pinned: 0,
          },
        });
        console.log(`✓ SQLite: Created tool ${tool.name} (${tool.slug})`);
      } else {
        await db.tool.update({
          where: { slug: tool.slug },
          data: {
            logoUrl: tool.logoUrl,
            status: "live",
          },
        });
        console.log(`✓ SQLite: Updated tool ${tool.name} (${tool.slug})`);
      }

      // Apply editorial enrichment in SQLite
      await db.$executeRawUnsafe(
        `UPDATE Tool SET
           longDescription = ?,
           useCases = ?,
           pros = ?,
           cons = ?,
           alternatives = ?,
           pricingCheckedAt = ?
         WHERE slug = ?`,
        tool.editorial.longDescription,
        JSON.stringify(tool.editorial.useCases),
        JSON.stringify(tool.editorial.pros),
        JSON.stringify(tool.editorial.cons),
        tool.editorial.alternatives.join(","),
        NOW,
        tool.slug,
      );
      console.log(`✓ SQLite: Enriched editorial specs for ${tool.name}`);
    } catch (err) {
      console.error(`✗ SQLite error for ${tool.name}:`, err);
      throw err;
    }
  }

  // 4. Patch Existing Tools in SQLite
  console.log("\n--- Patching Existing Tools in SQLite ---");
  for (const [slug, logoUrl] of Object.entries(EXISTING_PATCHES)) {
    try {
      await db.tool.update({
        where: { slug },
        data: { logoUrl },
      });
      console.log(`✓ SQLite: Patched ${slug} logoUrl -> ${logoUrl}`);
    } catch (err) {
      console.error(`✗ SQLite error patching ${slug}:`, err);
    }
  }

  console.log("\n🎉 Tier-1 Tools Ingestion & Logo Synchronization complete!");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
