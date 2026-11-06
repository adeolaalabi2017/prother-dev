/**
 * Batch 7 Ingestion: 10 Major High-Impact AI Tools
 * 1. Lovable (lovable) - generative-content
 * 2. Mistral AI (mistral-ai) - ai-models
 * 3. Together AI (together-ai) - dev-platforms
 * 4. Tavily (tavily) - dev-platforms
 * 5. Exa (exa-ai) - dev-platforms
 * 6. fal.ai (fal-ai) - dev-platforms
 * 7. Cerebras Inference (cerebras) - dev-platforms
 * 8. AssemblyAI (assemblyai) - nlp-text
 * 9. Voyage AI (voyage-ai) - dev-platforms
 * 10. Jina AI (jina-ai) - dev-platforms
 */

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

export const TOOLS_BATCH_7 = [
  // 1. Lovable
  {
    id: "cmucrh2batch7lovable000001",
    slug: "lovable",
    name: "Lovable",
    tagline: "Natural language full stack web application builder",
    description: "Lovable is an AI software engineer that designs, codes, and deploys full stack web applications from natural language prompts, with integrated Supabase backends and GitHub synchronization.",
    websiteUrl: "https://lovable.dev",
    logoEmoji: "❤️",
    logoGradient: "from-rose-500 via-orange-500 to-amber-500",
    logoUrl: "/logos/lovable.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$20/month",
    pricingNote: "Free starter tier with monthly edit credits; Pro plans start at $20/month for active development.",
    hasApi: false,
    docsUrl: "https://docs.lovable.dev",
    tagsPipe: "full-stack|react|supabase|app-builder|developer-tools",
    editorsPick: true,
    curated: true,
    makerHandle: "lovable",
    status: "live",
    editorial: {
      longDescription: "Lovable acts as a virtual full-stack developer that builds production-ready React applications from conversational descriptions. By orchestrating UI generation, state management, Supabase database schemas, authentication, and edge functions, it lets creators and engineers go from concept to working software in minutes. Projects remain standard codebases with bidirectional GitHub synchronization.",
      useCases: [
        "Rapidly prototyping and deploying production web applications and MVPs",
        "Building database-backed dashboards with authentication and Supabase persistence",
        "Iteratively designing responsive UI components through conversational prompts"
      ],
      pros: [
        "Outputs clean, modern React code rather than proprietary lock-in structures",
        "Direct one-click deployment and two-way GitHub repository integration",
        "Seamless native integration with Supabase for databases, auth, and storage"
      ],
      cons: [
        "Complex enterprise architectures still require manual engineering oversight",
        "Heavy usage can exhaust free starter generation credits quickly"
      ]
    }
  },

  // 2. Mistral AI
  {
    id: "cmucrh2batch7mistral000002",
    slug: "mistral-ai",
    name: "Mistral AI",
    tagline: "Frontier open-weight and commercial multilingual foundation models",
    description: "Mistral AI develops state of the art open and commercial AI models, including Mistral Large, Codestral, and Pixtral, alongside the conversational platform Le Chat and enterprise developer API.",
    websiteUrl: "https://mistral.ai",
    logoEmoji: "🌪️",
    logoGradient: "from-amber-500 via-orange-500 to-red-600",
    logoUrl: "/logos/mistral-ai.svg",
    categoryId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "freemium",
    startingPrice: "$0.002/1k tokens",
    pricingNote: "Free tier for Le Chat web interface; developer API pricing based on token usage.",
    hasApi: true,
    docsUrl: "https://docs.mistral.ai",
    tagsPipe: "llm|foundation-models|open-weight|codestral|api",
    editorsPick: true,
    curated: true,
    makerHandle: "mistralai",
    status: "live",
    editorial: {
      longDescription: "Mistral AI is a leading European artificial intelligence lab known for high-efficiency foundation models that compete directly with proprietary frontier systems. Their lineup features open-weight powerhouses like Mistral 7B and Mixtral alongside flagship commercial models including Mistral Large, Codestral for software development, and Pixtral for multimodal reasoning, accessible via cloud APIs or self-hosted deployments.",
      useCases: [
        "Powering enterprise conversational agents and multilingual customer support",
        "Accelerating code completion and automated refactoring with Codestral",
        "Deploying privacy-compliant, self-hosted open-weight LLMs in local infrastructure"
      ],
      pros: [
        "Exceptional compute-to-performance efficiency with mixture-of-experts architectures",
        "Strong open-source ethos allowing weights to be inspected and fine-tuned locally",
        "Rigorous multilingual and coding benchmark performance across model sizes"
      ],
      cons: [
        "Flagship Mistral Large remains proprietary and requires cloud API access",
        "Ecosystem tooling is growing rapidly but smaller than OpenAI or Anthropic"
      ]
    }
  },

  // 3. Together AI
  {
    id: "cmucrh2batch7together00003",
    slug: "together-ai",
    name: "Together AI",
    tagline: "Fast cloud inference and fine-tuning for open source AI models",
    description: "Together AI is a cloud acceleration platform providing ultra-fast inference engines, dedicated endpoints, and fine-tuning infrastructure for leading open-source models like Llama 3, DeepSeek, and FLUX.",
    websiteUrl: "https://together.ai",
    logoEmoji: "🤝",
    logoGradient: "from-fuchsia-500 via-purple-500 to-indigo-600",
    logoUrl: "/logos/together-ai.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0.20/1M tokens",
    pricingNote: "Free credit on signup; pay-as-you-go pricing starting at pennies per million tokens.",
    hasApi: true,
    docsUrl: "https://docs.together.ai",
    tagsPipe: "inference|cloud|open-source|fine-tuning|gpu",
    editorsPick: false,
    curated: true,
    makerHandle: "togetherai",
    status: "live",
    editorial: {
      longDescription: "Together AI offers high-performance cloud infrastructure designed specifically for running, fine-tuning, and scaling open-source generative AI. Through proprietary inference kernel optimizations, Together Inference delivers industry-leading token generation speeds for text, image, and code models, backed by dedicated GPU clusters and a unified OpenAI-compatible REST API.",
      useCases: [
        "Serving high-throughput open-source LLMs like Llama 3 and Qwen at sub-second latency",
        "Running low-latency text-to-image synthesis pipelines with FLUX and SDXL",
        "Fine-tuning custom foundation models on private datasets with automated checkpoints"
      ],
      pros: [
        "Industry-leading inference speeds with custom FlashAttention and kernel optimizations",
        "Drop-in OpenAI API compatibility makes migrating existing applications trivial",
        "Broad catalog of pre-hosted open models available for immediate deployment"
      ],
      cons: [
        "Shared endpoint latency can experience minor variance during peak traffic hours",
        "Dedicated GPU clusters require higher monthly spending commitments"
      ]
    }
  },

  // 4. Tavily
  {
    id: "cmucrh2batch7tavily000004",
    slug: "tavily",
    name: "Tavily",
    tagline: "Search engine and factual retrieval API built for AI agents",
    description: "Tavily is a search intelligence API tailored for autonomous AI agents and LLM applications, delivering clean, synthesized, and source-attributed web data optimized for context windows.",
    websiteUrl: "https://tavily.com",
    logoEmoji: "🧭",
    logoGradient: "from-blue-500 via-cyan-500 to-emerald-500",
    logoUrl: "/logos/tavily.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$29/month",
    pricingNote: "Free tier includes 1,000 search API requests per month; paid plans from $29/month.",
    hasApi: true,
    docsUrl: "https://docs.tavily.com",
    tagsPipe: "search-api|rag|ai-agents|web-search|retrieval",
    editorsPick: true,
    curated: true,
    makerHandle: "tavily",
    status: "live",
    editorial: {
      longDescription: "Tavily Search API bridges autonomous LLM agents with real-time web knowledge. Unlike standard search APIs built for humans, Tavily scrapes, parses, filters out ads, and extracts raw factual content from multiple sources in a single call, returning concise, structured payloads that fit directly into prompt context windows without manual scraping pipelines.",
      useCases: [
        "Equipping autonomous AI agents with real-time web grounding and verification",
        "Enriching Retrieval-Augmented Generation (RAG) pipelines with up-to-date web facts",
        "Automating competitor research and news aggregation workflows without rate limits"
      ],
      pros: [
        "Designed specifically for LLM context limits with pre-cleaned, high-signal text",
        "First-class integrations with LangChain, LlamaIndex, AutoGPT, and CrewAI",
        "Aggregates and cross-references multiple source URLs in a single API call"
      ],
      cons: [
        "Higher cost per query compared to basic raw HTML web search endpoints",
        "Free monthly allotment of 1,000 queries is limited for high-volume scrapers"
      ]
    }
  },

  // 5. Exa
  {
    id: "cmucrh2batch7exa00000005",
    slug: "exa-ai",
    name: "Exa",
    tagline: "Neural search engine built for artificial intelligence and agents",
    description: "Exa is an embeddings-based search engine designed from scratch for LLMs, enabling semantic web queries, page similarity discovery, and raw clean content extraction.",
    websiteUrl: "https://exa.ai",
    logoEmoji: "🔍",
    logoGradient: "from-blue-600 via-indigo-600 to-violet-600",
    logoUrl: "/logos/exa-ai.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$20/month",
    pricingNote: "Free tier with 1,000 searches per month; pay-as-you-go and custom enterprise tiers available.",
    hasApi: true,
    docsUrl: "https://docs.exa.ai",
    tagsPipe: "neural-search|embeddings|rag|web-scraping|api",
    editorsPick: false,
    curated: true,
    makerHandle: "exa",
    status: "live",
    editorial: {
      longDescription: "Exa (formerly Metaphor) rethinks search for artificial intelligence by organizing the entire web through custom neural embedding models. Instead of relying on keyword matching, Exa understands the semantic meaning of natural language queries, allowing developers to search for concepts, find similar URLs, and retrieve full cleaned page contents programmatically.",
      useCases: [
        "Performing semantic web discovery based on meaning rather than exact keywords",
        "Finding web pages similar to a reference URL for automated competitive analysis",
        "Extracting pristine markdown content from search results for immediate LLM parsing"
      ],
      pros: [
        "Understands nuanced, natural language questions that traditional search engines fail",
        "Find-similar-links feature uncovers non-obvious niche sources effortlessly",
        "Provides both neural and keyword search modes with flexible domain filtering"
      ],
      cons: [
        "Semantic matching can occasionally return tangentially related niche pages",
        "Specialized API parameters require slight learning curve over standard Google APIs"
      ]
    }
  },

  // 6. fal.ai
  {
    id: "cmucrh2batch7fal000000006",
    slug: "fal-ai",
    name: "fal.ai",
    tagline: "Generative media inference platform for modern developers",
    description: "fal.ai provides low-latency cloud infrastructure for running generative media models, specializing in lightning-fast text-to-image, video synthesis, and real-time audio generation.",
    websiteUrl: "https://fal.ai",
    logoEmoji: "⚡",
    logoGradient: "from-rose-500 via-pink-600 to-purple-600",
    logoUrl: "/logos/fal-ai.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0.001/image",
    pricingNote: "Free trial credits on signup; per-generation billing based on GPU compute seconds.",
    hasApi: true,
    docsUrl: "https://docs.fal.ai",
    tagsPipe: "generative-media|flux|image-generation|gpu-cloud|api",
    editorsPick: true,
    curated: true,
    makerHandle: "fal",
    status: "live",
    editorial: {
      longDescription: "fal.ai is an serverless generative media platform engineered for high-performance AI media workflows. Developers can deploy or invoke state-of-the-art vision models like FLUX.1, SDXL, Stable Video Diffusion, and Whisper through sub-second API endpoints, with real-time WebSocket streaming capabilities built in.",
      useCases: [
        "Generating real-time interactive visuals in web and mobile applications",
        "Running FLUX.1 image synthesis pipelines at production scale with sub-second speeds",
        "Transcribing long-form audio files with high-throughput Whisper batching"
      ],
      pros: [
        "Extremely fast cold-start and generation times for complex diffusion models",
        "First-class WebSocket support for real-time live drawing and streaming canvas apps",
        "Simple pay-per-compute pricing model without expensive monthly GPU lock-in"
      ],
      cons: [
        "Requires developer expertise to build frontend interfaces around the API endpoints",
        "High-resolution video synthesis models can consume credits quickly"
      ]
    }
  },

  // 7. Cerebras Inference
  {
    id: "cmucrh2batch7cerebras0007",
    slug: "cerebras",
    name: "Cerebras Inference",
    tagline: "Wafer scale AI engine serving 2,000+ tokens per second",
    description: "Cerebras Inference powers instantaneous LLM generation using the CS-3 Wafer-Scale Engine, delivering unprecedented throughput for real-time AI agents and conversational interfaces.",
    websiteUrl: "https://cerebras.ai",
    logoEmoji: "🧠",
    logoGradient: "from-orange-500 via-amber-500 to-yellow-500",
    logoUrl: "/logos/cerebras.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0.10/1M tokens",
    pricingNote: "Free developer tier with daily rate limits; paid usage-based plans for production workloads.",
    hasApi: true,
    docsUrl: "https://inference-docs.cerebras.ai",
    tagsPipe: "hardware|ultra-fast-inference|wafer-scale|llama-3|developer-api",
    editorsPick: true,
    curated: true,
    makerHandle: "cerebras",
    status: "live",
    editorial: {
      longDescription: "Cerebras Inference is built atop the revolutionary Wafer-Scale Engine (CS-3), a single silicon chip hosting 900,000 AI cores. By bypassing traditional GPU memory bandwidth bottlenecks, Cerebras serves open-weight models like Llama 3.1 and Llama 3.3 at over 2,000 tokens per second, enabling real-time complex reasoning and voice workflows that previously suffered from latency lag.",
      useCases: [
        "Powering real-time voice bots that require instantaneous conversational response",
        "Executing multi-step automated agent loops with dozens of intermediate LLM reflections",
        "Summarizing massive code repositories and transcripts in sub-second bursts"
      ],
      pros: [
        "Unmatched token generation speeds (up to 20x faster than traditional GPU clouds)",
        "Standard OpenAI-compatible API interface allows instant drop-in integration",
        "Generous free developer tier for testing and validating throughput gains"
      ],
      cons: [
        "Catalog currently focuses primarily on top open-weight models like Llama",
        "Regional data center availability is expanding but more concentrated than AWS"
      ]
    }
  },

  // 8. AssemblyAI
  {
    id: "cmucrh2batch7assemblyai08",
    slug: "assemblyai",
    name: "AssemblyAI",
    tagline: "Production speech to text and voice intelligence API",
    description: "AssemblyAI provides production-grade speech-to-text, speaker diarization, audio summarization, and sentiment analysis APIs powered by the Conformer-2 and Universal-1 speech models.",
    websiteUrl: "https://assemblyai.com",
    logoEmoji: "🎙️",
    logoGradient: "from-blue-600 via-indigo-600 to-sky-500",
    logoUrl: "/logos/assemblyai.svg",
    categoryId: CATEGORY_MAP.NLP_TEXT,
    d1CategoryId: D1_CATEGORY_MAP.NLP_TEXT,
    pricingModel: "freemium",
    startingPrice: "$0.15/hour",
    pricingNote: "Free tier with $50 in credits; pay-as-you-go transcription from $0.15 per audio hour.",
    hasApi: true,
    docsUrl: "https://www.assemblyai.com/docs",
    tagsPipe: "speech-to-text|audio-intelligence|transcription|voice-ai|api",
    editorsPick: false,
    curated: true,
    makerHandle: "assemblyai",
    status: "live",
    editorial: {
      longDescription: "AssemblyAI builds AI models that accurately transcribe and understand speech. Beyond basic speech-to-text, their API includes advanced audio intelligence capabilities such as speaker identification (diarization), automated topic detection, PII redaction, chapter creation, and sentiment analysis for podcasts, customer support calls, and video archives.",
      useCases: [
        "Transcribing podcasts, meetings, and interviews with precise speaker labels",
        "Redacting sensitive financial and personal identification data from customer calls",
        "Generating automated video subtitles and searchable audio indexes at scale"
      ],
      pros: [
        "Industry-leading accuracy with specialized Universal-1 and Conformer architectures",
        "Comprehensive suite of audio intelligence features like PII redaction and chapters",
        "Robust streaming real-time transcription with low-latency WebSockets"
      ],
      cons: [
        "Niche dialect and multi-speaker overlapping accuracy still requires clean audio",
        "Advanced LLM audio intelligence features incur additional per-request costs"
      ]
    }
  },

  // 9. Voyage AI
  {
    id: "cmucrh2batch7voyage000009",
    slug: "voyage-ai",
    name: "Voyage AI",
    tagline: "State of the art vector embeddings and neural rerankers",
    description: "Voyage AI creates industry-leading vector embedding and reranking models custom-tailored for code, legal, finance, and multilingual retrieval, directly integrated into LangChain and Anthropic.",
    websiteUrl: "https://voyageai.com",
    logoEmoji: "⛵",
    logoGradient: "from-teal-500 via-emerald-600 to-cyan-600",
    logoUrl: "/logos/voyage-ai.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0.02/1M tokens",
    pricingNote: "50 million free tokens upon account creation; pay-as-you-go per million tokens thereafter.",
    hasApi: true,
    docsUrl: "https://docs.voyageai.com",
    tagsPipe: "embeddings|reranking|vector-search|rag|enterprise-ai",
    editorsPick: false,
    curated: true,
    makerHandle: "voyageai",
    status: "live",
    editorial: {
      longDescription: "Voyage AI specializes in high-fidelity vector representation models designed specifically to maximize Retrieval-Augmented Generation (RAG) precision. Co-founded by leading Stanford researchers, Voyage provides specialized embedding models for general text, programming languages, finance, and legal contracts, consistently outperforming generic baselines on retrieval benchmarks.",
      useCases: [
        "Supercharging RAG retrieval accuracy across technical and enterprise documentation",
        "Implementing semantic code search across large GitHub repositories and codebases",
        "Reranking candidate search documents to filter false positives before LLM ingestion"
      ],
      pros: [
        "Consistently ranks at the top of domain retrieval and MTEB embedding benchmarks",
        "Recommended by Anthropic as the premier embedding partner for Claude applications",
        "Extremely generous 50 million free token onboarding tier for developers"
      ],
      cons: [
        "Requires embedding re-indexing if switching from older OpenAI embedding models",
        "Hyper-specialized on embeddings and reranking rather than end-to-end chat"
      ]
    }
  },

  // 10. Jina AI
  {
    id: "cmucrh2batch7jina00000010",
    slug: "jina-ai",
    name: "Jina AI",
    tagline: "Multimodal embeddings, rerankers, and reader API for LLMs",
    description: "Jina AI provides search foundation models including 8K-context text and image embeddings, neural rerankers, and the Reader API which turns any web URL into LLM-friendly clean markdown.",
    websiteUrl: "https://jina.ai",
    logoEmoji: "🧬",
    logoGradient: "from-emerald-500 via-teal-600 to-cyan-700",
    logoUrl: "/logos/jina-ai.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0.02/1M tokens",
    pricingNote: "1 million free tokens for all models; free rate-limited Reader API without authentication.",
    hasApi: true,
    docsUrl: "https://jina.ai/embeddings",
    tagsPipe: "embeddings|reranker|web-reader|multimodal|search",
    editorsPick: false,
    curated: true,
    makerHandle: "jina",
    status: "live",
    editorial: {
      longDescription: "Jina AI develops foundation models for multimodal search and retrieval. Their popular offerings include 8,192-token context embeddings (jina-embeddings-v3), state-of-the-art cross-encoders for reranking, and Jina Reader (r.jina.ai), a widely-used free web service that converts any standard website or PDF into clean, token-efficient markdown for LLM consumption.",
      useCases: [
        "Scraping and converting complex web pages into LLM-ready markdown using Jina Reader",
        "Embedding long documents (up to 8k tokens) without chunking or truncation artifacts",
        "Cross-modal retrieval matching text queries against image and visual datasets"
      ],
      pros: [
        "Jina Reader is one of the easiest ways to convert web links into clean markdown",
        "Native 8,192-token context length accommodates full articles in single embeddings",
        "Strong multilingual support across European and Asian language families"
      ],
      cons: [
        "Heavy Reader usage requires an API key to avoid shared public rate limits",
        "Large model options require sufficient memory when self-hosting open weights"
      ]
    }
  }
];

// Check all invariants automatically upon import
checkInvariants(TOOLS_BATCH_7);
