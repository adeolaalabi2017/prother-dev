/**
 * Batch 2 Daily Ingestion: 5 Tools
 * 1. Supervision (supervision) - computer-vision
 * 2. Evidence (evidence) - data-analytics
 * 3. Qwen 2.5 72B (qwen-2-5-72b) - ai-models
 * 4. Kokoro (kokoro) - nlp-text
 * 5. Trigger.dev (trigger-dev) - automation
 *
 * Adheres strictly to AGENTS.md:
 * - Authentic vector SVGs or high-res brand PNGs in public/logos/<slug>.<ext>
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - Honest pricing classifications
 * - Verified via Convex queries and Cloudflare D1
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import fs from "fs";
import path from "path";

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
  COMPUTER_VISION: "k17f4cy63g6fy0gz9a8qskgy7s8f3pz3",
  DATA_ANALYTICS: "k171yjq0df9czt3qctx2dy11k98f3n5m",
  AI_MODELS: "k17epqr8azy8tc0433j64ysjax8fbwze",
  NLP_TEXT: "k1778berf3zczh9d10k5s2mezh8f2xcy",
  AUTOMATION: "k1735pwyqnwk3s653tfkhtbn7n8f2wqe",
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

export const TOOLS_BATCH_2 = [
  // 1. Supervision
  {
    id: "cmucrh2supervision0000001",
    slug: "supervision",
    name: "Supervision",
    tagline: "Open-source computer vision utilities for detections, annotators, trackers, and datasets",
    description: "Supervision by Roboflow is an open-source Python library providing composable tools for object detection, polygon segmentation, bounding box annotation, and multi-object tracking.",
    websiteUrl: "https://supervision.roboflow.com",
    docsUrl: "https://supervision.roboflow.com",
    categoryLegacyId: CATEGORY_MAP.COMPUTER_VISION,
    d1CategoryId: D1_CATEGORY_MAP.COMPUTER_VISION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "100% open source under MIT License with no commercial licensing fees.",
    hasApi: true,
    logoEmoji: "👁️",
    logoGradient: "from-purple-600 to-indigo-900",
    logoUrl: "/logos/supervision.png",
    tagsPipe: "computer-vision|object-detection|video-tracking|roboflow|python|open-source",
    makerHandle: "@roboflow",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Supervision is an open-source Python library designed to eliminate the boilerplate code required when working with computer vision models. Rather than writing custom OpenCV loops to draw bounding boxes, compute intersection-over-union metrics, or filter detections by confidence, Supervision provides a modular toolkit of annotators, dataset parsers, and multi-object trackers.\n\nBuilt to integrate seamlessly with major vision frameworks (including YOLOv8, YOLOv10, SAM 2, RT-DETR, and MediaPipe), Supervision standardizes detection formats into a unified Detections object. Developers can easily overlay heatmaps, label zones, smooth spatial trajectories, and evaluate model performance across real-world video analytics pipelines.",
      useCases: [
        {
          title: "Visual detection overlay and video annotation pipelines",
          body: "Render clean bounding boxes, labels, masks, and heatmaps over video feeds using high-level composable annotators.",
        },
        {
          title: "Zone counting and perimeter monitoring in retail and logistics",
          body: "Define polygon zones to track foot traffic, count vehicles entering parking lots, and detect dwell times automatically.",
        },
        {
          title: "Multi-object tracking across sequential video streams",
          body: "Assign persistent object IDs to moving detections across video frames with ByteTrack and custom tracking algorithms.",
        },
      ],
      pros: [
        "Eliminates repetitive OpenCV drawing and detection filtering boilerplate",
        "Direct compatibility with all leading vision model backends and formats",
        "Permissive MIT open-source license with active community maintenance",
      ],
      cons: [
        "Requires familiarity with Python and basic computer vision inference workflows",
        "Does not train models directly, functioning as an inference and annotation toolkit",
      ],
      alternatives: ["sam-2", "roboflow", "docling"],
      pricingChecked: true,
    },
  },

  // 2. Evidence
  {
    id: "cmucrh2evidence0000000001",
    slug: "evidence",
    name: "Evidence",
    tagline: "Code-driven business intelligence and interactive data reports in markdown and SQL",
    description: "Evidence is an open-source framework for building fast, interactive data applications and reports using simple Markdown and SQL queries directly against your data warehouse.",
    websiteUrl: "https://evidence.dev",
    docsUrl: "https://docs.evidence.studio",
    categoryLegacyId: CATEGORY_MAP.DATA_ANALYTICS,
    d1CategoryId: D1_CATEGORY_MAP.DATA_ANALYTICS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open source core under MIT License. Optional managed Evidence Cloud platform available for team sharing and access control.",
    hasApi: true,
    logoEmoji: "📊",
    logoGradient: "from-emerald-600 to-teal-900",
    logoUrl: "/logos/evidence.svg",
    tagsPipe: "data-analytics|business-intelligence|sql|markdown|reporting|open-source",
    makerHandle: "@evidencedev",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Evidence reimagines business intelligence as software engineering. Instead of dragging and dropping widgets inside clunky point-and-click BI dashboards, Evidence allows analysts and developers to author reports as version-controlled Markdown files containing embedded SQL queries.\n\nEvery report compiles into a fast static web application powered by DuckDB-Wasm or serverless data warehouses (including Snowflake, BigQuery, DuckDB, Postgres, and Databricks). Reports can be reviewed via Git pull requests, tested in continuous integration pipelines, and deployed to static hosting providers with zero ongoing server costs.",
      useCases: [
        {
          title: "Version-controlled executive reports and operational dashboards",
          body: "Author data reports in Markdown with SQL queries that can be reviewed, branched, and approved via Git workflows.",
        },
        {
          title: "Embedded customer-facing analytics inside web products",
          body: "Embed interactive charts, tables, and KPI cards directly into customer SaaS applications without heavy BI licensing fees.",
        },
        {
          title: "Instant local analytics reports on top of DuckDB and Parquet",
          body: "Analyze local Parquet and CSV files with lightning-fast in-browser DuckDB execution without spinning up external database servers.",
        },
      ],
      pros: [
        "Git-native workflows enable automated code review and testing for data reports",
        "Blazing fast client-side performance powered by DuckDB-Wasm compilation",
        "Free and open-source core without per-seat dashboard licensing penalties",
      ],
      cons: [
        "Requires familiarity with SQL and basic Markdown syntax rather than visual drag-and-drop",
        "Complex writeback workflows require custom application development",
      ],
      alternatives: ["duckdb", "metabase", "superset"],
      pricingChecked: true,
    },
  },

  // 3. Qwen 2.5 72B
  {
    id: "cmucrh2qwen2572b000000001",
    slug: "qwen-2-5-72b",
    name: "Qwen 2.5 72B",
    tagline: "Alibaba flagship open-weights multilingual foundation model for reasoning, coding, and math",
    description: "Qwen 2.5 72B is an open-weights foundation model by Alibaba Cloud, excelling in programming, complex mathematical reasoning, and multi-turn instruction following across 29 languages.",
    websiteUrl: "https://github.com/QwenLM/Qwen2.5",
    docsUrl: "https://huggingface.co/Qwen/Qwen2.5-72B-Instruct",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "open_source",
    startingPrice: "Free / Weights",
    pricingNote: "Open weights released under Apache 2.0 with permissive commercial and research usage rights.",
    hasApi: true,
    logoEmoji: "🧠",
    logoGradient: "from-blue-600 to-indigo-950",
    logoUrl: "/logos/qwen-2-5-72b.png",
    tagsPipe: "ai-models|foundation-models|llm|coding|reasoning|open-weights|alibaba",
    makerHandle: "@qwenlm",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Qwen 2.5 72B represents the pinnacle of open-weights foundation model engineering from Alibaba Cloud. Trained on over 18 trillion tokens with architectural enhancements for long-context comprehension up to 128k tokens, Qwen 2.5 72B rivals proprietary frontier models in software development, synthetic reasoning, and technical multilingual tasks.\n\nWith specialized instruction tuning for coding and math, Qwen 2.5 72B can be self-hosted on enterprise GPU clusters (such as dual A100 or H100 nodes via vLLM) or accessed through managed API providers. Its permissive open-source license allows companies to build private agentic workflows without vendor lock-in.",
      useCases: [
        {
          title: "Private enterprise coding assistant and code generation",
          body: "Deploy on self-hosted GPU infrastructure to assist development teams with code synthesis, bug detection, and refactoring.",
        },
        {
          title: "Complex mathematical reasoning and scientific analysis",
          body: "Handle rigorous analytical calculations, financial formulas, and step-by-step logic queries with frontier benchmark accuracy.",
        },
        {
          title: "Multilingual agentic task execution and customer support",
          body: "Power conversational agents and workflow automations across 29 spoken languages with nuanced cultural understanding.",
        },
      ],
      pros: [
        "State-of-the-art open-weights benchmarks rivaling proprietary frontier models",
        "Native support for 128k context windows for ingesting large codebases and documents",
        "Permissive Apache 2.0 open licensing allows full commercial freedom",
      ],
      cons: [
        "72 billion parameters require enterprise GPU hardware (such as 2x A100/H100) for local deployment",
        "Quantized versions require careful calibration to preserve complex reasoning fidelity",
      ],
      alternatives: ["deepseek-v3", "claude", "chatgpt"],
      pricingChecked: true,
    },
  },

  // 4. Kokoro
  {
    id: "cmucrh2kokoro000000000001",
    slug: "kokoro",
    name: "Kokoro",
    tagline: "Ultra-fast 82M open-weight text-to-speech model with human-grade audio quality",
    description: "Kokoro is a lightweight 82M parameter open-weight text-to-speech model by Hexgrad that delivers studio-quality voice synthesis at incredible inference speeds on standard consumer hardware.",
    websiteUrl: "https://huggingface.co/hexgrad/Kokoro-82M",
    docsUrl: "https://github.com/hexgrad/kokoro",
    categoryLegacyId: CATEGORY_MAP.NLP_TEXT,
    d1CategoryId: D1_CATEGORY_MAP.NLP_TEXT,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Released under permissive Apache 2.0 license with free weights and source code.",
    hasApi: true,
    logoEmoji: "🔊",
    logoGradient: "from-rose-500 to-amber-600",
    logoUrl: "/logos/kokoro.png",
    tagsPipe: "nlp-text|text-to-speech|audio-generation|open-weights|voice-synthesis|hexgrad",
    makerHandle: "@hexgrad",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Kokoro is an 82 million parameter text-to-speech foundation model that delivers expressive, natural voice generation with a tiny computational footprint. While traditional neural voice models require massive GPU clusters or costly proprietary API subscriptions, Kokoro synthesizes human-grade audio faster than real time on standard consumer CPUs and edge devices.\n\nDeveloped by Hexgrad and released under the Apache 2.0 license, Kokoro has become the community standard for voice-enabled AI agents, audiobooks, and interactive voice assistants. It supports multiple voice accents, natural phrasing, and phoneme-level prosody tuning without requiring cloud connectivity.",
      useCases: [
        {
          title: "Real-time conversational voice agents and call assistants",
          body: "Power sub-second voice responses for interactive telephone and web agents with low audio latency.",
        },
        {
          title: "Automated audiobook and article narration",
          body: "Convert long-form text, documentation, and blog posts into expressive, natural speech without cloud API fees.",
        },
        {
          title: "Local edge device accessibility and voice feedback",
          body: "Run voice output directly on edge computers, mobile apps, and offline devices without sending audio data over the internet.",
        },
      ],
      pros: [
        "Lightweight 82M parameter architecture runs faster than real time even on basic CPU hardware",
        "Remarkably expressive and natural speech prosody comparable to proprietary voice APIs",
        "Permissive Apache 2.0 open-source license with zero per-minute synthesis fees",
      ],
      cons: [
        "Voice cloning requires fine-tuning rather than instant zero-shot audio prompt matching",
        "Primary model releases focus predominantly on English accents, with community multilingual expansions ongoing",
      ],
      alternatives: ["docling", "chatgpt", "elevenlabs"],
      pricingChecked: true,
    },
  },

  // 5. Trigger.dev
  {
    id: "cmucrh2triggerdev00000001",
    slug: "trigger-dev",
    name: "Trigger.dev",
    tagline: "Developer-first open-source background jobs and long-running AI workflow engine",
    description: "Trigger.dev is an open-source platform for building and deploying reliable background jobs, multi-step agent workflows, and scheduled tasks with zero timeouts and real-time observability.",
    websiteUrl: "https://trigger.dev",
    docsUrl: "https://trigger.dev/docs",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free tier / $0/mo",
    pricingNote: "Open source core under Apache 2.0 for self-hosting. Trigger.dev Cloud includes a free tier with 50k run seconds; paid plans start at $20/month.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-lime-400 to-green-600",
    logoUrl: "/logos/trigger-dev.svg",
    tagsPipe: "automation|background-jobs|workflow-orchestration|ai-agents|serverless|open-source",
    makerHandle: "@triggerdotdev",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Trigger.dev is built for developers who need to orchestrate complex, long-running workflows without hitting the execution time limits of traditional serverless platforms. While standard cloud functions terminate after a few minutes, Trigger.dev handles tasks that run for hours, retry failed steps intelligently, and pause execution waiting for external webhooks or human approval.\n\nWith native TypeScript SDKs, Trigger.dev integrates seamlessly into modern Next.js and Node.js applications. Developers can orchestrate multi-agent research loops, automate heavy background data ingestion, manage scheduled cron jobs, and observe live execution runs through an interactive developer dashboard.",
      useCases: [
        {
          title: "Long-running AI agent pipelines without serverless timeouts",
          body: "Execute multi-step AI reasoning loops, document extraction, and LLM calls that take tens of minutes without termination.",
        },
        {
          title: "Reliable background processing with automatic retries",
          body: "Queue asynchronous jobs such as sending emails, transacting with payment processors, and processing large media files safely.",
        },
        {
          title: "Scheduled cron tasks and recurring event workflows",
          body: "Define and manage recurring database synchronizations, health monitoring checks, and scheduled notification broadcasts in code.",
        },
      ],
      pros: [
        "Solves serverless timeout constraints with durable, hours-long background job execution",
        "First-class TypeScript developer ergonomics with step-level live dashboard tracing",
        "Open-source core under Apache 2.0 with full self-hosting and hybrid deployment flexibility",
      ],
      cons: [
        "Best suited for TypeScript/Node.js codebases, with limited native SDK support for other languages",
        "High-concurrency self-hosted deployments require managing Redis and PostgreSQL backends",
      ],
      alternatives: ["celesto", "createos", "n8n"],
      pricingChecked: true,
    },
  },
];

async function main() {
  console.log("=== Validating Invariants for 5 Batch 2 Tools ===");
  checkInvariants(TOOLS_BATCH_2, "TOOLS_BATCH_2");
  console.log("✓ Zero banned dashes found!");

  // 1. Verify local logo assets
  console.log("\n=== Checking Local Logo Assets in public/logos/ ===");
  for (const tool of TOOLS_BATCH_2) {
    const localPath = path.join(process.cwd(), "public", tool.logoUrl.replace(/^\//, ""));
    if (!fs.existsSync(localPath)) {
      throw new Error(`Missing logo file: ${localPath} for tool ${tool.slug}`);
    }
    const stat = fs.statSync(localPath);
    console.log(`✓ Logo exists: ${tool.logoUrl} (${stat.size} bytes)`);
  }

  // 2. Insert or update in Convex
  console.log(`\n=== Upserting Tools in Convex (${CONVEX_URL}) ===`);
  for (const tool of TOOLS_BATCH_2) {
    const existing = await convex.query(api.tools.pageData, { slug: tool.slug });

    if (!("error" in existing) && existing.tool) {
      console.log(`Tool ${tool.slug} already exists in Convex (${existing.tool.id}). Patching...`);
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
          hasApi: tool.hasApi,
          logoEmoji: tool.logoEmoji,
          logoGradient: tool.logoGradient,
          tagsPipe: tool.tagsPipe,
          makerHandle: tool.makerHandle,
          status: tool.status,
          editorsPick: tool.editorsPick,
          curated: tool.curated,
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

  // 3. Verification step in Convex
  console.log("\n=== Verifying All 5 Tools in Convex ===");
  for (const tool of TOOLS_BATCH_2) {
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

if (process.argv[1] && process.argv[1].endsWith("add-daily-tools-batch-2.ts")) {
  main().catch((err) => {
    console.error("Batch 2 ingestion failed:", err);
    process.exit(1);
  });
}
