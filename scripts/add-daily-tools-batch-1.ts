/**
 * Batch 1 Daily Ingestion: 5 Tools
 * 1. SAM 2 (Meta Segment Anything 2) - computer-vision
 * 2. DuckDB - data-analytics
 * 3. DeepSeek-V3 - ai-models
 * 4. Docling - nlp-text
 * 5. Browserbase - automation
 *
 * Adheres strictly to AGENTS.md:
 * - Authentic vector SVGs in public/logos/<slug>.svg
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - Honest pricing classifications
 * - Verified via Convex queries
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import fs from "fs";
import path from "path";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://proper-kangaroo-372.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);
const NOW = Date.now();

const CATEGORY_MAP = {
  CONVERSATIONAL_AI: "cmucrh2nj0000kji8o4lndfc1",
  GENERATIVE_CONTENT: "cmucrh2nk0001kji8qk3jr9yr",
  NLP_TEXT: "cmucrh2nl0002kji8959jrucs",
  COMPUTER_VISION: "cmucrh2nl0003kji8cdy3lonp",
  DATA_ANALYTICS: "cmucrh2nm0004kji8j0rbkt76",
  AUTOMATION: "cmucrh2nm0005kji8p4nuxs89",
  DEV_PLATFORMS: "cmucrh2nn0006kji83fbwfgnw",
  AI_MODELS: "cmucrh2nz0007kji8aimodels0",
};

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

export const TOOLS_BATCH_1 = [
  // 1. SAM 2
  {
    id: "cmucrh2sam200000000000001",
    slug: "sam-2",
    name: "SAM 2",
    tagline: "Foundation model for real-time promptable visual segmentation in videos and images",
    description: "SAM 2 (Segment Anything Model 2) by Meta FAIR is a unified foundation architecture for visual segmentation in both images and live video streams, featuring promptable memory attention.",
    websiteUrl: "https://ai.meta.com/sam2",
    docsUrl: "https://github.com/facebookresearch/sam2",
    categoryLegacyId: CATEGORY_MAP.COMPUTER_VISION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Apache 2.0 open-source foundation model and code available on GitHub with no licensing fees.",
    hasApi: true,
    logoEmoji: "🎯",
    logoGradient: "from-sky-500 to-blue-700",
    logoUrl: "/logos/sam-2.svg",
    tagsPipe: "computer-vision|segmentation|video-tracking|foundation-models|meta|open-source",
    makerHandle: "@metaai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "SAM 2 (Segment Anything Model 2) extends Meta foundational segmentation capabilities from static photography into dynamic video streams. Built on a streaming memory architecture that conditions current frames on past interactive prompts, SAM 2 segments target entities in real time at over 40 frames per second.\n\nDevelopers can supply point clicks, bounding boxes, or rough masks on any single video frame, and SAM 2 propagates precise pixel-level mask boundaries across the entire temporal sequence. The model family ranges from lightweight edge variants (SAM 2 Tiny and Small) up to frontier checkpoints (SAM 2 Large), supporting interactive video labeling, sports analytics, autonomous driving, and robotic visual grounding.",
      useCases: [
        {
          title: "Zero-shot interactive video object tracking and rotoscoping",
          body: "Click on any moving subject in a single video frame to generate temporal segmentation masks across the entire clip.",
        },
        {
          title: "High-throughput dataset annotation acceleration",
          body: "Reduce visual dataset labeling hours by combining human verification clicks with automated temporal mask propagation.",
        },
        {
          title: "Real-time robotics and spatial visual perception",
          body: "Deploy lightweight SAM 2 checkpoints on edge accelerators to track spatial object boundaries in live camera feeds.",
        },
      ],
      pros: [
        "Unifies image and video segmentation under a single fast streaming memory architecture",
        "Achieves real-time inference speeds exceeding 40 frames per second on modern hardware",
        "Released under permissive Apache 2.0 licensing with pre-trained checkpoints from Tiny to Large",
      ],
      cons: [
        "Rapid camera occlusion or extreme motion blur can require occasional mid-video correction clicks",
        "Large model variants require dedicated GPU VRAM for multi-stream video pipelines",
      ],
      alternatives: ["roboflow", "clarifai", "label-studio"],
      pricingChecked: true,
    },
  },

  // 2. DuckDB
  {
    id: "cmucrh2duckdb0000000000001",
    slug: "duckdb",
    name: "DuckDB",
    tagline: "Fast in-process analytical SQL database engine for data science and AI applications",
    description: "DuckDB is an open-source, in-process analytical columnar database designed for high performance vector processing, zero-dependency installation, and direct querying of Parquet and Arrow files.",
    websiteUrl: "https://duckdb.org",
    docsUrl: "https://duckdb.org/docs",
    categoryLegacyId: CATEGORY_MAP.DATA_ANALYTICS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "MIT-licensed open-source embedded analytical database engine. Completely free with zero usage or deployment fees.",
    hasApi: true,
    logoEmoji: "🦆",
    logoGradient: "from-amber-400 to-yellow-600",
    logoUrl: "/logos/duckdb.svg",
    tagsPipe: "data-analytics|sql|database|in-process|olap|embedded|python|parquet",
    makerHandle: "@duckdb",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "DuckDB is widely celebrated as the SQLite for analytics. Unlike client-server data warehouses that require cluster provisioning, connection management, and network transfer overhead, DuckDB runs directly inside your application process. It operates with zero external dependencies and compiles into a single binary, Python wheel, or WebAssembly package.\n\nEquipped with a state-of-the-art columnar vectorized execution engine, DuckDB executes complex analytical aggregations and joins on millions of rows in milliseconds. It reads and writes directly to Parquet, CSV, JSON, and Apache Arrow formats without copying data, making it the bedrock engine for local AI pipelines, embedded feature stores, and modern data science workspaces.",
      useCases: [
        {
          title: "In-memory feature transformation for machine learning pipelines",
          body: "Query remote Parquet files directly from S3 or local disk to compute aggregations and feature tables without spinning up Spark clusters.",
        },
        {
          title: "Browser-based client-side analytics with DuckDB-Wasm",
          body: "Power interactive business intelligence dashboards and private exploratory data tools entirely on the client side.",
        },
        {
          title: "Fast local testing and micro-benchmarking of data models",
          body: "Replace expensive cloud warehouse dev environments with lightweight, instantaneous local SQL execution.",
        },
      ],
      pros: [
        "In-process architecture eliminates client-server network latency and operational complexity",
        "Seamless zero-copy integration with Apache Arrow, Pandas, Polars, and Parquet files",
        "Permissive MIT license with no telemetry, vendor lock-in, or hosting fees",
      ],
      cons: [
        "Single-node architecture is not engineered for multi-petabyte distributed storage",
        "Concurrent writes are limited compared to traditional OLTP database management systems",
      ],
      alternatives: ["hex", "tableau-pulse", "polymer"],
      pricingChecked: true,
    },
  },

  // 3. DeepSeek-V3
  {
    id: "cmucrh2deepseekv3000000001",
    slug: "deepseek-v3",
    name: "DeepSeek-V3",
    tagline: "Frontier 671B Mixture of Experts open foundation model with Multi-head Latent Attention",
    description: "DeepSeek-V3 is a 671 billion parameter open-weights Mixture of Experts foundation model activating 37 billion parameters per token, optimized for coding, mathematics, and complex reasoning.",
    websiteUrl: "https://www.deepseek.com",
    docsUrl: "https://api-docs.deepseek.com",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    pricingModel: "open_source",
    startingPrice: "Free weights / $0.14 per 1M tokens API",
    pricingNote: "Open weights licensed under permissive model license. Official API starts at $0.14 input and $0.28 output per million tokens with prompt cache discounts.",
    hasApi: true,
    logoEmoji: "🐋",
    logoGradient: "from-blue-600 to-indigo-900",
    logoUrl: "/logos/deepseek-v3.svg",
    tagsPipe: "ai-models|llm|moe|deepseek|foundation-models|open-weights|reasoning|coding",
    makerHandle: "@deepseek_ai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "DeepSeek-V3 represents a landmark achievement in open-weight foundation models. Engineered with a 671 billion total parameter Mixture of Experts (MoE) architecture that routes tokens through 37 billion active parameters, DeepSeek-V3 matches or exceeds proprietary closed frontier models across major reasoning, mathematical, and coding benchmarks.\n\nThe model introduces two pioneering architectural breakthroughs: Multi-head Latent Attention (MLA) for drastically reduced KV-cache memory footprints during inference, and DeepSeekMoE with auxiliary-loss-free load balancing. With support for a native 128k context window and transparent FP8 mixed-precision training recipes, DeepSeek-V3 provides enterprise teams and independent researchers with frontier-class capability without proprietary closed API lock-in.",
      useCases: [
        {
          title: "Autonomous software development and code synthesis",
          body: "Generate end-to-end repository code, debug complex distributed traces, and refactor polyglot applications.",
        },
        {
          title: "Complex mathematical modeling and structured theorem proving",
          body: "Tackle competitive math problems and formal proofs using advanced chain-of-thought decomposition.",
        },
        {
          title: "Cost-optimized enterprise API deployments",
          body: "Deploy high-volume customer-facing agents and search extraction pipelines at a fraction of closed-model token prices.",
        },
      ],
      pros: [
        "Frontier-class performance matching closed commercial models at dramatically lower inference costs",
        "Multi-head Latent Attention (MLA) slashes KV-cache memory consumption by up to 93 percent",
        "Permissive open model weights supporting self-hosting and specialized fine-tuning",
      ],
      cons: [
        "Full unquantized self-hosting requires significant multi-GPU cluster hardware",
        "API service can experience traffic congestion during peak global demand periods",
      ],
      alternatives: ["haiku-5-5", "kolibri", "step-5"],
      pricingChecked: true,
    },
  },

  // 4. Docling
  {
    id: "cmucrh2docling000000000001",
    slug: "docling",
    name: "Docling",
    tagline: "Open-source document parser converting PDFs, DOCX, and slides into clean markdown for RAG",
    description: "Docling by IBM Research parses complex, rich documents into structured Markdown, JSON, and DoclingDocument formats with specialized layout analysis and table structure recognition.",
    websiteUrl: "https://github.com/DS4SD/docling",
    docsUrl: "https://ds4sd.github.io/docling",
    categoryLegacyId: CATEGORY_MAP.NLP_TEXT,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "MIT-licensed open-source library developed by IBM Research with zero licensing costs.",
    hasApi: true,
    logoEmoji: "📄",
    logoGradient: "from-purple-600 to-indigo-800",
    logoUrl: "/logos/docling.svg",
    tagsPipe: "nlp-text|document-parsing|rag|pdf-converter|ocr|table-extraction|open-source",
    makerHandle: "@ibmresearch",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Docling is an open-source document parsing engine created by IBM Research to solve the universal document ingestion bottleneck in Retrieval-Augmented Generation (RAG) pipelines. While standard text extractors produce jumbled strings from multi-column PDFs and lose table relationships, Docling applies deep computer vision models to preserve reading order, hierarchy, and tabular data.\n\nThe library handles complex formats including scanned PDFs, DOCX, PPTX, HTML, and images. It features the DocLayNet-trained layout analyzer and TableFormer model, reconstructing complex nested tables into valid Markdown tables or HTML tables. With built-in chunkers tailored for semantic boundaries and direct integration with LlamaIndex, LangChain, and Haystack, Docling provides clean grounding documents for generative assistants.",
      useCases: [
        {
          title: "High-accuracy PDF extraction for enterprise RAG pipelines",
          body: "Convert financial disclosures, technical manuals, and legal contracts into structured markdown chunks.",
        },
        {
          title: "Nested table and spreadsheet structural reconstruction",
          body: "Extract complex multi-header tables from scanned reports into clean JSON structures without lost coordinates.",
        },
        {
          title: "Multimodal document corpus preparation for LLM pre-training",
          body: "Process millions of heterogeneous research papers into normalized markdown with preserved image captions and equations.",
        },
      ],
      pros: [
        "Advanced vision-based layout analysis correctly parses multi-column pages, footnotes, and headers",
        "TableFormer engine reliably reconstructs complex tables with merged cells and irregular grids",
        "Seamless native integration with major AI frameworks including LangChain and LlamaIndex",
      ],
      cons: [
        "Processing dense image-only scanned documents requires CPU or GPU resources for OCR inference",
        "Very exotic artistic layouts or hand-drawn schematics may require custom post-processing rules",
      ],
      alternatives: ["whistle", "notion-ai", "gemini-notebook"],
      pricingChecked: true,
    },
  },

  // 5. Browserbase
  {
    id: "cmucrh2browserbase00000001",
    slug: "browserbase",
    name: "Browserbase",
    tagline: "Developer platform for running headless browsers reliably at scale for AI web agents",
    description: "Browserbase is serverless cloud infrastructure for headless browsers, offering fingerprint rotation, captcha solving, session recording, and live interactive debugging for AI web agents.",
    websiteUrl: "https://www.browserbase.com",
    docsUrl: "https://docs.browserbase.com",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free tier available",
    pricingNote: "Free Developer plan includes 1 hour of browser runtime per month. Paid Startup plan begins at $20 per month for 20 hours plus usage-based scaling.",
    hasApi: true,
    logoEmoji: "🌐",
    logoGradient: "from-emerald-500 to-teal-800",
    logoUrl: "/logos/browserbase.svg",
    tagsPipe: "automation|browser-automation|headless-chrome|ai-agents|stealth|web-scraping",
    makerHandle: "@browserbase",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Browserbase provides specialized cloud infrastructure designed to let autonomous AI agents navigate, interact with, and extract information from the live web. Running headless Chromium instances in production is notoriously brittle due to bot detection heuristics, captchas, zombie processes, and memory leaks. Browserbase eliminates this operational overhead by providing managed, ephemeral browser sandboxes on demand.\n\nEach Browserbase session comes equipped with stealth fingerprint evasion, automatic residential proxy routing, and integrated captcha resolution. Developers can inspect agent actions in real time through an interactive live debugger view, replay full video session recordings, and pull clean DOM states or console logs. Browserbase natively powers agent frameworks including Stagehand, Playwright, Puppeteer, and Claude computer use.",
      useCases: [
        {
          title: "Autonomous agent web navigation and form execution",
          body: "Deploy autonomous bots that log into SaaS portals, fill complex multi-step forms, and download generated reports.",
        },
        {
          title: "Stealth web data harvesting and research extraction",
          body: "Gather live web intelligence across dynamic JavaScript-heavy single-page applications without triggering blocking screens.",
        },
        {
          title: "Automated end-to-end web workflow verification",
          body: "Test critical user flows and purchasing paths across global geographic regions with automatic session video recordings.",
        },
      ],
      pros: [
        "Turnkey stealth infrastructure with built-in residential proxies and automatic captcha solving",
        "Rich observability suite featuring live web inspector, console telemetry, and video replays",
        "Standard Playwright and Puppeteer compatibility with zero code refactoring required",
      ],
      cons: [
        "Free monthly tier of 1 runtime hour is primarily suited for local prototyping and initial evaluation",
        "High-frequency continuous browser streaming accumulates usage-based cloud charges",
      ],
      alternatives: ["hedwig", "openmercato", "linear"],
      pricingChecked: true,
    },
  },
];

async function main() {
  console.log("=== Starting Daily Batch 1 Tool Ingestion ===");
  console.log(`Targeting Convex: ${CONVEX_URL}\n`);

  // 1. Invariant verification
  console.log("Validating invariants (no em-dashes, valid logos)...");
  for (const tool of TOOLS_BATCH_1) {
    checkInvariants(tool, `tool[${tool.slug}]`);

    const logoPath = path.join(process.cwd(), "public", tool.logoUrl.replace(/^\//, ""));
    if (!fs.existsSync(logoPath)) {
      throw new Error(`Logo file missing: ${logoPath}`);
    }
  }
  console.log("✓ All invariants passed (Zero banned dashes, all logos present)\n");

  // 2. Insert or update tools in Convex
  for (const tool of TOOLS_BATCH_1) {
    console.log(`Processing ${tool.name} (${tool.slug})...`);
    const existing = await convex.query(api.tools.pageData, { slug: tool.slug });

    if (!("error" in existing) && existing.tool) {
      console.log(`Tool ${tool.slug} already exists in Convex, updating editorial & metadata...`);
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: existing.tool.id,
        logoUrl: tool.logoUrl,
        editorial: tool.editorial,
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
          logoEmoji: tool.logoEmoji,
          logoGradient: tool.logoGradient,
          tagsPipe: tool.tagsPipe,
        },
        nowMs: NOW,
      });
      console.log(`✓ Updated ${tool.name}`);
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

  // 3. Verification step
  console.log("\n=== Verifying All 5 Tools in Convex ===");
  for (const tool of TOOLS_BATCH_1) {
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

  console.log("\n🎉 All 5 tools seeded and verified successfully in Convex!");
}

main().catch((err) => {
  console.error("Batch 1 ingestion failed:", err);
  process.exit(1);
});
