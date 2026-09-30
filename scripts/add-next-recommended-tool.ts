/**
 * Intake pipeline script for Prother.dev.
 * Ingests the next unadded tool from the curated recommendation backlog.
 * Writes to both Convex (primary cloud backend) and SQLite (db/custom.db).
 * Ensures no duplicate tools exist and performs mutual alternative mapping.
 *
 * Usage: bun scripts/add-next-recommended-tool.ts
 */
import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const dbPath = path.resolve(process.cwd(), "db/custom.db");
const dbUrl = `file:${dbPath}`;

const db = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const CATEGORIES = {
  DEV_PLATFORMS: "cmucrh2nn0006kji83fbwfgnw",
  GENERATIVE_CONTENT: "cmucrh2nk0001kji8qk3jr9yr",
  AUTOMATION: "cmucrh2nm0005kji8p4nuxs89",
  CONVERSATIONAL_AI: "cmucrh2nj0000kji8o4lndfc1",
  NLP_TEXT: "cmucrh2nl0002kji8959jrucs",
  COMPUTER_VISION: "cmucrh2nl0003kji8cdy3lonp",
  DATA_ANALYTICS: "cmucrh2nm0004kji8j0rbkt76",
};

interface ToolSpec {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  categoryLegacyId: string;
  pricingModel: string; // free | freemium | paid | open_source
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

const BACKLOG: ToolSpec[] = [
  // ── Category 1: Developer Frameworks & Infrastructure ──
  {
    slug: "aider",
    name: "Aider",
    tagline: "Terminal-based AI pair programming in your git repository",
    description:
      "Aider is a command-line AI pair programming tool that edits code in your local git repository. It creates clear git commits for every change, works with Claude 3.5 Sonnet, GPT-4o, and local LLMs, and handles multi-file editing.",
    websiteUrl: "https://aider.chat",
    githubUrl: "https://github.com/paul-gauthier/aider",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "$0 (BYOK)",
    pricingNote: "Free open-source CLI under MIT license. You bring your own API keys for LLM providers.",
    hasApi: true,
    logoEmoji: "🤖",
    logoGradient: "from-emerald-600 to-teal-800",
    tagsPipe: "coding|cli|developer-tools|open-source|git",
    makerHandle: "@paul-gauthier",
    editorial: {
      longDescription:
        "Aider is an open-source command-line AI pair programmer that integrates directly with git repositories. It allows developers to request code changes, bug fixes, or refactors using natural language from the terminal. Aider automatically analyzes the repository structure, edits files across your project, and commits each logical change with detailed git commit messages.\n\nIt supports top-tier models including Claude 3.5 Sonnet, DeepSeek-Coder, and GPT-4o, as well as local open-weights models served via Ollama or vLLM. Because Aider works natively with git, every AI-generated change can be reviewed, diffed, or reverted using standard version control commands.",
      useCases: [
        {
          title: "Terminal-native multi-file code editing",
          body: "Prompt Aider in your terminal to implement features or fix bugs across multiple repository files simultaneously.",
        },
        {
          title: "Automated git commit generation",
          body: "Every completed change is automatically committed with descriptive commit messages matching your project style.",
        },
        {
          title: "Refactoring and test-driven fixes",
          body: "Run test suites inside Aider sessions to let the agent inspect failure tracebacks and patch code until tests pass.",
        },
        {
          title: "Local model pair programming with Ollama",
          body: "Connect Aider to locally hosted models for zero-latency, private offline coding sessions.",
        },
      ],
      pros: [
        "Seamless integration with git repository history and standard diff workflows",
        "Leading performance on code editing benchmarks with Claude 3.5 Sonnet",
        "Works in any terminal without requiring a specific IDE or GUI editor",
        "Completely free open-source tool with no subscriptions or telemetry",
      ],
      cons: [
        "Requires comfort working in terminal command-line interfaces",
        "No graphical inline diff overlay compared to GUI-based IDE forks",
        "API token consumption can escalate during complex multi-file refactoring runs",
      ],
      alternatives: ["cursor", "windsurf"],
    },
  },
  {
    slug: "vllm",
    name: "vLLM",
    tagline: "High-throughput and memory-efficient LLM serving engine",
    description:
      "vLLM is a high-throughput, low-latency open-source serving engine for LLMs. Powered by PagedAttention, it optimizes GPU memory allocation, continuous batching, and OpenAI-compatible API serving for production deployments.",
    websiteUrl: "https://vllm.ai",
    githubUrl: "https://github.com/vllm-project/vllm",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "$0",
    pricingNote: "Open-source software licensed under Apache 2.0. You provide compute infrastructure.",
    hasApi: true,
    logoEmoji: "🚀",
    logoGradient: "from-blue-700 to-indigo-950",
    tagsPipe: "llm-serving|inference|infrastructure|open-source|pagedattention",
    makerHandle: "@vllm-project",
    editorial: {
      longDescription:
        "vLLM is an open-source serving engine engineered for high-throughput LLM inference and deployment. Built around PagedAttention memory management, vLLM drastically reduces memory fragmentation in key-value (KV) caches, enabling significantly higher batch sizes and throughput compared to traditional HuggingFace Transformers pipelines.\n\nIt provides seamless integration with OpenAI-compatible HTTP endpoints, quantization backends (AWQ, GPTQ, FP8), and distributed tensor parallelism for multi-GPU setups. vLLM has become the industry benchmark for hosting open-weights models like Llama 3, Qwen 2.5, and Mistral in production environments.",
      useCases: [
        {
          title: "Production open-weights LLM serving",
          body: "Host models like Llama 3 or Qwen 2.5 with enterprise-grade throughput and OpenAI-compatible API endpoints.",
        },
        {
          title: "High-concurrency API backends",
          body: "Utilize continuous batching and PagedAttention to serve hundreds of concurrent user requests per GPU node.",
        },
        {
          title: "Multi-GPU tensor parallel scaling",
          body: "Distribute large 70B+ parameter models across multiple GPUs with tensor and pipeline parallelism.",
        },
        {
          title: "Quantized model inference",
          body: "Deploy AWQ and FP8 quantized checkpoints to optimize VRAM utilization while preserving model accuracy.",
        },
      ],
      pros: [
        "State-of-the-art inference throughput powered by PagedAttention memory management",
        "Native OpenAI-compatible HTTP server for drop-in replacement of commercial endpoints",
        "Extensive support for AWQ, GPTQ, and FP8 quantization algorithms",
        "Active open-source ecosystem with rapid adoption of new model architectures",
      ],
      cons: [
        "Requires dedicated GPU hardware and CUDA environment management",
        "Setup and tuning for multi-node distributed serving can be complex",
        "Memory usage needs careful benchmarking when serving extremely long context windows",
      ],
      alternatives: ["ollama", "replicate"],
    },
  },
  {
    slug: "open-webui",
    name: "Open WebUI",
    tagline: "Self-hosted, extensible AI interface for local and cloud models",
    description:
      "Open WebUI is a feature-rich, self-hosted web UI designed to operate seamlessly with Ollama and OpenAI-compatible APIs. It includes built-in RAG document chat, role-based access control, web search, and custom pipelines.",
    websiteUrl: "https://openwebui.com",
    githubUrl: "https://github.com/open-webui/open-webui",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "$0",
    pricingNote: "Free open-source software licensed under MIT. Self-hosted via Docker or Kubernetes.",
    hasApi: true,
    logoEmoji: "🌐",
    logoGradient: "from-sky-500 to-blue-800",
    tagsPipe: "web-ui|self-hosted|ollama|rag|open-source",
    makerHandle: "@openwebui",
    editorial: {
      longDescription:
        "Open WebUI is an open-source, self-hosted web interface designed for managing and interacting with local and cloud-based AI models. Originally created as an interface for Ollama, it has evolved into a complete enterprise-ready chat platform supporting OpenAI-compatible endpoints, Anthropic, and custom API backends.\n\nThe platform offers native Retrieval-Augmented Generation (RAG) for querying uploaded PDFs and documents, granular role-based access control (RBAC), multi-user account management, web search synthesis, prompt templates, and customizable Python pipeline functions for fine-grained response handling.",
      useCases: [
        {
          title: "Private self-hosted corporate chat portal",
          body: "Deploy a ChatGPT-style interface internally for employees with local model privacy and audit logging.",
        },
        {
          title: "Document RAG and PDF analysis",
          body: "Upload documents directly into chat channels for grounded semantic search and citation-backed answers.",
        },
        {
          title: "Multi-provider model gateway",
          body: "Switch dynamically between local Ollama models, Claude 3.5, and OpenAI models in a single interface.",
        },
        {
          title: "Custom Python pipeline extensions",
          body: "Inject custom middleware for content filtering, rate limiting, and automated prompt enrichment.",
        },
      ],
      pros: [
        "Full control over user data and model routing with zero external data leaks",
        "Native RAG engine with vector storage and document chunking built-in",
        "Granular multi-user administration, permissions, and group access controls",
        "Responsive mobile-friendly design with light and dark mode themes",
      ],
      cons: [
        "Requires Docker deployment and host system setup for non-technical users",
        "Document embedding and vector indexing speed depends on server CPU and GPU resources",
        "Frequent update cycles may require occasional configuration adjustments",
      ],
      alternatives: ["chatgpt", "poe", "ollama"],
    },
  },
  {
    slug: "litellm",
    name: "LiteLLM",
    tagline: "Call 100+ LLM APIs using the OpenAI format with load balancing",
    description:
      "LiteLLM provides a standardized OpenAI-format gateway to call over 100 LLM APIs including Bedrock, Azure, Anthropic, and Vertex AI. Features include proxy load balancing, cost tracking, and rate limiting.",
    websiteUrl: "https://litellm.ai",
    githubUrl: "https://github.com/BerriAI/litellm",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "$0 / Usage proxy",
    pricingNote: "Free open-source Python SDK and basic proxy. Enterprise proxy features available with commercial plans.",
    hasApi: true,
    logoEmoji: "🔀",
    logoGradient: "from-cyan-600 to-slate-900",
    tagsPipe: "llm-proxy|sdk|api-gateway|load-balancing|open-source",
    makerHandle: "@litellm",
    editorial: {
      longDescription:
        "LiteLLM is an open-source proxy and Python SDK designed to unify interactions across more than 100 LLM providers under the standard OpenAI API request format. It eliminates provider lock-in by translating input prompts, streaming completions, function calls, and error handling across Azure OpenAI, AWS Bedrock, Google Vertex AI, Anthropic, HuggingFace, and local inference servers.\n\nIn addition to the SDK, LiteLLM offers an enterprise proxy server capable of load balancing requests across multiple API keys, enforcing per-team budget caps, tracking token usage metrics, and executing automatic fallback routing when primary providers experience downtime.",
      useCases: [
        {
          title: "Universal OpenAI API format translation",
          body: "Use standard OpenAI client libraries to query Anthropic Claude, Bedrock, or Gemini without code rewrites.",
        },
        {
          title: "API load balancing and automatic fallback",
          body: "Route traffic across multiple provider endpoints with failover logic when rate limits are encountered.",
        },
        {
          title: "Per-team token budget and cost control",
          body: "Set spend limits, track token usage by API key, and generate detailed cost attribution reports.",
        },
        {
          title: "Enterprise guardrails and secret management",
          body: "Centralize API keys in a single secure proxy while exposing virtual keys to internal developers.",
        },
      ],
      pros: [
        "Standardizes 100+ LLM providers to a single unified API specification",
        "Reduces vendor lock-in by enabling instant provider swapping in application code",
        "Built-in rate limiting, retry logic, and fallback provider routing",
        "Open-source core library with flexible deployment options",
      ],
      cons: [
        "Provider-specific parameters may require custom mapping or fallback handling",
        "Adding an intermediary proxy server introduces minor network latency overhead",
        "Advanced enterprise features require commercial license upgrades",
      ],
      alternatives: ["langchain", "replicate"],
    },
  },
  {
    slug: "groq",
    name: "Groq",
    tagline: "LPU inference engine for real-time generative computing",
    description:
      "Groq delivers ultra-fast LLM inference using its proprietary Language Processing Unit (LPU) architecture. It serves open-weights models such as Llama 3 and Gemma at speeds exceeding 300 tokens per second.",
    websiteUrl: "https://groq.com",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Pay-as-you-go",
    pricingNote: "Generous free tier with daily rate limits. Pay-as-you-go API pricing per 1M tokens for commercial usage.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-red-500 to-orange-700",
    tagsPipe: "lpu|fast-inference|llm-api|real-time|freemium",
    makerHandle: "@groqinc",
    editorial: {
      longDescription:
        "Groq is an AI hardware and cloud platform engineered for ultra-low latency LLM inference. Powered by its custom Language Processing Unit (LPU) architecture, Groq delivers token generation speeds of 300 to 500+ tokens per second for leading open-weight models including Llama 3, Gemma, and Mixtral.\n\nDesigned specifically for real-time applications, Groq provides an OpenAI-compatible API endpoint that enables developers to power conversational voice agents, instant search synthesis, and high-concurrency structured JSON generation with near-zero latency.",
      useCases: [
        {
          title: "Real-time conversational voice agent backends",
          body: "Achieve human-like latency in voice applications where sub-second response times are required.",
        },
        {
          title: "Instant search synthesis and summarization",
          body: "Synthesize search results and documents into structured summaries in under 500 milliseconds.",
        },
        {
          title: "High-speed structured JSON parsing",
          body: "Extract structured data schema from unstructured text at hundreds of tokens per second.",
        },
        {
          title: "Interactive code autocompletion",
          body: "Serve code completion backends where low latency directly improves developer productivity.",
        },
      ],
      pros: [
        "Industry-leading inference speed reaching 300-500+ tokens per second",
        "Standard OpenAI-compatible API endpoints for fast integration",
        "Generous free developer tier for testing and prototyping",
        "Consistent deterministic latency performance under load",
      ],
      cons: [
        "Limited to open-weights model selection hosted on Groq LPU hardware",
        "Free tier rate limits can be reached quickly during bursty workloads",
        "Custom model weights cannot be self-uploaded without enterprise arrangements",
      ],
      alternatives: ["replicate", "vllm"],
    },
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    tagline: "A unified interface for LLMs with transparent model routing",
    description:
      "OpenRouter is an API gateway that provides access to dozens of commercial and open-weights models under a single key. It offers transparent pricing, automatic provider fallbacks, and crypto or card billing.",
    websiteUrl: "https://openrouter.ai",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "paid",
    startingPrice: "Pay-as-you-go",
    pricingNote: "Pure usage-based billing per million input and output tokens with zero monthly subscription fees.",
    hasApi: true,
    logoEmoji: "🌐",
    logoGradient: "from-purple-600 to-indigo-900",
    tagsPipe: "api-gateway|llm-routing|model-marketplace|pay-as-you-go",
    makerHandle: "@openrouterai",
    editorial: {
      longDescription:
        "OpenRouter is a unified API gateway that aggregates commercial frontier models (Claude 3.5, GPT-4o, Gemini 1.5) and open-weights models (Llama 3, Qwen, DeepSeek) into a single API endpoint. It allows developers to access multiple model providers using a single API key and standardized OpenAI request payload format.\n\nOpenRouter features dynamic provider routing, allowing requests to be dispatched to the fastest or cheapest host for a given model. It also provides automatic failover routing, detailed token usage analytics, and flexible payment options including credit card pre-funding and crypto payments.",
      useCases: [
        {
          title: "Multi-model fallback and redundancy",
          body: "Route LLM requests through secondary model providers automatically when primary APIs experience outages.",
        },
        {
          title: "Cost optimization by dynamic model selection",
          body: "Switch between high-capability frontier models and lightweight open-weights models depending on task difficulty.",
        },
        {
          title: "Global prepaid API key management",
          body: "Fund a single billing wallet to grant team members access to multiple model providers without managing individual vendor accounts.",
        },
        {
          title: "Benchmark comparison and evaluation",
          body: "Evaluate identical prompts across Claude, GPT-4o, and Llama 3 via a single API contract.",
        },
      ],
      pros: [
        "Unified access to 100+ commercial and open models under a single API key",
        "Transparent pricing per million tokens with no markup over provider baseline costs",
        "Built-in provider failover and latency-optimized routing",
        "Supports crypto and card pre-funding for developer convenience",
      ],
      cons: [
        "Introduces an external API aggregator hop into the network request path",
        "Some provider-specific features like custom fine-tunes are not accessible",
        "Token usage tracking depends on accurate provider reporting",
      ],
      alternatives: ["replicate", "groq"],
    },
  },
  {
    slug: "qdrant",
    name: "Qdrant",
    tagline: "Vector database and semantic search engine in Rust",
    description:
      "Qdrant is a high-performance open-source vector database built in Rust. It delivers fast vector similarity search, payload filtering, scalar quantization, and hybrid search for RAG applications.",
    websiteUrl: "https://qdrant.tech",
    githubUrl: "https://github.com/qdrant/qdrant",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free / $25/mo",
    pricingNote: "Open source Apache 2.0 for self-hosting. Managed Qdrant Cloud includes a free tier and starts at $25/mo.",
    hasApi: true,
    logoEmoji: "🎯",
    logoGradient: "from-rose-600 to-red-900",
    tagsPipe: "vector-db|rust|semantic-search|rag|open-source",
    makerHandle: "@qdrant_engine",
    editorial: {
      longDescription:
        "Qdrant is an open-source vector similarity search engine and database written in Rust. Optimized for high-throughput semantic retrieval, Qdrant allows developers to store, search, and manage high-dimensional vector embeddings alongside structured JSON payload metadata.\n\nIt features advanced vector indexing algorithms (HNSW), binary and scalar quantization to compress vector storage, hybrid sparse-dense search, and strict payload filtering. Qdrant is available as a lightweight self-hosted binary, Docker container, or fully managed cloud service for production RAG and recommendation systems.",
      useCases: [
        {
          title: "High-scale RAG document retrieval",
          body: "Store millions of document chunk embeddings and perform sub-10ms semantic similarity queries.",
        },
        {
          title: "Hybrid keyword and semantic search",
          body: "Combine dense vector similarity with sparse BM25 keyword matching for optimal retrieval accuracy.",
        },
        {
          title: "Payload-filtered vector queries",
          body: "Filter search results by tenant ID, user permissions, or categories without sacrificing search velocity.",
        },
        {
          title: "Quantized vector memory optimization",
          body: "Apply scalar and binary quantization to reduce RAM footprints by up to 4x with minimal recall loss.",
        },
      ],
      pros: [
        "Engineered in Rust for high throughput, low latency, and efficient memory usage",
        "Native payload filtering integrated directly into vector index traversals",
        "Supports HNSW indexing, scalar quantization, and binary quantization",
        "Free self-hosted option alongside managed cloud deployment",
      ],
      cons: [
        "Self-hosted memory requirements scale with vector dimensionality and dataset size",
        "Requires index tuning for optimal trade-off between recall accuracy and search speed",
        "Lacks full relational SQL query engine capabilities",
      ],
      alternatives: ["pinecone"],
    },
  },
  {
    slug: "langfuse",
    name: "Langfuse",
    tagline: "Open-source LLM observability, tracing, and prompt management",
    description:
      "Langfuse is an open-source LLM engineering platform providing execution tracing, prompt management, evaluation benchmarks, and token cost analytics for production AI applications.",
    websiteUrl: "https://langfuse.com",
    githubUrl: "https://github.com/langfuse/langfuse",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free / $59/mo",
    pricingNote: "Self-hosted core licensed under MIT. Cloud hosted tier includes 50,000 observations free per month, then $59/mo.",
    hasApi: true,
    logoEmoji: "📊",
    logoGradient: "from-amber-500 to-orange-800",
    tagsPipe: "observability|tracing|prompts|evaluation|open-source",
    makerHandle: "@langfuse",
    editorial: {
      longDescription:
        "Langfuse is an open-source LLM observability and analytics platform designed for engineering teams building production AI agents and applications. It captures end-to-end execution traces, sub-span latencies, token consumption, and model costs across complex multi-step chains and RAG pipelines.\n\nBeyond tracing, Langfuse includes a collaborative prompt management system with versioning and environment tagging, automated response evaluation frameworks, user session analytics, and native integrations for LangChain, LlamaIndex, LiteLLM, and the OpenAI SDK.",
      useCases: [
        {
          title: "Multi-agent trajectory tracing and debugging",
          body: "Inspect detailed step-by-step trace trees to pinpoint latency bottlenecks and failed tool calls in agent flows.",
        },
        {
          title: "Centralized prompt versioning and deployment",
          body: "Manage, version, and push prompt templates to production without redeploying application code.",
        },
        {
          title: "Cost and token usage tracking per user",
          body: "Monitor spending across model providers and attribute costs to specific end users or feature modules.",
        },
        {
          title: "Automated model response evaluation",
          body: "Score output quality using LLM-as-a-judge evaluators and human feedback annotations.",
        },
      ],
      pros: [
        "Complete open-source transparency with self-hosted Docker and Helm charts",
        "Detailed execution trace trees with nested sub-span latency breakdowns",
        "Decoupled prompt management with environment staging (dev, prod)",
        "Generous cloud free tier for startups and individual developers",
      ],
      cons: [
        "Self-hosting requires maintaining PostgreSQL and ClickHouse storage clusters",
        "Integrating custom tracing SDKs requires minor instrumentation of application code",
        "High trace volumes require log sampling strategies to manage storage costs",
      ],
      alternatives: ["langchain"],
    },
  },

  // ── Category 2: Generative Content Creation ──
  {
    slug: "flux-1",
    name: "FLUX.1",
    tagline: "State-of-the-art text-to-image suite by Black Forest Labs",
    description:
      "FLUX.1 is a open-weights text-to-image model suite developed by Black Forest Labs. It delivers photorealistic rendering, complex prompt adherence, and legible visual text generation.",
    websiteUrl: "https://blackforestlabs.ai",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "open_source",
    startingPrice: "Free weights / API",
    pricingNote: "FLUX Schnell is Apache 2.0 open-source. FLUX Dev is non-commercial open-weights. FLUX Pro is paid via cloud API.",
    hasApi: true,
    logoEmoji: "🎨",
    logoGradient: "from-violet-600 to-fuchsia-900",
    tagsPipe: "text-to-image|open-weights|black-forest-labs|diffusion|graphics",
    makerHandle: "@bfl_ai",
    editorial: {
      longDescription:
        "FLUX.1 is a suite of text-to-image generation models developed by Black Forest Labs, founded by original creators of Stable Diffusion. Utilizing a 12-billion parameter hybrid architecture combining multimodal transformer blocks and flow matching, FLUX.1 achieves state-of-the-art visual fidelity, anatomical accuracy, and complex prompt adherence.\n\nThe suite includes three variants: FLUX.1 [schnell] (ultra-fast 1-4 step Apache 2.0 open weights), FLUX.1 [dev] (guidance-distilled non-commercial open weights), and FLUX.1 [pro] (commercial closed-source API). A major technical breakthrough of FLUX.1 is its ability to render legible, crisp typography and text directly inside generated images.",
      useCases: [
        {
          title: "Photorealistic marketing and editorial asset generation",
          body: "Generate high-resolution commercial visual assets with realistic lighting, textures, and hands.",
        },
        {
          title: "Legible visual typography rendering",
          body: "Create poster designs, logos, and graphic layouts with crisp, accurately spelled rendered text.",
        },
        {
          title: "Local ComfyUI visual workflows",
          body: "Run FLUX.1 [dev] or [schnell] locally inside ComfyUI for full control over image pipelines.",
        },
        {
          title: "Commercial API image generation",
          body: "Integrate FLUX.1 [pro] into web applications via cloud API endpoints for scale production.",
        },
      ],
      pros: [
        "Industry-leading text-to-image prompt adherence and human anatomy rendering",
        "Renders clear, legible text and typography inside generated images",
        "Open-weights availability for local execution on high-end consumer GPUs",
        "Outperforms closed commercial generators across visual benchmark evaluations",
      ],
      cons: [
        "FLUX.1 [dev] requires significant GPU VRAM (16GB+) for smooth local execution",
        "FLUX.1 [dev] license restricts direct commercial usage without API arrangements",
        "Local model file downloads exceed 20GB in size",
      ],
      alternatives: ["midjourney", "adobe-firefly"],
    },
  },
  {
    slug: "udio",
    name: "Udio",
    tagline: "Create high-fidelity music tracks with vocals from text prompts",
    description:
      "Udio is an AI music generation platform that produces studio-quality tracks with vocals, instrumentation, and lyric synthesis across diverse musical genres from text prompts.",
    websiteUrl: "https://udio.com",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "Free / $10/mo",
    pricingNote: "Free plan includes monthly generation credits. Standard plan starts at $10/month for advanced track controls.",
    hasApi: false,
    logoEmoji: "🎵",
    logoGradient: "from-pink-500 to-rose-800",
    tagsPipe: "music-gen|audio|vocals|freemium|songwriting",
    makerHandle: "@udio",
    editorial: {
      longDescription:
        "Udio is an AI generative music platform developed by former DeepMind researchers that synthesizes high-fidelity audio tracks from natural language prompts. It generates complete musical compositions complete with nuanced vocals, multi-instrumental arrangements, and custom lyric alignment across genres ranging from pop and electronic to jazz and classical.\n\nUdio features interactive editing tools including track extension, section inpainting, stem separation, and lyric editing, allowing creators to iterate on songs section by section to build full multi-minute music productions.",
      useCases: [
        {
          title: "Full musical composition drafting",
          body: "Generate complete vocal and instrumental songs from thematic text descriptions and genre tags.",
        },
        {
          title: "Soundtrack production for video and games",
          body: "Create royalty-cleared background music and atmospheric soundscapes for media projects.",
        },
        {
          title: "Songwriting and lyric prototyping",
          body: "Write custom lyrics and experiment with melodic structures across different musical styles.",
        },
        {
          title: "Audio section inpainting and extension",
          body: "Extend generated tracks into full-length songs with intro, verse, chorus, and outro sections.",
        },
      ],
      pros: [
        "Exceptional vocal clarity and realistic emotional vocal inflection",
        "Detailed genre control covering complex arrangements and acoustic instruments",
        "Interactive audio extension and section inpainting editing tools",
        "Generous monthly credit allowance on the free user tier",
      ],
      cons: [
        "Audio artifacts and vocal blurring can occasionally occur in dense arrangements",
        "Lack of a public commercial API endpoint for external developer integration",
        "Copyright and training data provenance remain active industry discussions",
      ],
      alternatives: ["suno"],
    },
  },

  // ── Category 3: Automation & Workflow Orchestration ──
  {
    slug: "dify",
    name: "Dify.ai",
    tagline: "Open-source platform for building production-ready LLM apps",
    description:
      "Dify.ai is an open-source LLM app development platform combining visual workflow orchestration, RAG pipelines, agent management, model monitoring, and instant API deployment.",
    websiteUrl: "https://dify.ai",
    githubUrl: "https://github.com/langgenius/dify",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free / $59/mo",
    pricingNote: "Self-hosted Apache 2.0 is completely free. Cloud sandbox is free; Team plan starts at $59/month.",
    hasApi: true,
    logoEmoji: "🧩",
    logoGradient: "from-blue-600 to-cyan-800",
    tagsPipe: "llm-platform|rag|visual-workflow|agents|open-source",
    makerHandle: "@dify_ai",
    editorial: {
      longDescription:
        "Dify.ai is an open-source application development platform engineered to streamline the creation of production-grade LLM applications. It combines a visual node-based workflow builder, native RAG knowledge base management, agent orchestration, and prompt engineering into a single unified workspace.\n\nDevelopers can deploy built applications instantly as RESTful APIs, embeddable web widgets, or standalone chat portals. Dify supports major commercial and open-weights model backends, provides fine-grained observability logs, and offers enterprise features including team collaboration, workspace permissions, and self-hosted Docker orchestration.",
      useCases: [
        {
          title: "Visual multi-agent workflow construction",
          body: "Build complex agent logic with drag-and-drop nodes for web search, Python code execution, and database queries.",
        },
        {
          title: "Enterprise knowledge base RAG bots",
          body: "Upload corporate documentation to construct vector-indexed retrieval systems with multi-model QA.",
        },
        {
          title: "Instant backend API publishing",
          body: "Publish completed prompt chains and agent flows as production REST APIs with single-click API keys.",
        },
        {
          title: "Team prompt engineering workspace",
          body: "Collaborate with non-technical team members to test, evaluate, and refine prompt templates.",
        },
      ],
      pros: [
        "Complete open-source platform with flexible Docker self-hosting capabilities",
        "Visual drag-and-drop node canvas for complex multi-step LLM workflows",
        "Built-in RAG pipeline with automatic text chunking and vector storage",
        "Instant publishing of applications as APIs or embeddable chat widgets",
      ],
      cons: [
        "Self-hosting setup requires managing Vector DB, Redis, and PostgreSQL containers",
        "Debugging complex visual graph execution paths requires inspecting execution logs",
        "Custom code node execution is sandboxed and limited to Python and JavaScript",
      ],
      alternatives: ["n8n", "langchain"],
    },
  },
  {
    slug: "activepieces",
    name: "Activepieces",
    tagline: "Open-source business automation with native AI capabilities",
    description:
      "Activepieces is an open-source no-code automation platform alternative to Zapier. It features self-hosting privacy, 100+ app integrations, and native AI piece connectors.",
    websiteUrl: "https://activepieces.com",
    githubUrl: "https://github.com/activepieces/activepieces",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free / $10/mo",
    pricingNote: "Open-source MIT self-hosted is free. Cloud Starter plan begins at $10/month for hosted tasks.",
    hasApi: true,
    logoEmoji: "🧩",
    logoGradient: "from-emerald-500 to-green-800",
    tagsPipe: "automation|zapier-alternative|open-source|no-code|integrations",
    makerHandle: "@activepieces",
    editorial: {
      longDescription:
        "Activepieces is an open-source automation engine designed as a privacy-focused alternative to Zapier and Make. Built with TypeScript and licensed under MIT, Activepieces allows organizations to build automated app-to-app workflows with a clean, intuitive visual builder.\n\nIt features over 100 pre-built piece connectors for popular services including Slack, OpenAI, GitHub, Hubspot, and Postgres. Because it can be deployed on-premise via Docker, Activepieces ensures sensitive business data and API tokens remain entirely within company infrastructure while providing native AI components for text extraction and classification.",
      useCases: [
        {
          title: "On-premise webhook and data automation",
          body: "Automate internal data synchronization between databases and webhooks with self-hosted data isolation.",
        },
        {
          title: "AI-powered customer support triage",
          body: "Route incoming support tickets using OpenAI classification pieces to digest and assign messages in Slack.",
        },
        {
          title: "Marketing lead enrichment pipelines",
          body: "Sync new webform leads directly into CRM systems with automated enrichment via AI search pieces.",
        },
        {
          title: "Custom TypeScript connector development",
          body: "Write custom open-source pieces in TypeScript to connect internal proprietary REST APIs.",
        },
      ],
      pros: [
        "Permissive MIT open-source license with zero self-hosting core fees",
        "Modern clean UI with fast workflow builder execution",
        "Native AI pieces for integrating OpenAI, Anthropic, and custom LLMs",
        "Strong focus on data privacy and local network execution",
      ],
      cons: [
        "Smaller library of pre-built app connectors compared to Zapier",
        "Complex multi-branch conditional logic requires careful flow structuring",
        "Community plugin ecosystem is still actively expanding",
      ],
      alternatives: ["zapier", "make", "n8n"],
    },
  },

  // ── Category 4: Conversational AI & Research ──
  {
    slug: "notebooklm",
    name: "NotebookLM",
    tagline: "Grounded personalized AI notebook powered by Gemini 1.5",
    description:
      "NotebookLM is a Google research assistant that grounds AI responses strictly in your uploaded documents. Features conversational Audio Overviews, study guides, and citation back-links.",
    websiteUrl: "https://notebooklm.google",
    categoryLegacyId: CATEGORIES.CONVERSATIONAL_AI,
    pricingModel: "free",
    startingPrice: "$0",
    pricingNote: "Free service provided by Google for standard personal and workspace Google accounts.",
    hasApi: false,
    logoEmoji: "📓",
    logoGradient: "from-blue-500 to-amber-600",
    tagsPipe: "research|notebook|grounded-ai|google|gemini",
    makerHandle: "@google",
    editorial: {
      longDescription:
        "NotebookLM is an AI-powered personalized research assistant developed by Google Labs. Powered by Gemini 1.5 Pro's million-token context window, NotebookLM creates a private workspace grounded exclusively in user-uploaded sources, including PDFs, Google Docs, web URLs, YouTube transcripts, and raw text notes.\n\nUnlike general web chatbots, NotebookLM limits hallucination by citing explicit page numbers and source quotes for every answer. A standout capability is Audio Overviews, which automatically transforms uploaded documents into a natural, dual-host conversational podcast discussing key insights and themes from your research materials.",
      useCases: [
        {
          title: "Document-grounded academic research synthesis",
          body: "Upload complex research papers and PDFs to query findings with direct inline source citations.",
        },
        {
          title: "Conversational Audio Overview podcast generation",
          body: "Convert lengthy reports or documents into engaging, dual-host spoken audio discussions.",
        },
        {
          title: "Study guide and FAQ creation",
          body: "Automatically generate study guides, briefing docs, timelines, and FAQs from lecture notes and slides.",
        },
        {
          title: "Cross-document synthesis across large corpora",
          body: "Synthesize themes across up to 50 distinct documents simultaneously utilizing Gemini's context window.",
        },
      ],
      pros: [
        "Strict document grounding minimizes hallucination with clickable source citations",
        "Breakthrough Audio Overviews feature creates remarkably realistic discussion podcasts",
        "Leverages Gemini 1.5 Pro for handling massive document collections",
        "Completely free with standard Google account access",
      ],
      cons: [
        "No public API available for third-party developer integration",
        "Limited to uploaded source documents without general web browsing search",
        "Audio Overviews cannot be heavily edited or custom-scripted prior to generation",
      ],
      alternatives: ["perplexity", "chatgpt"],
    },
  },
  {
    slug: "consensus",
    name: "Consensus",
    tagline: "Search 200M+ scientific papers to get evidence-based answers",
    description:
      "Consensus is an AI search engine for scientific research. It indexes over 200 million peer-reviewed papers to provide evidence-backed answers, consensus meters, and paper summaries.",
    websiteUrl: "https://consensus.app",
    categoryLegacyId: CATEGORIES.CONVERSATIONAL_AI,
    pricingModel: "freemium",
    startingPrice: "Free / $11.99/mo",
    pricingNote: "Free tier includes unlimited basic searches. Premium plan is $11.99/mo (billed annually) for full synthesis.",
    hasApi: true,
    logoEmoji: "🔬",
    logoGradient: "from-teal-600 to-blue-900",
    tagsPipe: "academic-search|research|science|peer-reviewed|freemium",
    makerHandle: "@consensussearch",
    editorial: {
      longDescription:
        "Consensus is an AI search engine designed specifically to ground answers in peer-reviewed scientific research. Indexing over 200 million papers from the Semantic Scholar database, Consensus extracts key findings, methodological details, and sample sizes directly from published literature.\n\nIts signature features include the Consensus Meter, which analyzes paper findings to display a percentage breakdown of scientific agreement (e.g., Yes, No, Possibly) on controversial topics, and synthesized GPT-powered literature summaries backed by explicit study citations.",
      useCases: [
        {
          title: "Scientific hypothesis and claim verification",
          body: "Search medical or scientific questions to instantly gauge consensus across published studies.",
        },
        {
          title: "Academic literature review extraction",
          body: "Extract study methodologies, sample sizes, and outcome metrics into structured research tables.",
        },
        {
          title: "Evidence-backed science communication",
          body: "Draft blog posts and policy documents with verified peer-reviewed citations.",
        },
        {
          title: "Deep-dive topic exploration",
          body: "Filter research findings by study type (RCTs, systematic reviews), citation count, and publication year.",
        },
      ],
      pros: [
        "Indexes over 200M peer-reviewed scientific papers for high domain authority",
        "Consensus Meter provides immediate visual metrics on scientific agreement",
        "Extracts explicit study metadata including sample size and study design",
        "Clean interface with direct links to original paper DOIs",
      ],
      cons: [
        "Limited utility for non-academic or general commercial topics",
        "Full synthesis capabilities require a paid premium subscription",
        "Paywalled academic papers may restrict access to full text beyond abstracts",
      ],
      alternatives: ["perplexity"],
    },
  },

  // ── Category 5: NLP & Text Utilities ──
  {
    slug: "whisper",
    name: "Whisper",
    tagline: "General-purpose speech recognition and translation model",
    description:
      "Whisper is OpenAI's benchmark open-source automatic speech recognition (ASR) model. Trained on 680,000 hours of multilingual data, it provides high-accuracy transcription and translation.",
    websiteUrl: "https://openai.com/research/whisper",
    githubUrl: "https://github.com/openai/whisper",
    categoryLegacyId: CATEGORIES.NLP_TEXT,
    pricingModel: "open_source",
    startingPrice: "$0 / $0.006/min",
    pricingNote: "Open source MIT weights are free for local execution. Hosted OpenAI API is priced at $0.006 per minute.",
    hasApi: true,
    logoEmoji: "🎙️",
    logoGradient: "from-teal-500 to-emerald-900",
    tagsPipe: "speech-to-text|transcription|audio|open-source|openai",
    makerHandle: "@openai",
    editorial: {
      longDescription:
        "Whisper is an open-source automatic speech recognition (ASR) system developed by OpenAI. Trained on 680,000 hours of diverse, multilingual, and multitask audio collected from the web, Whisper achieves near-human accuracy in speech transcription and direct translation into English.\n\nWhisper is robust against background noise, accents, technical jargon, and speech disfluencies. It is available as open-source model checkpoints (ranging from tiny to large-v3) under the MIT license, as well as via OpenAI's hosted REST API endpoint.",
      useCases: [
        {
          title: "High-accuracy audio and video transcription",
          body: "Convert podcasts, interviews, and recorded meetings into clean, punctuated text transcripts.",
        },
        {
          title: "Multilingual speech translation to English",
          body: "Translate spoken audio from over 50 foreign languages directly into English text.",
        },
        {
          title: "Subtitling and subtitle timestamp alignment",
          body: "Generate word-level timestamped subtitle files (SRT, VTT) for video production workflows.",
        },
        {
          title: "Local privacy-sensitive voice input backends",
          body: "Run Whisper models locally using whisper.cpp or Faster-Whisper for zero-data-leak voice interfaces.",
        },
      ],
      pros: [
        "Benchmark speech recognition accuracy across diverse accents and noisy environments",
        "Permissive MIT open-source license with local execution support",
        "Word-level timestamp generation for accurate subtitle generation",
        "Extremely affordable hosted API at $0.006 per minute",
      ],
      cons: [
        "Large-v3 local model requires substantial GPU VRAM for fast real-time inference",
        "Native model lacks built-in speaker diarization (identifying distinct speakers)",
        "Occasional hallucination loops during extended silence or static audio clips",
      ],
      alternatives: ["otter-ai", "deepl"],
    },
  },
  {
    slug: "descript",
    name: "Descript",
    tagline: "Video and audio editing as simple as working in a word doc",
    description:
      "Descript is an AI-powered media editor that transcribes audio and video into text, allowing creators to edit videos by editing text. Features filler word removal, AI voice cloning, and Studio Sound.",
    websiteUrl: "https://descript.com",
    categoryLegacyId: CATEGORIES.NLP_TEXT,
    pricingModel: "freemium",
    startingPrice: "Free / $12/mo",
    pricingNote: "Free plan includes 1 transcription hour/month. Hobbyist plan starts at $12/month for expanded limits.",
    hasApi: false,
    logoEmoji: "🎬",
    logoGradient: "from-blue-500 to-indigo-800",
    tagsPipe: "video-editor|audio|transcription|podcasting|freemium",
    makerHandle: "@descript",
    editorial: {
      longDescription:
        "Descript is an all-in-one audio and video editing platform that revolutionizes media production by treating video as a text document. Upon uploading media, Descript generates an accurate transcript, enabling users to cut, copy, or delete video segments simply by editing the text transcript.\n\nIts AI suite includes Studio Sound (one-click background noise reduction and acoustic enhancement), automatic removal of filler words ('ums' and 'ahs'), Overdub (AI voice cloning to correct misspoken words without re-recording), and automated multi-cam speaker switching for podcast productions.",
      useCases: [
        {
          title: "Text-based video and podcast editing",
          body: "Trim long video recordings and podcasts by highlighting and deleting text in the transcript.",
        },
        {
          title: "One-click filler word removal",
          body: "Instantly detect and strip out filler words ('um', 'uh', 'like') across entire recording sessions.",
        },
        {
          title: "Studio Sound audio enhancement",
          body: "Transform echoey or noisy laptop microphone recordings into studio-quality audio with single-click enhancement.",
        },
        {
          title: "AI Overdub voice replacement",
          body: "Type new words to patch over misspoken sentences using an AI-generated clone of your own voice.",
        },
      ],
      pros: [
        "Revolutionary text-based editing workflow eliminates tedious timeline scrubbing",
        "Exceptional Studio Sound audio restoration quality",
        "Automated removal of filler words and awkward silent pauses",
        "Collaborative cloud workspace for multi-editor teams",
      ],
      cons: [
        "No public API available for automated headless script processing",
        "Desktop app can be resource-intensive during high-resolution 4K video rendering",
        "Voice cloning requires careful recording setup for natural output",
      ],
      alternatives: ["otter-ai", "elevenlabs"],
    },
  },

  // ── Category 6: Computer Vision ──
  {
    slug: "superannotate",
    name: "SuperAnnotate",
    tagline: "Multimodal data annotation and model fine-tuning platform",
    description:
      "SuperAnnotate is an enterprise multimodal data annotation platform. It accelerates computer vision and LLM RLHF dataset creation with automated QA, vector annotation tools, and custom curation.",
    websiteUrl: "https://superannotate.com",
    categoryLegacyId: CATEGORIES.COMPUTER_VISION,
    pricingModel: "paid",
    startingPrice: "Contact / Free tier",
    pricingNote: "Free sandbox tier available for testing. Enterprise commercial plans priced on dataset volume and seats.",
    hasApi: true,
    logoEmoji: "🏷️",
    logoGradient: "from-cyan-500 to-blue-900",
    tagsPipe: "annotation|computer-vision|dataset|rlhf|multimodal",
    makerHandle: "@superannotate",
    editorial: {
      longDescription:
        "SuperAnnotate is an enterprise data annotation and curation platform designed to build high-quality datasets for computer vision, NLP, and multimodal LLM fine-tuning. It provides AI-assisted annotation tools for bounding boxes, polygon segmentation, video tracking, keypoints, and 3D point clouds.\n\nThe platform integrates automated quality assurance workflows, consensus scoring, detailed workforce performance analytics, and native integrations with Python SDKs and cloud storage (AWS S3, GCP, Azure). It is heavily utilized by enterprise teams training autonomous vehicles, medical imaging AI, and visual inspection models.",
      useCases: [
        {
          title: "Computer vision dataset segmentation and labeling",
          body: "Annotate images and video with vector polygons, bounding boxes, and keypoints using AI segment-anything assistance.",
        },
        {
          title: "Multimodal LLM and RLHF data alignment",
          body: "Manage human preference ranking, instruction tuning, and red-teaming datasets for multimodal LLMs.",
        },
        {
          title: "Automated annotation QA and consensus scoring",
          body: "Audit annotator consistency and run automated validation checks across thousands of data samples.",
        },
        {
          title: "Enterprise cloud storage dataset sync",
          body: "Connect directly to private S3 or GCS buckets without copying raw image files out of infrastructure.",
        },
      ],
      pros: [
        "AI-assisted segmentation tools dramatically speed up manual labeling tasks",
        "Supports comprehensive multimodal data formats (image, video, text, 3D point cloud)",
        "Enterprise-grade role permissions, consensus metrics, and QA workflows",
        "Direct connection to cloud storage without data duplication",
      ],
      cons: [
        "Commercial pricing requires contacting sales for enterprise volume tiers",
        "Platform feature density presents a learning curve for new project managers",
        "Requires active internet connectivity for cloud workspace management",
      ],
      alternatives: ["label-studio", "roboflow"],
    },
  },
  {
    slug: "landinglens",
    name: "LandingLens",
    tagline: "Computer vision platform built for manufacturing and industrial QA",
    description:
      "LandingLens is Andrew Ng's LandingAI visual inspection platform. Purpose-built for manufacturing defect detection, it enables fast deployment of domain-specific computer vision models.",
    websiteUrl: "https://landing.ai",
    categoryLegacyId: CATEGORIES.COMPUTER_VISION,
    pricingModel: "freemium",
    startingPrice: "Free trial / Paid",
    pricingNote: "Free tier includes up to 100 images. Commercial pay-as-you-go and enterprise plans scale with dataset size.",
    hasApi: true,
    logoEmoji: "🏭",
    logoGradient: "from-blue-600 to-slate-900",
    tagsPipe: "computer-vision|industrial-qa|manufacturing|landingai|defect-detection",
    makerHandle: "@landingai",
    editorial: {
      longDescription:
        "LandingLens is a computer vision platform created by LandingAI and founded by AI pioneer Andrew Ng. Tailored specifically for industrial quality assurance, assembly inspection, and manufacturing defect detection, LandingLens emphasizes a data-centric AI approach where small, high-precision datasets yield production-grade model accuracy.\n\nThe platform guides engineers through image capture, defect labelling, model training, and edge deployment onto factory floor vision hardware. LandingLens minimizes the volume of training images required to achieve high precision by focusing on defect annotation quality and automated model optimization.",
      useCases: [
        {
          title: "Automated factory defect classification",
          body: "Detect surface scratches, cracks, and soldering flaws on manufacturing assembly lines in real time.",
        },
        {
          title: "Assembly line completeness verification",
          body: "Verify that all components and fasteners are present prior to product packaging.",
        },
        {
          title: "Data-centric small dataset computer vision",
          body: "Train accurate inspection models using fewer than 50 labeled defect samples.",
        },
        {
          title: "Edge device camera deployment",
          body: "Deploy trained vision models directly to industrial cameras and edge processing units.",
        },
      ],
      pros: [
        "Data-centric methodology enables accurate models from small image datasets",
        "Built specifically for industrial manufacturing and quality control requirements",
        "Intuitive web interface designed for domain expert engineers without ML PhDs",
        "Seamless deployment options to factory floor edge devices",
      ],
      cons: [
        "Tailored primarily for visual inspection, less suited for consumer video media apps",
        "Free tier limit of 100 images is intended primarily for initial evaluation",
        "Requires edge hardware integration for real-time factory line deployments",
      ],
      alternatives: ["roboflow", "clarifai"],
    },
  },

  // ── Category 7: Data Analytics & Predictive Modeling ──
  {
    slug: "julius-ai",
    name: "Julius AI",
    tagline: "Your AI data analyst for spreadsheets and structured datasets",
    description:
      "Julius AI is a conversational data analysis assistant. It connects to Excel, CSVs, and databases to clean data, build statistical charts, run regressions, and write executable Python analysis code.",
    websiteUrl: "https://julius.ai",
    categoryLegacyId: CATEGORIES.DATA_ANALYTICS,
    pricingModel: "freemium",
    startingPrice: "Free / $20/mo",
    pricingNote: "Free tier includes 15 messages per month. Basic plan starts at $20/month for unlimited data queries.",
    hasApi: false,
    logoEmoji: "📈",
    logoGradient: "from-emerald-500 to-teal-800",
    tagsPipe: "data-analysis|spreadsheets|excel|python|charts|freemium",
    makerHandle: "@juliusai",
    editorial: {
      longDescription:
        "Julius AI is a conversational AI data analyst designed to analyze structured data files including Excel spreadsheets, CSVs, Google Sheets, and SQL databases. Powered by sandboxed Python execution, Julius translates natural language questions into executable pandas and matplotlib code, generating interactive charts and statistical summaries instantly.\n\nIt handles complex data tasks such as missing value imputation, linear regressions, forecasting trends, clustering customer segments, and creating publication-grade visual reports without requiring users to write code manually.",
      useCases: [
        {
          title: "Conversational spreadsheet trend analysis",
          body: "Upload sales CSVs and ask natural language questions to identify revenue growth drivers and seasonality.",
        },
        {
          title: "Automated Python chart and plot generation",
          body: "Generate styled bar charts, scatter plots, and heatmaps with exportable Python source code.",
        },
        {
          title: "Statistical regression and correlation modeling",
          body: "Run linear regressions and statistical hypothesis tests across multi-column datasets.",
        },
        {
          title: "Data cleaning and missing value treatment",
          body: "Identify missing data, reformat date columns, and export cleaned CSV files.",
        },
      ],
      pros: [
        "Executes real Python code under the hood for accurate mathematical analysis",
        "Generates clean, customizable data visual graphs and charts",
        "Supports direct upload of Excel files, CSVs, and Google Sheets",
        "Provides exportable Python source code for every analysis step",
      ],
      cons: [
        "No public API available for automated backend data processing",
        "Free tier limit of 15 messages is quickly consumed during exploratory analysis",
        "File upload limits apply to very large multi-gigabyte datasets",
      ],
      alternatives: ["hex", "polymer"],
    },
  },
  {
    slug: "vanna-ai",
    name: "Vanna.ai",
    tagline: "Open-source SQL generation using RAG on your database schema",
    description:
      "Vanna.ai is an open-source Python RAG framework for accurate Text-to-SQL generation. It trains on your database schema, documentation, and query history to output correct SQL.",
    websiteUrl: "https://vanna.ai",
    githubUrl: "https://github.com/vanna-ai/vanna",
    categoryLegacyId: CATEGORIES.DATA_ANALYTICS,
    pricingModel: "open_source",
    startingPrice: "$0 / Cloud tiers",
    pricingNote: "Open source MIT library for self-hosting. Free community cloud tier available alongside enterprise hosting.",
    hasApi: true,
    logoEmoji: "🗄️",
    logoGradient: "from-blue-600 to-indigo-900",
    tagsPipe: "text-to-sql|rag|database|python|open-source",
    makerHandle: "@vanna_ai",
    editorial: {
      longDescription:
        "Vanna.ai is an open-source Python framework designed for accurate Text-to-SQL generation using Retrieval-Augmented Generation (RAG). By indexing database schemas, column descriptions, foreign key constraints, and verified reference SQL queries into a vector database, Vanna trains a specialized context model tailored to your database layout.\n\nWhen users query the system in natural language, Vanna retrieves the relevant schema context and generates dialect-correct SQL for PostgreSQL, Snowflake, BigQuery, MySQL, SQLite, and DuckDB. Because Vanna runs locally inside your Python environment, database credentials and underlying data never leave your secure network.",
      useCases: [
        {
          title: "Natural language database querying for non-technical teams",
          body: "Enable business users to query complex SQL warehouses in plain text via Slack or web UI interfaces.",
        },
        {
          title: "Embedding SQL copilots into SaaS applications",
          body: "Integrate Vanna into web applications to offer self-serve reporting and dashboard query generation.",
        },
        {
          title: "Context-aware Text-to-SQL accuracy optimization",
          body: "Train the RAG model on historical SQL queries to handle complex join paths and company-specific metric logic.",
        },
        {
          title: "Private self-hosted SQL generation",
          body: "Run Vanna inside your VPC connecting to local vector stores (Chroma, Qdrant) for maximum data security.",
        },
      ],
      pros: [
        "RAG-based architecture significantly improves SQL accuracy compared to naive prompt baselines",
        "Supports major database engines including Postgres, Snowflake, BigQuery, and SQLite",
        "Permissive MIT open-source license with full local execution capabilities",
        "Learns iteratively from user-verified SQL query corrections",
      ],
      cons: [
        "Initial setup requires indexing database schemas and uploading representative SQL queries",
        "Complex schema ambiguity requires clear table descriptions for reliable joins",
        "Improper database user permissions could allow unintended data query access",
      ],
      alternatives: ["hex", "tableau-pulse"],
    },
  },
];

// Check for em/en dashes across all copy
for (const tool of BACKLOG) {
  const texts = [
    tool.description,
    tool.tagline,
    tool.editorial.longDescription,
    ...tool.editorial.useCases.flatMap((u) => [u.title, u.body]),
    ...tool.editorial.pros,
    ...tool.editorial.cons,
    tool.pricingNote,
  ];
  if (texts.some((t) => /[\u2014\u2013]/.test(t ?? ""))) {
    console.error(`✗ ${tool.slug}: em or en dash found in copy!`);
    process.exit(1);
  }
}

async function updateCuratedDocs(slug: string) {
  const docsPath = "/home/Dee/Desktop/Dev Projects/Prother.dev/docs/curated-tool-recommendations.md";
  if (!fs.existsSync(docsPath)) return;
  let content = fs.readFileSync(docsPath, "utf-8");
  
  // Replace "Ready for Intake" with "**Added & Live**" for this tool slug row
  const pattern = "`" + slug + "`";
  const lines = content.split("\n");
  let updated = false;
  const newLines = lines.map((line) => {
    if (line.includes(pattern) && line.includes("Ready for Intake")) {
      updated = true;
      return line.replace("Ready for Intake", "**Added & Live**");
    }
    return line;
  });

  if (updated) {
    fs.writeFileSync(docsPath, newLines.join("\n"), "utf-8");
    console.log(`✓ Updated docs/curated-tool-recommendations.md: marked ${slug} as Added & Live`);
  }
}

async function main() {
  console.log("Connecting to Convex and SQLite...");
  const convex = createServerConvexClient();
  if (!convex) {
    throw new Error("Convex client could not be created. Check NEXT_PUBLIC_CONVEX_URL.");
  }

  // 1. Fetch current tools from Convex and SQLite to prevent duplicates
  const convexDir = await convex.query(api.tools.directory, { sort: "newest", page: 1, pageSize: 500 });
  const convexSlugs = new Set((convexDir.rows ?? []).map((t: any) => t.slug));

  const sqliteTools = await db.tool.findMany({ select: { slug: true } });
  const sqliteSlugs = new Set(sqliteTools.map((t) => t.slug));

  // 2. Find the next candidate tool from backlog that is NOT in both DBs
  const toolToIngest = BACKLOG.find((t) => !convexSlugs.has(t.slug) || !sqliteSlugs.has(t.slug));

  if (!toolToIngest) {
    console.log("ℹ All tools from curated-tool-recommendations.md have already been ingested into Convex & SQLite!");
    process.exit(0);
  }

  console.log(`\n==================================================`);
  console.log(`🚀 INGESTING TOOL: ${toolToIngest.name} (${toolToIngest.slug})`);
  console.log(`==================================================\n`);

  const NOW = Date.now();
  const svgLogoPath = path.resolve(process.cwd(), `public/logos/${toolToIngest.slug}.svg`);
  const pngLogoPath = path.resolve(process.cwd(), `public/logos/${toolToIngest.slug}.png`);
  const logoUrl = fs.existsSync(svgLogoPath)
    ? `/logos/${toolToIngest.slug}.svg`
    : fs.existsSync(pngLogoPath)
    ? `/logos/${toolToIngest.slug}.png`
    : null;

  const toolData = {
    id: "cmucr_" + toolToIngest.slug + "_" + Math.random().toString(36).substring(2, 9),
    slug: toolToIngest.slug,
    name: toolToIngest.name,
    tagline: toolToIngest.tagline,
    description: toolToIngest.description,
    websiteUrl: toolToIngest.websiteUrl,
    categoryLegacyId: toolToIngest.categoryLegacyId,
    pricingModel: toolToIngest.pricingModel,
    startingPrice: toolToIngest.startingPrice,
    pricingNote: toolToIngest.pricingNote,
    hasApi: toolToIngest.hasApi,
    logoEmoji: toolToIngest.logoEmoji,
    logoGradient: toolToIngest.logoGradient,
    logoUrl: logoUrl,
    tagsPipe: toolToIngest.tagsPipe,
    makerHandle: toolToIngest.makerHandle,
    status: "live",
    editorsPick: true,
    curated: true,
    createdAt: NOW,
    editorial: {
      longDescription: toolToIngest.editorial.longDescription,
      useCases: toolToIngest.editorial.useCases,
      pros: toolToIngest.editorial.pros,
      cons: toolToIngest.editorial.cons,
      alternatives: toolToIngest.editorial.alternatives,
      pricingChecked: true,
    },
  };

  // 3. Add to Convex
  console.log(`Adding ${toolToIngest.name} to Convex...`);
  try {
    const res = await convex.mutation(api.adminCrud.toolCreate, toolData);
    console.log(`✓ Convex: Added ${toolToIngest.name} (${toolToIngest.slug}) -> ID: ${res.id}`);
    if (toolToIngest.githubUrl) {
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: res.id,
        data: { githubUrl: toolToIngest.githubUrl },
        nowMs: NOW,
      });
      console.log(`✓ Convex: Patched githubUrl for ${toolToIngest.name}`);
    }
  } catch (err: any) {
    if (err.message?.includes("slug_taken")) {
      console.log(`ℹ Convex: ${toolToIngest.name} already exists, skipping create`);
    } else {
      console.error(`✗ Convex error for ${toolToIngest.name}:`, err);
      throw err;
    }
  }

  // 4. Add to SQLite (db/custom.db)
  console.log(`Adding ${toolToIngest.name} to SQLite...`);
  const existingDbTool = await db.tool.findUnique({ where: { slug: toolToIngest.slug } });
  if (!existingDbTool) {
    await db.tool.create({
      data: {
        id: toolData.id,
        slug: toolToIngest.slug,
        name: toolToIngest.name,
        tagline: toolToIngest.tagline,
        description: toolToIngest.description,
        websiteUrl: toolToIngest.websiteUrl,
        githubUrl: toolToIngest.githubUrl,
        categoryId: toolToIngest.categoryLegacyId,
        pricingModel: toolToIngest.pricingModel,
        startingPrice: toolToIngest.startingPrice,
        pricingNote: toolToIngest.pricingNote,
        hasApi: toolToIngest.hasApi,
        logoEmoji: toolToIngest.logoEmoji,
        logoGradient: toolToIngest.logoGradient,
        logoUrl: logoUrl,
        tags: toolToIngest.tagsPipe,
        makerHandle: toolToIngest.makerHandle,
        status: "live",
        editorsPick: true,
        curated: true,
        claimed: false,
        pinned: 0,
      },
    });
    console.log(`✓ SQLite: Created tool ${toolToIngest.name}`);
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
    toolToIngest.editorial.longDescription,
    JSON.stringify(toolToIngest.editorial.useCases),
    JSON.stringify(toolToIngest.editorial.pros),
    JSON.stringify(toolToIngest.editorial.cons),
    toolToIngest.editorial.alternatives.join("|"),
    toolToIngest.pricingModel,
    toolToIngest.startingPrice,
    toolToIngest.pricingNote,
    new Date(),
    new Date(),
    toolToIngest.slug
  );
  console.log(`✓ SQLite: Enriched editorial fields for ${toolToIngest.name}`);

  // 5. Mutual Alternative Mapping
  console.log(`Executing Mutual Alternative Mapping for alternatives: ${toolToIngest.editorial.alternatives.join(", ")}...`);
  for (const altSlug of toolToIngest.editorial.alternatives) {
    // A) Update SQLite for altSlug
    const altDbTool = await db.tool.findUnique({ where: { slug: altSlug } });
    if (altDbTool) {
      const existingAlts = altDbTool.alternatives ? altDbTool.alternatives.split("|").map((s) => s.trim()).filter(Boolean) : [];
      if (!existingAlts.includes(toolToIngest.slug)) {
        existingAlts.push(toolToIngest.slug);
        const updatedAltsPipe = existingAlts.join("|");
        await db.$executeRawUnsafe(
          `UPDATE Tool SET alternatives = ?, contentUpdatedAt = ? WHERE slug = ?`,
          updatedAltsPipe,
          new Date(),
          altSlug
        );
        console.log(`✓ SQLite Mutual Link: Added '${toolToIngest.slug}' to '${altSlug}' alternatives -> [${updatedAltsPipe}]`);
      }
    }

    // B) Update Convex for altSlug
    try {
      let convexLegacyId = altDbTool?.id;
      if (!convexLegacyId) {
        const page: any = await convex.query(api.tools.pageData, { slug: altSlug });
        convexLegacyId = page?.tool?.id;
      }
      if (convexLegacyId) {
        const altConvexTool: any = await convex.query(api.tools.detail, { slug: altSlug });
        if (altConvexTool && !("error" in altConvexTool) && altConvexTool.slug) {
          const currentConvexAlts: string[] = (altConvexTool.alternatives ?? []).map((a: any) => a.slug ?? a);
          if (!currentConvexAlts.includes(toolToIngest.slug)) {
            const newAlts = [...currentConvexAlts, toolToIngest.slug];
            await convex.mutation(api.adminCrud.toolPatch, {
              toolLegacyId: convexLegacyId,
              data: {},
              editorial: {
                alternatives: newAlts,
              },
              nowMs: NOW,
            });
            console.log(`✓ Convex Mutual Link: Added '${toolToIngest.slug}' to '${altSlug}' alternatives -> [${newAlts.join(", ")}]`);
          }
        }
      }
    } catch (err: any) {
      console.log(`ℹ Convex Mutual Link info for '${altSlug}': ${err.message}`);
    }
  }

  // 6. Verify newly added tool in Convex
  console.log("\nVerifying in Convex...");
  const checkRes: any = await convex.query(api.tools.detail, { slug: toolToIngest.slug });
  if ("error" in checkRes) {
    throw new Error(`Verification failed in Convex for ${toolToIngest.slug}: ${checkRes.error}`);
  }

  console.log(`✓ SUCCESS: ${checkRes.name} verified live in Convex!`);
  console.log(`  - Category: ${checkRes.category?.name}`);
  console.log(`  - Alternatives: ${(checkRes.alternatives ?? []).map((a: any) => a.name).join(", ") || "None"}`);

  // 7. Update docs/curated-tool-recommendations.md
  await updateCuratedDocs(toolToIngest.slug);
}

main()
  .catch((err) => {
    console.error("Execution failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
