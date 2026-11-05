/**
 * Batch 6 Ingestion: 10 Major High-Impact AI Tools
 * 1. v0 (v0) - generative-content
 * 2. Bolt.new (bolt-new) - dev-platforms
 * 3. Phind (phind) - conversational-ai
 * 4. Cohere (cohere) - ai-models
 * 5. Chroma (chroma) - dev-platforms
 * 6. Weaviate (weaviate) - dev-platforms
 * 7. Weights & Biases (wandb) - data-analytics
 * 8. LangSmith (langsmith) - automation
 * 9. Gradio (gradio) - dev-platforms
 * 10. Krea AI (krea-ai) - generative-content
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

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

export const TOOLS_BATCH_6 = [
  // 1. v0
  {
    id: "cmucrh2batch6v0000000000001",
    slug: "v0",
    name: "v0",
    tagline: "Generative UI assistant and frontend component synthesis engine by Vercel",
    description: "v0 is an AI-powered generative user interface system that creates production-ready React, Tailwind CSS, and shadcn/ui components from conversational prompts and design references.",
    websiteUrl: "https://v0.dev",
    docsUrl: "https://v0.dev/faq",
    categoryLegacyId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free tier with recurring monthly generation credits; Premium and Enterprise tiers available for team collaboration.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-zinc-900 to-zinc-700",
    logoUrl: "/logos/v0.svg",
    tagsPipe: "generative-ui|react|tailwind|frontend|shadcn-ui|vercel|code-generation",
    makerHandle: "@v0",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "v0 by Vercel transforms natural language prompts into clean, modular frontend interfaces. Leveraging modern component libraries such as shadcn/ui and Tailwind CSS, v0 allows engineers to preview component variations, copy accessible source code directly, and integrate components seamlessly into Next.js applications.",
      useCases: [
        {
          title: "Rapid interactive component prototyping",
          body: "Describe complex web layouts, forms, and data tables to receive fully typed React component code.",
        },
        {
          title: "Design system scaffolding",
          body: "Standardize UI patterns and token styling quickly across engineering teams.",
        },
        {
          title: "Responsive layout exploration",
          body: "Iterate across mobile, tablet, and desktop breakpoints before committing to production repositories.",
        },
      ],
      pros: [
        "Produces clean, accessible code adhering to shadcn/ui and Tailwind standards",
        "Interactive canvas preview with instant code copy and one-click code iteration",
        "Deep integration with Next.js and Vercel hosting ecosystem",
      ],
      cons: [
        "Focuses primarily on frontend presentation layers rather than backend business logic",
        "Complex domain-specific interactions may require post-generation manual adjustments",
      ],
    },
  },

  // 2. Bolt.new
  {
    id: "cmucrh2batch6boltnew00000002",
    slug: "bolt-new",
    name: "Bolt.new",
    tagline: "In-browser full-stack AI development sandbox with WebContainers runtime",
    description: "Bolt.new is an AI-powered development environment that allows developers to prompt, build, run, and deploy full-stack web applications entirely inside the browser using WebContainers.",
    websiteUrl: "https://bolt.new",
    docsUrl: "https://stackblitz.com/docs",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free daily tokens for web development; Pro subscription unlocks extended token quotas and advanced LLM selection.",
    hasApi: false,
    logoEmoji: "⚡",
    logoGradient: "from-blue-600 to-indigo-600",
    logoUrl: "/logos/bolt-new.svg",
    tagsPipe: "in-browser-ide|webcontainers|full-stack|ai-sandbox|stackblitz|code-generation",
    makerHandle: "@bolt_new",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Bolt.new by StackBlitz provides an AI-assisted development sandbox operating entirely within browser WebContainers. Unlike environments that merely stream code, Bolt.new runs a live Node.js runtime locally inside your browser tab, executing npm dependencies, building full-stack servers, and offering instantaneous hot module reloading.",
      useCases: [
        {
          title: "End-to-end full-stack prototyping",
          body: "Scaffold full-stack apps with frontend UI, backend endpoints, and client databases from scratch.",
        },
        {
          title: "Dependency debugging and package evaluation",
          body: "Test open-source packages and frameworks without downloading repositories to your local workstation.",
        },
        {
          title: "Instant one-click cloud deployment",
          body: "Publish working web applications directly to Netlify or GitHub without terminal configuration.",
        },
      ],
      pros: [
        "Full Node.js runtime inside the browser tab via WebContainers technology",
        "Zero setup time without requiring local Docker or Node environment installation",
        "Real-time live application preview alongside code inspector",
      ],
      cons: [
        "Limited to browser-compatible Node.js runtimes (native C++ bindings not supported)",
        "Token consumption can be rapid during heavy multi-file refactoring runs",
      ],
    },
  },

  // 3. Phind
  {
    id: "cmucrh2batch6phind0000000003",
    slug: "phind",
    name: "Phind",
    tagline: "AI-powered search engine and technical answer engine optimized for developers",
    description: "Phind is an intelligent search and discovery engine tuned specifically for programmers, retrieving web documentation, code snippets, and explanations to solve complex technical questions.",
    websiteUrl: "https://www.phind.com",
    docsUrl: "https://www.phind.com",
    categoryLegacyId: CATEGORY_MAP.CONVERSATIONAL_AI,
    d1CategoryId: D1_CATEGORY_MAP.CONVERSATIONAL_AI,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free access with standard technical search; Phind Pro tier provides access to frontier models and expanded context windows.",
    hasApi: true,
    logoEmoji: "🔍",
    logoGradient: "from-blue-700 to-cyan-600",
    logoUrl: "/logos/phind.svg",
    tagsPipe: "developer-search|answer-engine|technical-qa|ai-assistant|code-search|programming",
    makerHandle: "@phindsearch",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Phind serves as a dedicated answer engine for developers, combining live web search across documentation repositories, GitHub issues, and technical articles with specialized code-tuned LLMs. It directly synthesizes tested code snippets with precise attribution links to primary documentation.",
      useCases: [
        {
          title: "Technical documentation discovery",
          body: "Find syntax examples and breaking changes across newly released APIs and developer libraries.",
        },
        {
          title: "Complex error stack trace diagnosis",
          body: "Paste terminal crash logs to identify root causes and specific patch implementations.",
        },
        {
          title: "Architectural comparison",
          body: "Evaluate tradeoffs between competing backend libraries and data schemas.",
        },
      ],
      pros: [
        "Up-to-date search index with direct citations to original documentation",
        "Code-first response formatting with syntax highlighting and copy shortcuts",
        "VS Code extension integration for in-editor queries",
      ],
      cons: [
        "Focuses strictly on programming questions rather than general knowledge topics",
        "Free tier may throttle response rates during peak global usage hours",
      ],
    },
  },

  // 4. Cohere
  {
    id: "cmucrh2batch6cohere000000004",
    slug: "cohere",
    name: "Cohere",
    tagline: "Enterprise foundation models, multilingual embeddings, and state-of-the-art reranking APIs",
    description: "Cohere builds secure enterprise foundation models including the Command R family, industry-standard multilingual vector embeddings, and semantic rerankers for mission-critical search.",
    websiteUrl: "https://cohere.com",
    docsUrl: "https://docs.cohere.com",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free trial API key for developers; Pay-as-you-go pricing per token and private enterprise VPC deployments.",
    hasApi: true,
    logoEmoji: "🌿",
    logoGradient: "from-emerald-700 to-teal-600",
    logoUrl: "/logos/cohere.svg",
    tagsPipe: "foundation-models|enterprise-ai|reranker|embeddings|command-r|multilingual-nlp",
    makerHandle: "@cohere",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Cohere specializes in high-performance enterprise natural language processing solutions. Its flagship Command R and Command R+ models excel at Retrieval-Augmented Generation (RAG) and tool use, while its Embed v3 and Rerank APIs set the standard for high-accuracy multilingual information retrieval.",
      useCases: [
        {
          title: "Semantic search and RAG retrieval optimization",
          body: "Deploy Cohere Rerank to re-order top retrieval candidates for dramatic relevance boosts.",
        },
        {
          title: "Multilingual enterprise knowledge management",
          body: "Embed and search corporate documents across 100+ languages simultaneously with Embed v3.",
        },
        {
          title: "Data-private enterprise agent orchestration",
          body: "Run Command models inside private cloud infrastructures like AWS Bedrock, GCP, and Azure.",
        },
      ],
      pros: [
        "Industry-leading Rerank model delivering superior retrieval accuracy for RAG pipelines",
        "High data privacy standards with cloud-agnostic deployment options (AWS, Azure, OCI)",
        "State-of-the-art multilingual embedding performance across diverse domains",
      ],
      cons: [
        "Primarily geared toward enterprise workflows rather than consumer chat experiences",
        "Token pricing on largest frontier models requires careful budget management",
      ],
    },
  },

  // 5. Chroma
  {
    id: "cmucrh2batch6chroma000000005",
    slug: "chroma",
    name: "Chroma",
    tagline: "Open-source embedding database for AI applications and vector search",
    description: "Chroma is an open-source, AI-native vector database designed to make it simple to build LLM applications with embeddings, semantic search, document filtering, and full multimodal indexing.",
    websiteUrl: "https://www.trychroma.com",
    docsUrl: "https://docs.trychroma.com",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "100% open-source under Apache 2.0 license. Chroma Cloud managed service available for production clusters.",
    hasApi: true,
    logoEmoji: "🎨",
    logoGradient: "from-amber-500 to-red-500",
    logoUrl: "/logos/chroma.svg",
    tagsPipe: "vector-database|embeddings|rag|semantic-search|open-source|python|javascript",
    makerHandle: "@trychroma",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Chroma is an open-source vector database engineered for simplicity and developer velocity. Designed to run both in-memory, embedded within local Python or TypeScript processes, and as a distributed client-server architecture, Chroma empowers engineers to add semantic search and memory to AI applications in minutes.",
      useCases: [
        {
          title: "Local development and rapid prototyping",
          body: "Spin up a lightweight embedded vector database inside a notebook or local script with zero infrastructure overhead.",
        },
        {
          title: "Retrieval-Augmented Generation memory layer",
          body: "Store user interaction history, document chunks, and embeddings for quick contextual recall.",
        },
        {
          title: "Multimodal asset search",
          body: "Index and retrieve image, audio, and text embeddings using standard similarity metrics.",
        },
      ],
      pros: [
        "Lightweight in-memory mode runs with zero external database dependencies",
        "First-class SDK support for both Python and TypeScript / JavaScript",
        "Permissive Apache 2.0 open-source license with active community support",
      ],
      cons: [
        "Horizontal scaling at massive scale (billions of vectors) requires distributed cluster setup",
        "Less complex query DSL compared to relational search engines",
      ],
    },
  },

  // 6. Weaviate
  {
    id: "cmucrh2batch6weaviate00000006",
    slug: "weaviate",
    name: "Weaviate",
    tagline: "Open-source vector search engine with hybrid search and multimodal indexing",
    description: "Weaviate is an open-source vector search engine that stores both objects and vectors, combining keyword search with vector embeddings to deliver fast, production-grade hybrid retrieval.",
    websiteUrl: "https://weaviate.io",
    docsUrl: "https://weaviate.io/developers/weaviate",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source under BSD-3-Clause license. Serverless Weaviate Cloud and dedicated enterprise instances available.",
    hasApi: true,
    logoEmoji: "📦",
    logoGradient: "from-emerald-600 to-green-500",
    logoUrl: "/logos/weaviate.svg",
    tagsPipe: "vector-search|hybrid-search|rag|semantic-search|open-source|embeddings",
    makerHandle: "@weaviate_io",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Weaviate is an open-source vector database designed for production-scale generative search. Featuring native support for hybrid search (combining dense vectors with BM25 keyword matching), integrated ML vectorization modules, and GraphQL and gRPC APIs, Weaviate handles billions of objects reliably.",
      useCases: [
        {
          title: "Enterprise hybrid search systems",
          body: "Blend dense semantic vectors with sparse BM25 keyword matching for optimal search relevance.",
        },
        {
          title: "Multimodal recommendation engines",
          body: "Index text, images, and audio objects into unified high-dimensional vector spaces.",
        },
        {
          title: "Production RAG architectures",
          body: "Store massive knowledge repositories with automated vector indexing and metadata filtering.",
        },
      ],
      pros: [
        "Native hybrid search combining sparse BM25 and dense vector ranking out of the box",
        "High-performance gRPC interfaces for millisecond query response times",
        "Extensive ecosystem of native embedding modules and vectorizers",
      ],
      cons: [
        "More complex operational footprint than lightweight embedded databases",
        "Requires dedicated RAM allocation for in-memory HNSW index structures",
      ],
    },
  },

  // 7. Weights & Biases
  {
    id: "cmucrh2batch6wandb0000000007",
    slug: "wandb",
    name: "Weights & Biases",
    tagline: "Machine learning platform for experiment tracking, model evaluation, and LLMOps",
    description: "Weights & Biases is the developer-first platform for machine learning practitioners to track experiments, version datasets and models, visualize training metrics, and evaluate LLM pipelines.",
    websiteUrl: "https://wandb.ai",
    docsUrl: "https://docs.wandb.ai",
    categoryLegacyId: CATEGORY_MAP.DATA_ANALYTICS,
    d1CategoryId: D1_CATEGORY_MAP.DATA_ANALYTICS,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Generous free tier for academic and individual research; Team and Enterprise subscriptions for shared workspaces.",
    hasApi: true,
    logoEmoji: "📊",
    logoGradient: "from-amber-500 to-yellow-500",
    logoUrl: "/logos/wandb.svg",
    tagsPipe: "llmops|experiment-tracking|model-evaluation|machine-learning|dataset-versioning",
    makerHandle: "@weights_biases",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Weights & Biases (W&B) is the industry standard MLOps and LLMOps platform trusted by research labs and enterprise AI teams worldwide. By adding a few lines of Python code, engineers automatically track hyperparameters, hardware utilization, model checkpoints, and evaluation results in collaborative dashboards.",
      useCases: [
        {
          title: "Deep learning experiment tracking",
          body: "Log loss curves, gradients, and model artifacts across multi-GPU distributed training clusters.",
        },
        {
          title: "Prompt engineering and LLM evaluation",
          body: "Version prompt templates, inspect trace latencies, and run regression benchmark evaluations.",
        },
        {
          title: "Dataset lineage and artifact versioning",
          body: "Track data transformations and provenance from raw inputs to final trained model weights.",
        },
      ],
      pros: [
        "Gold standard experiment tracking integration across PyTorch, Hugging Face, and TensorFlow",
        "Rich visualization dashboards and real-time GPU/CPU hardware monitoring",
        "Robust artifact versioning and collaborative team reporting capabilities",
      ],
      cons: [
        "Dashboard setup can be overwhelming for beginners with simple linear regression tasks",
        "Enterprise cloud and on-premise licensing requires commercial sales engagement",
      ],
    },
  },

  // 8. LangSmith
  {
    id: "cmucrh2batch6langsmith000008",
    slug: "langsmith",
    name: "LangSmith",
    tagline: "Production observability, tracing, and evaluation suite for LLM agent workflows",
    description: "LangSmith provides complete lifecycle observability for LLM applications and autonomous agents, allowing engineering teams to trace token calls, monitor latency, debug prompts, and automate evaluations.",
    websiteUrl: "https://www.langchain.com/langsmith",
    docsUrl: "https://docs.smith.langchain.com",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free Developer tier includes up to 5,000 trace steps per month; Plus and Enterprise plans for production scale.",
    hasApi: true,
    logoEmoji: "🦜",
    logoGradient: "from-teal-600 to-emerald-500",
    logoUrl: "/logos/langsmith.svg",
    tagsPipe: "observability|tracing|prompt-debugging|llm-evaluation|agent-monitoring|langchain",
    makerHandle: "@langchainai",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "LangSmith by LangChain is a purpose-built observability and evaluation platform for AI agents and LLM applications. It provides deep visibility into complex agent reasoning chains, tool invocations, and prompt histories, helping developers debug edge cases and ship reliable AI products.",
      useCases: [
        {
          title: "Multi-step agent execution tracing",
          body: "Visualize recursive agent reasoning loops, tool calls, and error recoveries with detailed flamegraphs.",
        },
        {
          title: "Automated regression testing",
          body: "Evaluate prompt changes against curated test datasets before deploying to production.",
        },
        {
          title: "Production cost and latency monitoring",
          body: "Monitor token expenditures, latency distributions, and rate limits across multiple LLM providers.",
        },
      ],
      pros: [
        "Deep native integration with LangChain, LangGraph, and independent Python/TypeScript frameworks",
        "Detailed visual trace inspection of complex agentic execution trees",
        "Integrated prompt playground with test dataset evaluation loops",
      ],
      cons: [
        "Trace step volumes can grow rapidly in high-throughput customer-facing applications",
        "Best developer experience is achieved when aligned with LangChain idioms",
      ],
    },
  },

  // 9. Gradio
  {
    id: "cmucrh2batch6gradio000000009",
    slug: "gradio",
    name: "Gradio",
    tagline: "Open-source Python library for building interactive machine learning web demos",
    description: "Gradio is an open-source Python library that lets machine learning engineers rapidly build user-friendly web interfaces and interactive shareable demos for any model, API, or data workflow.",
    websiteUrl: "https://www.gradio.app",
    docsUrl: "https://www.gradio.app/docs",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "100% open-source under Apache 2.0 license. Free sharing links and native hosting on Hugging Face Spaces.",
    hasApi: true,
    logoEmoji: "🚀",
    logoGradient: "from-orange-500 to-amber-500",
    logoUrl: "/logos/gradio.svg",
    tagsPipe: "python-library|machine-learning-ui|interactive-demos|model-showcase|huggingface",
    makerHandle: "@gradio",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Gradio is the fastest way to showcase machine learning models with a friendly web interface. With only a few lines of Python, developers can wrap computer vision, audio, text, or multimodal models with responsive sliders, file uploaders, and webcam capture components, generating instant public share links.",
      useCases: [
        {
          title: "Machine learning research demonstration",
          body: "Publish interactive web demos alongside academic papers so researchers can test model checkpoints.",
        },
        {
          title: "Internal model validation interfaces",
          body: "Build rapid internal QA dashboards for non-technical stakeholders to test model outputs.",
        },
        {
          title: "Hugging Face Spaces deployment",
          body: "Deploy lightweight, GPU-backed ML applications on Hugging Face Spaces with one git push.",
        },
      ],
      pros: [
        "Create rich interactive web UIs in under 10 lines of pure Python",
        "Built-in public sharing links with instant tunneling for remote demos",
        "Extensive ecosystem integration across Hugging Face, PyTorch, and Diffusers",
      ],
      cons: [
        "Not intended for highly customized, enterprise-grade multi-page web applications",
        "Custom layout styling requires knowledge of specific Gradio Blocks components",
      ],
    },
  },

  // 10. Krea AI
  {
    id: "cmucrh2batch6kreaai000000010",
    slug: "krea-ai",
    name: "Krea AI",
    tagline: "Real-time generative AI canvas for image generation, enhancement, and video",
    description: "Krea AI is a real-time creative generation suite featuring instant canvas drawing, high-resolution image upscaling, stylistic model training, and AI video synthesis for digital artists and designers.",
    websiteUrl: "https://www.krea.ai",
    docsUrl: "https://www.krea.ai",
    categoryLegacyId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free tier with daily generation credits; Basic, Pro, and Max subscriptions unlock faster generation and video tools.",
    hasApi: false,
    logoEmoji: "🎨",
    logoGradient: "from-fuchsia-600 to-pink-500",
    logoUrl: "/logos/krea-ai.svg",
    tagsPipe: "real-time-generation|ai-canvas|image-upscaling|generative-art|ai-video|creative-tools",
    makerHandle: "@krea_ai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Krea AI redefines creative workflows through real-time generative computing. With its interactive real-time canvas, brush strokes and simple geometry update generative outputs instantly. Combined with advanced AI video generation and photographic image enhancement, Krea serves professional designers and visual storytellers.",
      useCases: [
        {
          title: "Real-time creative concepting",
          body: "Sketch rough shapes and adjust text prompts simultaneously to see instant visual synthesis.",
        },
        {
          title: "High-definition image enhancement and upscaling",
          body: "Enhance low-resolution illustrations and renders into crisp 4K marketing assets.",
        },
        {
          title: "AI video and motion generation",
          body: "Transform static concept art into cinematic animated sequences with camera control.",
        },
      ],
      pros: [
        "Unprecedented real-time canvas feedback with zero waiting for image generation",
        "Exceptional image enhancement algorithm preserving fine texture details",
        "Intuitive split-screen interface designed specifically for visual artists",
      ],
      cons: [
        "Real-time generation requires consistent high-speed internet connectivity",
        "Heavy generation workflows require paid credit packages",
      ],
    },
  },
];

async function main() {
  console.log("=== Validating Invariants for Batch 6 ===");
  checkInvariants(TOOLS_BATCH_6);
  console.log("✓ All 10 tools passed invariant validation (zero em-dashes/en-dashes).");

  console.log("\n=== Ingesting into Convex Production ===");
  for (const tool of TOOLS_BATCH_6) {
    const existing = await convex.query(api.tools.pageData, { slug: tool.slug });
    if (existing && !("error" in existing)) {
      console.log(`Tool ${tool.slug} already exists in Convex, patching...`);
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: existing.tool.id,
        data: {
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          websiteUrl: tool.websiteUrl,
          docsUrl: tool.docsUrl,
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
        logoUrl: tool.logoUrl,
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

  console.log("\n=== Verifying All 10 Tools in Convex ===");
  for (const tool of TOOLS_BATCH_6) {
    const res = await convex.query(api.tools.pageData, { slug: tool.slug });
    if ("error" in res) {
      throw new Error(`Verification failed for ${tool.slug}: ${res.error}`);
    }
    console.log(`✓ Verified ${res.tool.name} [${res.tool.slug}]:`);
    console.log(`    Category: ${res.tool.category.name} (${res.tool.category.slug})`);
    console.log(`    Pricing: ${res.tool.pricingModel} (${res.tool.startingPrice})`);
    console.log(`    Logo: ${res.logoUrl}`);
  }

  console.log("\n🎉 All 10 tools seeded and verified successfully in Convex!");
}

if (process.argv[1] && process.argv[1].endsWith("add-daily-tools-batch-6.ts")) {
  main().catch((err) => {
    console.error("Batch 6 ingestion failed:", err);
    process.exit(1);
  });
}
