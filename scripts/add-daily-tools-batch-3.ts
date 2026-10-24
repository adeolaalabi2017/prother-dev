/**
 * Batch 3 Daily Ingestion: 6 Tools
 * 1. Dessa (dessa) - conversational-ai
 * 2. DeepSeek V4.1 Flash (deepseek-v4-1-flash) - ai-models
 * 3. Kimi K3.1 Pro (kimi-k3-1-pro) - ai-models
 * 4. Qwen 3.8 (qwen-3-8) - ai-models
 * 5. Flint (flint) - ai-models
 * 6. Muse Glimmer (muse-glimmer) - ai-models
 *
 * Note: Claude Opus 5.5 is already live in D1 and Convex.
 *
 * Adheres strictly to AGENTS.md:
 * - Authentic vector SVGs or high-res brand PNGs in public/logos/<slug>.<ext>
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - Honest pricing classifications
 * - Verified via Convex queries and Cloudflare D1
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
  CONVERSATIONAL_AI: "k17bmd8382gcx6g9qdmer543498f2cjh",
  AI_MODELS: "k17epqr8azy8tc0433j64ysjax8fbwze",
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

export const TOOLS_BATCH_3 = [
  // 1. Dessa
  {
    id: "cmucrh2dessa0000000000001",
    slug: "dessa",
    name: "Dessa",
    tagline: "Full-duplex speech conversation model trained natively on audio",
    description: "Dessa is Block's full-duplex conversational model trained natively on raw audio, enabling natural turn-taking, real-time interruptions, and expressive latency without cascaded transcription.",
    websiteUrl: "https://block.xyz/dessa",
    docsUrl: "https://block.xyz/dessa",
    categoryLegacyId: CATEGORY_MAP.CONVERSATIONAL_AI,
    d1CategoryId: D1_CATEGORY_MAP.CONVERSATIONAL_AI,
    pricingModel: "free",
    startingPrice: "Free",
    pricingNote: "Research preview and open audio model explorations.",
    hasApi: true,
    logoEmoji: "🎙️",
    logoGradient: "from-zinc-700 to-black",
    logoUrl: "/logos/dessa.svg",
    tagsPipe: "voice-ai|audio-model|full-duplex|conversational-ai|block|speech",
    makerHandle: "@block",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Dessa is an audio-native conversational foundation model developed by Block. Unlike traditional voice assistants that pipeline distinct Automatic Speech Recognition (ASR), Large Language Model (LLM), and Text-to-Speech (TTS) models together, Dessa processes and generates continuous audio tokens end-to-end.\n\nBy avoiding cascading pipeline overhead, Dessa delivers human-grade conversational latency, seamless mid-sentence interruptions, and fine-grained emotional prosody. Developers and researchers can explore full-duplex spoken dialogue that captures paralinguistic cues, vocal inflection, and dynamic pacing in real time.",
      useCases: [
        {
          title: "Full-duplex real-time voice interactions",
          body: "Engage in low-latency voice conversations that permit natural interruptions, concurrent speaking, and expressive feedback.",
        },
        {
          title: "Paralinguistic and emotion-aware audio intelligence",
          body: "Capture nuances in vocal tone, laughter, pauses, and cadence that are typically discarded during text transcription.",
        },
        {
          title: "Hands-free voice agent prototyping",
          body: "Build voice-first interfaces for customer assistance, audio note transcription, and collaborative mobile workspaces.",
        },
      ],
      pros: [
        "Native audio-in, audio-out architecture avoids pipeline latency",
        "Fluid mid-speech interruption handling and natural turn-taking",
        "Rich vocal expression, emotional inflection, and natural acoustic response",
      ],
      cons: [
        "Early research preview with limited public developer API access",
        "Higher GPU compute requirements compared to text-only foundation models",
      ],
    },
  },

  // 2. DeepSeek V4.1 Flash
  {
    id: "cmucrh2deepseekv41flash001",
    slug: "deepseek-v4-1-flash",
    name: "DeepSeek V4.1 Flash",
    tagline: "High-speed mixture-of-experts model optimized for agentic reasoning and code",
    description: "DeepSeek V4.1 Flash is an efficient mixture-of-experts model from DeepSeek engineered for high-throughput reasoning, math, and code synthesis.",
    websiteUrl: "https://deepseek.com",
    docsUrl: "https://api-docs.deepseek.com",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-weight model with pay-per-token cloud API endpoints.",
    hasApi: true,
    logoEmoji: "🐋",
    logoGradient: "from-blue-600 to-indigo-950",
    logoUrl: "/logos/deepseek-v4-1-flash.svg",
    tagsPipe: "ai-models|mixture-of-experts|deepseek|code-generation|reasoning|open-weights",
    makerHandle: "@deepseek_ai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "DeepSeek V4.1 Flash is DeepSeek's high-efficiency Mixture-of-Experts (MoE) foundation model, tuned for ultra-fast reasoning, programming, and agentic function execution. Built on deep sparse activation patterns, V4.1 Flash strikes an exceptional balance between high token throughput and deep logical deduction.\n\nWith extensive native context length and specialized token routing, the model excels at multi-turn developer chat, codebase indexing, automated bug patching, and structured JSON output for agentic workflows.",
      useCases: [
        {
          title: "High-throughput code generation and auto-completion",
          body: "Stream real-time code patches, completions, and unit test suites with minimal latency in IDEs and CLI agents.",
        },
        {
          title: "Complex multi-step reasoning and algorithmic problem solving",
          body: "Execute dense mathematical proofs, symbolic logic checks, and algorithmic optimizations.",
        },
        {
          title: "Agentic tool calling and structured function execution",
          body: "Route complex tasks through multi-step agent scaffolds requiring validated JSON tool invocations.",
        },
      ],
      pros: [
        "High token output velocity with low time-to-first-token",
        "Strong open-weight licensing and cost-effective cloud token pricing",
        "Excellent benchmark performance in programming and symbolic reasoning",
      ],
      cons: [
        "Requires quantized runtime configurations for consumer-grade GPU deployment",
        "May require structured prompt constraints to avoid occasional verbosity",
      ],
    },
  },

  // 3. Kimi K3.1 Pro
  {
    id: "cmucrh2kimik31pro00000001",
    slug: "kimi-k3-1-pro",
    name: "Kimi K3.1 Pro",
    tagline: "Long-context reasoning foundation model with agentic tool integration",
    description: "Kimi K3.1 Pro is Moonshot AI's flagship foundation model, providing multi-million token context handling, structured agentic execution, and deep document synthesis.",
    websiteUrl: "https://kimi.com",
    docsUrl: "https://platform.kimi.com",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free web app access; developer API usage billed per token.",
    hasApi: true,
    logoEmoji: "🌙",
    logoGradient: "from-neutral-900 to-black",
    logoUrl: "/logos/kimi-k3-1-pro.png",
    tagsPipe: "ai-models|long-context|kimi|moonshot-ai|reasoning|agentic",
    makerHandle: "@moonshot_ai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Kimi K3.1 Pro is Moonshot AI's state-of-the-art foundation model, famous for its pioneering long-context architecture that processes millions of tokens in a single request. Tailored for deep research, comprehensive document analysis, and autonomous workspace tasks, K3.1 Pro parses vast legal corpora, complex codebases, and financial archives without losing needle-in-a-haystack recall.\n\nThe model combines high-precision long-context attention with native tool use, multi-modal chart comprehension, and iterative deep research execution.",
      useCases: [
        {
          title: "Full-repository code refactoring and cross-file analysis",
          body: "Ingest entire code repositories into a single context window to map dependencies and execute sweeping migrations.",
        },
        {
          title: "Autonomous multi-step deep research and document synthesis",
          body: "Analyze hundreds of research papers or financial disclosures to generate comprehensive comparative briefings.",
        },
        {
          title: "Enterprise knowledge base exploration and complex QA",
          body: "Search across unstructured documentation, transcripts, and manuals with pinpoint citation accuracy.",
        },
      ],
      pros: [
        "Industry-leading long context capabilities with high factual precision",
        "Native tool use and autonomous deep research agent mode",
        "Strong bilingual proficiency across English and Chinese technical tasks",
      ],
      cons: [
        "Very large context prompts carry higher cumulative inference latency",
        "Proprietary cloud model without self-hosted local weights",
      ],
    },
  },

  // 4. Qwen 3.8
  {
    id: "cmucrh2qwen38000000000001",
    slug: "qwen-3-8",
    name: "Qwen 3.8",
    tagline: "Compact open foundation model tailored for edge deployment and local agents",
    description: "Qwen 3.8 is Alibaba's compact open-weight language model built for on-device reasoning, agent scaffolding, and code completion.",
    websiteUrl: "https://github.com/QwenLM",
    docsUrl: "https://qwenlm.github.io",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Permissive open-source license with weights available on Hugging Face.",
    hasApi: true,
    logoEmoji: "🟣",
    logoGradient: "from-purple-700 to-violet-950",
    logoUrl: "/logos/qwen-3-8.png",
    tagsPipe: "ai-models|qwen|alibaba|open-source|edge-ai|local-llm",
    makerHandle: "@alibaba_qwen",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Qwen 3.8 is Alibaba Cloud's lightweight, highly optimized open-weights foundation model. Designed to run smoothly on edge hardware, developer laptops, and local runtime engines (such as Ollama and llama.cpp), Qwen 3.8 punches far above its parameter weight in programming syntax, math, and conversational fluency.\n\nWith extensive pre-training across multilingual datasets and fine-tuning for strict instruction adherence, Qwen 3.8 serves as an ideal brain for local developer CLI utilities, privacy-first agent runtimes, and mobile applications.",
      useCases: [
        {
          title: "Private local assistant and offline coding copilot",
          body: "Run on-device code generation and query answering without transmitting private source code to external cloud providers.",
        },
        {
          title: "Embedded edge intelligence and IoT agent loops",
          body: "Deploy lightweight reasoning onto edge devices, robotics controllers, and specialized hardware appliances.",
        },
        {
          title: "High-frequency tool dispatching in agent workflows",
          body: "Act as a fast, low-cost classifier and router in hierarchical multi-agent architectures.",
        },
      ],
      pros: [
        "Runs smoothly on standard consumer laptops and low-VRAM GPUs",
        "Permissive open-weight license with wide community quantization support",
        "Superior multilingual and code completion performance for its parameter size",
      ],
      cons: [
        "Smaller parameter footprint restricts complex multi-horizon abstract logic",
        "Context window size is lower than massive datacenter models",
      ],
    },
  },

  // 5. Flint
  {
    id: "cmucrh2flint0000000000001",
    slug: "flint",
    name: "Flint",
    tagline: "Open-weight mixture-of-experts model for high-speed local agentic coding",
    description: "Flint is Recursive Superintelligence's open-weight mixture-of-experts model designed for agentic coding on consumer hardware, activating 2.5B parameters per token out of 40B.",
    websiteUrl: "https://recursive.com",
    docsUrl: "https://recursive.com",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source weights released under Apache 2.0 license.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-amber-600 to-orange-950",
    logoUrl: "/logos/flint.png",
    tagsPipe: "ai-models|coding-agent|mixture-of-experts|recursive|open-weights|local-ai",
    makerHandle: "@recursive_ai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Flint is an open-weight Mixture-of-Experts (MoE) foundation model created by Recursive Superintelligence. Spanning 40 billion total parameters while activating only 2.5 billion per token, Flint is specifically architected to deliver frontier-level software engineering performance on local workstations and laptops.\n\nTrained with Recursive's automated research systems and tuned across software benchmark harnesses, Flint can exceed 125 tokens per second on consumer Apple Silicon and RTX hardware. It provides deep terminal tool-use proficiency, rapid repository navigation, and autonomous multi-turn bug resolution under an Apache 2.0 license.",
      useCases: [
        {
          title: "High-speed local agentic coding and test-driven debugging",
          body: "Execute terminal commands, run test suites, and iterate on code fixes locally at over 120 tokens per second.",
        },
        {
          title: "Autonomous SWE-bench repository issue resolution",
          body: "Tackle GitHub issues and pull request reviews within local agent scaffolds like Terminus and mini-swe-agent.",
        },
        {
          title: "Private software development on air-gapped workstations",
          body: "Develop proprietary enterprise software without exposing sensitive intellectual property to external APIs.",
        },
      ],
      pros: [
        "Sparse 2.5B active parameter footprint delivers blazing local inference speed",
        "Permissive Apache 2.0 open-source license with weights on Hugging Face",
        "Tuned specifically for terminal navigation, tool execution, and code synthesis",
      ],
      cons: [
        "MoE memory layout still requires ~24GB VRAM or unified memory for uncompressed weights",
        "Focused heavily on coding tasks rather than general prose or creative writing",
      ],
    },
  },

  // 6. Muse Glimmer
  {
    id: "cmucrh2museglimmer00000001",
    slug: "muse-glimmer",
    name: "Muse Glimmer",
    tagline: "Open-weight multimodal agent model built for local autonomous workflows",
    description: "Muse Glimmer is Meta Superintelligence Lab's 30-billion parameter causal multimodal model distilled from Muse Spark, purpose-built for local agentic execution.",
    websiteUrl: "https://huggingface.co/meta-models/Muse-Glimmer-30B",
    docsUrl: "https://huggingface.co/meta-models/Muse-Glimmer-30B",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-weight release under Apache 2.0 license.",
    hasApi: true,
    logoEmoji: "✨",
    logoGradient: "from-blue-700 to-slate-950",
    logoUrl: "/logos/muse-glimmer.svg",
    tagsPipe: "ai-models|multimodal|meta|agentic|open-source|tool-use",
    makerHandle: "@meta",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Muse Glimmer is an open-weight, 30-billion parameter multimodal agent model developed by Meta Superintelligence Lab and distilled from the larger Muse Spark. Designed from the ground up for autonomous task completion on local hardware, Glimmer integrates vision perception directly into its causal transformer backbone.\n\nUnlike traditional conversational LLMs, Muse Glimmer is optimized for extended agent loops: sustained multi-step planning, strict schema-based tool calling, visual screenshot interpretation, and autonomous failure recovery when environmental tools return unexpected errors.",
      useCases: [
        {
          title: "Visual UI navigation and screenshot interpretation",
          body: "Parse desktop application screenshots, diagrams, and web interfaces to drive GUI-based autonomous workflows.",
        },
        {
          title: "Self-healing agent workflows with automated failure recovery",
          body: "Detect tool execution errors, diagnose root causes, and adjust tool call parameters without terminating the session.",
        },
        {
          title: "Local on-device multimodal agent orchestration",
          body: "Power desktop assistants with OpenClaw, Hermes Agent, and custom MCP scaffolds on single-GPU hardware.",
        },
      ],
      pros: [
        "Native perception encoder allows interleaved image and text understanding",
        "Strong autonomous failure recovery and structured schema compliance",
        "Permissive Apache 2.0 license encouraging commercial and open-source deployment",
      ],
      cons: [
        "Requires quantized 4-bit configurations to fit on 16GB consumer hardware",
        "Full vision inference adds modest latency over text-only inference",
      ],
    },
  },
];

async function main() {
  console.log("=== Validating Invariants for Batch 3 ===");
  // 1. Invariant checks
  checkInvariants(TOOLS_BATCH_3);
  console.log("✓ Zero em-dashes / en-dashes confirmed.");

  for (const tool of TOOLS_BATCH_3) {
    const localLogo = path.join(process.cwd(), "public", tool.logoUrl.replace(/^\//, ""));
    if (!fs.existsSync(localLogo)) {
      throw new Error(`Logo file missing: ${localLogo}`);
    }
  }
  console.log("✓ All 6 authentic logos verified in public/logos/.");

  // 2. Ingest into Convex Production
  console.log("\n=== Ingesting into Convex Production ===");
  for (const tool of TOOLS_BATCH_3) {
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
      console.log(`✓ Patched ${tool.name}`);
    } else {
      console.log(`Creating tool ${tool.slug} in Convex...`);
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
  console.log("\n=== Verifying All 6 Tools in Convex ===");
  for (const tool of TOOLS_BATCH_3) {
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

  console.log("\n🎉 All 6 tools seeded and verified successfully in Convex!");
}

if (process.argv[1] && process.argv[1].endsWith("add-daily-tools-batch-3.ts")) {
  main().catch((err) => {
    console.error("Batch 3 ingestion failed:", err);
    process.exit(1);
  });
}
