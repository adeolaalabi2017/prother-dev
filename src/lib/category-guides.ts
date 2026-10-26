/**
 * Category Buying Guides & Architectural Procurement FAQs
 * Provides human-written evaluation criteria and technical FAQ structured data
 * for each of Prother's 8 core software domains.
 *
 * Adheres strictly to AGENTS.md:
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - Objective, technical criteria for engineers and technical buyers
 */

export type CategoryGuide = {
  headline: string;
  subtypes: { title: string; description: string }[];
  evaluationCriteria: { title: string; criteria: string }[];
  faqs: { q: string; a: string }[];
  relatedCategories: { slug: string; name: string }[];
};

export const CATEGORY_GUIDES: Record<string, CategoryGuide> = {
  "ai-models": {
    headline: "How to evaluate frontier foundation and open-weight models",
    subtypes: [
      {
        title: "Frontier Commercial Models",
        description: "High-parameter hosted checkpoints accessed through managed APIs (Claude, GPT, Gemini), optimized for complex reasoning, code synthesis, and multi-turn planning.",
      },
      {
        title: "Open-Weight Reasoning Architectures",
        description: "Publicly downloadable weights (Llama, DeepSeek, Qwen) that run locally on private accelerators or dedicated cluster infrastructure.",
      },
      {
        title: "Specialized Small Language Models (SLMs)",
        description: "Compact models (1B to 8B parameters) designed for low-latency edge deployment, local function calling, and focused classification tasks.",
      },
    ],
    evaluationCriteria: [
      {
        title: "Context Window & Cache Retrieval",
        criteria: "Verify effective needle-in-a-haystack recall at long token lengths rather than advertised theoretical maximums.",
      },
      {
        title: "Inference Latency & Throughput",
        criteria: "Compare time-to-first-token (TTFT) and sustained tokens-per-second across batch sizes before locking in SLA commitments.",
      },
      {
        title: "Licensing & Commercial Redistribution",
        criteria: "Distinguish between permissive Apache 2.0 / MIT licenses and custom open-weight licenses with monthly active user thresholds.",
      },
    ],
    faqs: [
      {
        q: "What is the primary difference between open-weight and proprietary AI models?",
        a: "Proprietary models are hosted by vendors and billed per token through an API, ensuring zero infrastructure maintenance but leaving data governance in vendor hands. Open-weight models provide downloadable model weights that can be inspected, fine-tuned, and deployed on private clouds for complete data sovereignty.",
      },
      {
        q: "How does context window size affect inference pricing?",
        a: "Larger context windows increase attention compute non-linearly. Most frontier providers charge tiered input rates for contexts exceeding 128k tokens, and prompt caching mechanisms should be used to reduce redundant context ingestion costs.",
      },
      {
        q: "When should an enterprise choose a fine-tuned small model over a frontier model?",
        a: "Small language models (3B to 8B) fine-tuned on domain-specific schema or specialized syntax frequently match frontier model accuracy on narrow tasks while delivering 5x to 10x faster inference at a fraction of hardware costs.",
      },
    ],
    relatedCategories: [
      { slug: "dev-platforms", name: "Developer Frameworks & Infrastructure" },
      { slug: "conversational-ai", name: "Conversational AI & Chatbots" },
    ],
  },

  "conversational-ai": {
    headline: "Selecting conversational interfaces, copilots, and autonomous agents",
    subtypes: [
      {
        title: "General-Purpose Assistants",
        description: "Direct user-facing chat engines equipped with multimodal upload, code interpreter sandboxes, and long-term memory.",
      },
      {
        title: "Grounded Research Copilots",
        description: "Search-augmented answer engines that query live web indexes and provide inline academic and technical citations.",
      },
      {
        title: "Task-Oriented Customer Support Agents",
        description: "Deterministic conversational bots linked to CRM and ticketing systems that execute transactional workflows and refunds.",
      },
    ],
    evaluationCriteria: [
      {
        title: "Grounding & Hallucination Mitigation",
        criteria: "Look for native retrieval-augmented verification and clear confidence scoring on factual technical queries.",
      },
      {
        title: "Tool & Function Calling Reliability",
        criteria: "Check whether the agent reliably parses structured JSON parameters and handles unexpected API return errors.",
      },
      {
        title: "Enterprise Workspace Privacy",
        criteria: "Ensure customer conversations and uploaded corporate documents are excluded from foundation model training datasets.",
      },
    ],
    faqs: [
      {
        q: "Can conversational AI tools be integrated into existing enterprise security systems?",
        a: "Yes. Enterprise-grade conversational platforms support SSO (SAML/Okta), role-based access control (RBAC), and SOC 2 Type II compliance with zero-data-retention guarantees on API endpoints.",
      },
      {
        q: "How do retrieval-augmented copilots differ from standard chat models?",
        a: "Standard chat models generate text strictly from frozen pre-training weights. Retrieval-augmented copilots actively search live indexes or private documentation before generating an answer, supplying verifiable inline citations.",
      },
      {
        q: "What metrics determine conversational bot efficiency?",
        a: "Key production metrics include First Contact Resolution (FCR), tool-call error rates, human handoff percentage, and end-to-end conversation turnaround latency.",
      },
    ],
    relatedCategories: [
      { slug: "ai-models", name: "AI Models" },
      { slug: "automation", name: "Automation & Workflow Orchestration" },
    ],
  },

  "generative-content": {
    headline: "Procurement guidelines for generative image, video, and audio platforms",
    subtypes: [
      {
        title: "Diffusion & Transformer Image Generators",
        description: "Text-to-image and image-to-image engines supporting style adaptation, prompt conditioning, and layer decomposition.",
      },
      {
        title: "Generative Video & Motion Engines",
        description: "High-framerate video synthesis platforms offering camera movement control, character consistency, and frame interpolation.",
      },
      {
        title: "Voice Cloning & Speech Synthesis",
        description: "Zero-shot audio models that generate human speech in dozens of languages with emotional inflection and voice matching.",
      },
    ],
    evaluationCriteria: [
      {
        title: "Commercial Indemnity & Dataset Provenance",
        criteria: "Confirm whether the vendor provides legal indemnification against copyright claims for enterprise commercial output.",
      },
      {
        title: "Temporal & Visual Consistency",
        criteria: "Inspect character seed preservation and background continuity across multi-frame video sequences.",
      },
      {
        title: "Generation Throughput & Resolution",
        criteria: "Evaluate rendering queue latency and whether native 4K upscaling requires expensive secondary credits.",
      },
    ],
    faqs: [
      {
        q: "Are assets generated by AI tools legally safe for commercial advertising?",
        a: "Commercial viability depends on vendor licensing. Enterprise plans from leading generative platforms often include legal copyright indemnity, whereas open-source diffusion models require teams to verify training dataset terms independently.",
      },
      {
        q: "How do teams maintain character consistency in AI-generated video?",
        a: "Consistent video generation typically relies on reference seed tokens, LoRA fine-tuning on custom subject assets, and multi-frame conditioning techniques that carry character geometry across shots.",
      },
      {
        q: "What pricing models dominate generative media tools?",
        a: "Most platforms use token or credit-based consumption tiers, where high-resolution frames, extended video seconds, and fast-track render queues consume credits at different multiplier rates.",
      },
    ],
    relatedCategories: [
      { slug: "computer-vision", name: "Computer Vision" },
      { slug: "nlp-text", name: "NLP & Text Utilities" },
    ],
  },

  "nlp-text": {
    headline: "Evaluating NLP, transcription, translation, and text intelligence software",
    subtypes: [
      {
        title: "Document Parsing & RAG Extractors",
        description: "Computer vision and layout-aware parsers that turn complex nested tables, forms, and PDFs into clean Markdown for LLMs.",
      },
      {
        title: "Neural Machine Translation",
        description: "Context-aware multilingual translation tools tailored for technical documentation, legal contracts, and idioms.",
      },
      {
        title: "Speech-to-Text & Diarization",
        description: "Acoustic models that transcribe multi-speaker audio recordings with millisecond timestamp accuracy.",
      },
    ],
    evaluationCriteria: [
      {
        title: "Table & Hierarchy Preservation",
        criteria: "Test whether multi-column text and financial spreadsheets extract with tabular integrity or get mangled into raw strings.",
      },
      {
        title: "Vocabulary Customization",
        criteria: "Confirm support for custom acronym dictionaries, technical jargon, and organization-specific glossaries.",
      },
      {
        title: "Zero Data Logging Guarantees",
        criteria: "Verify that sensitive corporate text passed through transcription or summarization APIs is not cached or used for model tuning.",
      },
    ],
    faqs: [
      {
        q: "Why are specialized document parsers necessary when LLMs accept image uploads?",
        a: "While frontier vision models can inspect images, specialized document engines (like Docling or Unstructured) extract tabular cells, semantic bounding boxes, and reading order into token-efficient Markdown, slashing downstream prompt token costs.",
      },
      {
        q: "What is speaker diarization in automated transcription?",
        a: "Speaker diarization is the algorithmic process of identifying who spoke when in an audio stream, separating dialogue into distinct speaker tracks with accurate time offsets.",
      },
      {
        q: "How accurate is automated language translation for technical codebases?",
        a: "Modern neural translation engines maintain high fidelity for prose, but teams working with technical documentation should verify that code blocks, markdown tags, and parameters remain untranslated.",
      },
    ],
    relatedCategories: [
      { slug: "conversational-ai", name: "Conversational AI & Chatbots" },
      { slug: "dev-platforms", name: "Developer Frameworks & Infrastructure" },
    ],
  },

  "computer-vision": {
    headline: "Selecting computer vision models, annotation platforms, and visual APIs",
    subtypes: [
      {
        title: "Promptable Segmentation & Tracking",
        description: "Unified vision models (like SAM 2) that track object boundaries across video streams from initial point or box prompts.",
      },
      {
        title: "Dataset Labeling & Annotation Tooling",
        description: "Interactive platforms that accelerate training data curation using model-assisted pre-labeling and human verification.",
      },
      {
        title: "Edge Detection & Spatial AI",
        description: "Lightweight quantized visual models compiled for real-time robotic vision, drones, and edge hardware accelerators.",
      },
    ],
    evaluationCriteria: [
      {
        title: "FPS Performance on Target Hardware",
        criteria: "Measure real-time frames per second under target deployment constraints (e.g. edge TensorRT vs cloud A100 GPUs).",
      },
      {
        title: "Zero-Shot Generalization",
        criteria: "Test segmentation or classification models against domain-shift imagery (poor lighting, occlusions, industrial artifacts).",
      },
      {
        title: "Label Export Formats",
        criteria: "Verify export support for standard spatial formats (COCO, YOLO, Pascal VOC, Segmentation Masks).",
      },
    ],
    faqs: [
      {
        q: "What is promptable visual segmentation?",
        a: "Promptable segmentation models allow developers to select any visual subject by providing a point click, bounding box, or rough mask, and the model automatically calculates exact pixel boundaries without requiring custom model retraining.",
      },
      {
        q: "Can computer vision models run directly on edge devices without cloud connectivity?",
        a: "Yes. Optimized vision architectures quantized to INT8 or FP16 formats can run locally on edge hardware (such as Raspberry Pi, Apple Silicon, or NVIDIA Jetson) with zero internet connection.",
      },
      {
        q: "How does model-assisted annotation speed up machine learning workflows?",
        a: "Model-assisted annotation uses pre-trained vision foundation models to automatically draft bounding boxes and segmentation masks, allowing human annotators to simply verify or correct labels, reducing manual curation time by up to 80%.",
      },
    ],
    relatedCategories: [
      { slug: "generative-content", name: "Generative Content Creation" },
      { slug: "dev-platforms", name: "Developer Frameworks & Infrastructure" },
    ],
  },

  "data-analytics": {
    headline: "Choosing AI data analytics, automated forecasting, and predictive modeling platforms",
    subtypes: [
      {
        title: "Embedded Analytic Copilots",
        description: "Natural language query interfaces that convert plain English into optimized SQL and interactive dashboards.",
      },
      {
        title: "Automated Time-Series & Forecasting",
        description: "Predictive engines that identify seasonal trends, anomalies, and demand spikes without manual parameter tuning.",
      },
      {
        title: "In-Memory Embedded Analytical Engines",
        description: "High-performance vectorized SQL engines (like DuckDB) designed for fast analytic queries on local parquet datasets.",
      },
    ],
    evaluationCriteria: [
      {
        title: "SQL Generation Precision",
        criteria: "Evaluate whether natural language queries produce correct join keys, window functions, and group-by clauses on complex schemas.",
      },
      {
        title: "Data Warehouse Native Connectivity",
        criteria: "Confirm direct zero-copy connectors to Snowflake, BigQuery, ClickHouse, Databricks, and S3 parquet buckets.",
      },
      {
        title: "Governance & Row-Level Security",
        criteria: "Ensure the analytics interface respects user-level permissions and warehouse security policies.",
      },
    ],
    faqs: [
      {
        q: "How do text-to-SQL analytics engines prevent querying errors?",
        a: "Leading text-to-SQL platforms index your database semantic schema, foreign key relationships, and metric definitions into vector embeddings, verifying generated queries against dry-run execution plans before returning results.",
      },
      {
        q: "Does AI data analytics require sending proprietary database tables to external model providers?",
        a: "No. Enterprise tools only send metadata (column names, table definitions, and query context) to the language model; data execution occurs inside your existing secure data warehouse or on-prem cluster.",
      },
      {
        q: "What advantages do embedded analytical engines offer over traditional data warehouses?",
        a: "Embedded engines (such as DuckDB) run in-process without client-server overhead, delivering sub-second analytical queries over local files and dataframes with zero infrastructure cost.",
      },
    ],
    relatedCategories: [
      { slug: "automation", name: "Automation & Workflow Orchestration" },
      { slug: "dev-platforms", name: "Developer Frameworks & Infrastructure" },
    ],
  },

  "automation": {
    headline: "Comparing workflow automation, agent orchestration, and browser automation tools",
    subtypes: [
      {
        title: "Headless Browser Automation",
        description: "Cloud browser infrastructure (like Browserbase) designed for AI web scrapers and agents with residential proxy rotation and captcha bypass.",
      },
      {
        title: "Visual Scenario Builders",
        description: "Low-code canvas builders connecting SaaS APIs through triggers, webhooks, branching logic, and LLM transform steps.",
      },
      {
        title: "Self-Hostable Workflow Engines",
        description: "Open-source automation platforms (like n8n) deployable on private Kubernetes clusters for sovereign enterprise orchestration.",
      },
    ],
    evaluationCriteria: [
      {
        title: "Execution Reliability & State Persistence",
        criteria: "Confirm durable execution guarantees so long-running workflows resume seamlessly after server restarts or network blips.",
      },
      {
        title: "Proxy & Anti-Bot Resilience",
        criteria: "For browser agents, evaluate fingerprint stealth, CAPTCHA auto-solving, and residential IP distribution.",
      },
      {
        title: "Self-Hosting Cost Efficiency",
        criteria: "Examine whether self-hosted tiers offer unrestricted execution volume or artificially restrict enterprise connectors.",
      },
    ],
    faqs: [
      {
        q: "What is headless browser automation for AI agents?",
        a: "Headless browser infrastructure runs automated browser sessions in cloud containers, providing agents with DOM accessibility trees, automated CAPTCHA resolution, and cookie session persistence to navigate web interfaces like a human.",
      },
      {
        q: "How do self-hosted automation engines compare to cloud services?",
        a: "Self-hosted engines (such as open-source n8n) give teams complete control over sensitive credentials and unlimited workflow execution without per-run billing, while cloud platforms remove server maintenance and scaling concerns.",
      },
      {
        q: "What happens when an automated AI agent encounters an unexpected error?",
        a: "Production automation platforms provide human-in-the-loop review queues, automatic retry backoffs with jitter, and fallback branching when model parsing or external API calls fail.",
      },
    ],
    relatedCategories: [
      { slug: "dev-platforms", name: "Developer Frameworks & Infrastructure" },
      { slug: "conversational-ai", name: "Conversational AI & Chatbots" },
    ],
  },

  "dev-platforms": {
    headline: "Developer frameworks, AI code assistants, inference engines, and vector stores",
    subtypes: [
      {
        title: "AI-Native IDEs & Coding Assistants",
        description: "Developer environments (Cursor, Windsurf, Aider) featuring codebase indexing, multi-file diff generation, and autonomous terminal execution.",
      },
      {
        title: "High-Throughput Inference Engines",
        description: "Serving engines (vLLM, Ollama, TensorRT-LLM) providing PagedAttention, continuous batching, and quantized weights for local and cluster inference.",
      },
      {
        title: "Vector Databases & Semantic Embeddings",
        description: "Specialized storage engines optimized for sub-millisecond approximate nearest neighbor (ANN) similarity search over high-dimensional vector embeddings.",
      },
    ],
    evaluationCriteria: [
      {
        title: "Repository Indexing & Retrieval Precision",
        criteria: "Test whether coding copilots accurately locate symbols, interface contracts, and dependency graphs across multi-repo codebases.",
      },
      {
        title: "Batch Serving Efficiency (Tokens per Dollar)",
        criteria: "Evaluate continuous batching and PagedAttention throughput under high concurrent client requests.",
      },
      {
        title: "Vendor Lock-in & Open Standards",
        criteria: "Ensure compatibility with OpenAI-compatible endpoint specifications and standard ONNX / GGUF model formats.",
      },
    ],
    faqs: [
      {
        q: "How do AI-native IDEs differ from standard editor extensions?",
        a: "AI-native IDEs (like Cursor or Windsurf) build full semantic index graphs of your entire local git tree, enabling full-repository agentic edits, multi-file refactoring, and automated terminal debugging that simple autocomplete extensions cannot deliver.",
      },
      {
        q: "What is PagedAttention in modern inference serving engines?",
        a: "PagedAttention (pioneered by vLLM) manages Key-Value (KV) cache memory in non-contiguous virtual pages, eliminating memory fragmentation and boosting serving throughput by 2x to 4x compared to naive Hugging Face pipelines.",
      },
      {
        q: "When is local model inference preferable to cloud APIs for developers?",
        a: "Local inference (via tools like Ollama or vLLM) guarantees complete code privacy, works offline, carries zero per-token API charges, and provides predictable latency for high-volume background tasks.",
      },
    ],
    relatedCategories: [
      { slug: "ai-models", name: "AI Models" },
      { slug: "automation", name: "Automation & Workflow Orchestration" },
    ],
  },
};

/** Client-safe lookup: guide by category slug. */
export function guideFor(slug: string): CategoryGuide | undefined {
  return CATEGORY_GUIDES[slug];
}
