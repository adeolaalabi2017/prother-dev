/**
 * Batch 4 Ingestion: 4 New Frontier Tools
 * 1. Seedance 2.5 (seedance-2-5) - generative-content
 * 2. GPT-6 Astra (gpt-6-astra) - ai-models
 * 3. GPT-6.1 Sol (gpt-6-1-sol) - ai-models
 * 4. Claude Duet (claude-duet) - automation
 *
 * (Note: Qoder, Opus 5.5, MiniMax M3.1, and DeepSeek V4.1 Flash are already indexed on Prother)
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
  GENERATIVE_CONTENT: "k175btb2w538a03m53m4e9yaj18f3frz",
  AI_MODELS: "k17epqr8azy8tc0433j64ysjax8fbwze",
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

export const TOOLS_BATCH_4 = [
  // 1. Seedance 2.5
  {
    id: "cmucrh2seedance25000000001",
    slug: "seedance-2-5",
    name: "Seedance 2.5",
    tagline: "Cinematic multimodal video and audio generation model",
    description: "Seedance 2.5 is ByteDance's unified multimodal diffusion model capable of generating continuous 4K video clips with synchronized native dialogue, audio effects, and multi-reference storyboard consistency.",
    websiteUrl: "https://seedance.ai",
    docsUrl: "https://seedance.ai",
    categoryLegacyId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free community generations; scalable credit packs for production exports.",
    hasApi: true,
    logoEmoji: "🎬",
    logoGradient: "from-blue-600 to-indigo-950",
    logoUrl: "/logos/seedance-2-5.svg",
    tagsPipe: "generative-video|multimodal|bytedance|cinematic|diffusion|audio-synthesis",
    makerHandle: "@bytedance",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Seedance 2.5 is ByteDance's flagship multimodal video synthesis model, engineered to unify cinematic visual generation with native audio and acoustic environment synthesis. Utilizing a dual-branch Diffusion Transformer architecture, Seedance 2.5 processes script descriptions, storyboard timing, and character voice cues concurrently within a single generation step.\n\nSupporting up to 50 reference inputs per project, creators can anchor precise character faces, wardrobe details, lighting moods, and set environments across multi-scene narrative sequences without drift. The model natively outputs realistic physics, multi-speaker lip synchronization, and high-fidelity 4K resolutions.",
      useCases: [
        {
          title: "Cinematic narrative shorts and commercial video production",
          body: "Direct 30-second sequences with coherent cinematography, camera trajectories, and temporal scene consistency.",
        },
        {
          title: "Synchronized multilingual dialogue and sound design",
          body: "Synthesize realistic lip-synced speech, Foley sound effects, and ambient scores matching visual pacing.",
        },
        {
          title: "Multi-reference character and storyboard consistency",
          body: "Lock character designs, environments, and color palettes across multiple distinct camera angles.",
        },
      ],
      pros: [
        "Concurrent visual and acoustic generation avoids disjointed post-production",
        "Supports comprehensive multi-reference image and 3D guidance inputs",
        "High-definition 1080p and 4K output with smooth camera physics",
      ],
      cons: [
        "High compute footprint results in generation queues during peak hours",
        "Complex shot composition requires precise storyboard prompt structures",
      ],
    },
  },

  // 2. GPT-6 Astra
  {
    id: "cmucrh2gpt6astra0000000001",
    slug: "gpt-6-astra",
    name: "GPT-6 Astra",
    tagline: "Flagship frontier foundation model for long-horizon agentic reasoning and computer use",
    description: "GPT-6 Astra is OpenAI's flagship frontier model engineered for end-to-end autonomous workflows, million-token context parsing, deep scientific deduction, and high-precision computer control.",
    websiteUrl: "https://openai.com",
    docsUrl: "https://platform.openai.com/docs",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "paid",
    startingPrice: "$20/mo",
    pricingNote: "Included with ChatGPT Pro/Team; API usage billed per token with tier-5 throughput.",
    hasApi: true,
    logoEmoji: "🪐",
    logoGradient: "from-zinc-900 to-black",
    logoUrl: "/logos/gpt-6-astra.svg",
    tagsPipe: "ai-models|openai|frontier-model|reasoning|agentic|computer-use",
    makerHandle: "@openai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "GPT-6 Astra represents OpenAI's highest-tier frontier intelligence model, designed for autonomous multi-step problem solving across complex digital environments. Built on advanced recursive self-verification techniques, Astra processes context windows surpassing one million tokens with unprecedented factual accuracy and needle-retrieval fidelity.\n\nAstra is specifically optimized for computer use and multi-app orchestration, executing dense terminal commands, interacting with desktop user interfaces, drafting formal scientific proofs, and debugging enterprise-scale software architectures.",
      useCases: [
        {
          title: "Autonomous computer use and multi-application agent loops",
          body: "Navigate graphical interfaces, execute terminal shell scripts, and complete end-to-end digital tasks.",
        },
        {
          title: "Deep scientific research and mathematical deduction",
          body: "Analyze dense datasets, derive symbolic logic formulations, and evaluate complex hypotheses.",
        },
        {
          title: "Enterprise codebase architecture and repository migration",
          body: "Refactor legacy architectures across hundreds of files in a single unified reasoning context.",
        },
      ],
      pros: [
        "Unmatched reasoning benchmarks and zero-shot autonomous task completion",
        "Native high-precision computer-use and tool invocation capability",
        "Expansive context window exceeding one million tokens with robust recall",
      ],
      cons: [
        "Premium token pricing compared to mid-tier distillation models",
        "Higher compute latency on extended multi-turn reasoning steps",
      ],
    },
  },

  // 3. GPT-6.1 Sol
  {
    id: "cmucrh2gpt61sol00000000001",
    slug: "gpt-6-1-sol",
    name: "GPT-6.1 Sol",
    tagline: "High-efficiency frontier reasoning model for production agent workflows",
    description: "GPT-6.1 Sol is OpenAI's cost-optimized frontier model delivering near-Astra performance in software engineering, multi-step business workflow execution, and document analysis at a fraction of the inference cost.",
    websiteUrl: "https://openai.com",
    docsUrl: "https://platform.openai.com/docs",
    categoryLegacyId: CATEGORY_MAP.AI_MODELS,
    d1CategoryId: D1_CATEGORY_MAP.AI_MODELS,
    pricingModel: "paid",
    startingPrice: "Usage-based",
    pricingNote: "Cost-efficient token pricing optimized for high-volume enterprise production.",
    hasApi: true,
    logoEmoji: "☀️",
    logoGradient: "from-amber-600 to-neutral-900",
    logoUrl: "/logos/gpt-6-1-sol.svg",
    tagsPipe: "ai-models|openai|cost-efficient|reasoning|code-generation|production-api",
    makerHandle: "@openai",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "GPT-6.1 Sol is OpenAI's production-tailored frontier model, delivering an optimal balance between top-tier reasoning intelligence and high operational throughput. Engineered through aggressive post-training distillation from Astra, Sol achieves 85-90% of flagship benchmark scores while running at roughly one-fifth of the operational token cost.\n\nEquipped with a 1.05-million-token context window and fast streaming response times, GPT-6.1 Sol is the preferred workhorse model for daily software engineering copilot tasks, customer-facing agent backends, automated document auditing, and large-scale data transformation pipelines.",
      useCases: [
        {
          title: "High-volume developer copilots and automated PR review",
          body: "Run continuous automated code reviews, test case generations, and syntax checks economically.",
        },
        {
          title: "Enterprise document analysis and regulatory compliance",
          body: "Audit lengthy financial filings and contracts with high-speed token ingestion.",
        },
        {
          title: "Scalable customer-facing agent architectures",
          body: "Power interactive chat and service automation that require intelligent tool calling at low latency.",
        },
      ],
      pros: [
        "Nearly matches flagship capabilities at approximately one-fifth of token cost",
        "Fast time-to-first-token and sustained high throughput streaming",
        "Over one-million-token context window for large documentation sets",
      ],
      cons: [
        "Slightly trailing Astra on frontier-level novel mathematical discoveries",
        "Proprietary API access without self-hosted offline deployment",
      ],
    },
  },

  // 4. Claude Duet
  {
    id: "cmucrh2claudeduet000000001",
    slug: "claude-duet",
    name: "Claude Duet",
    tagline: "Proactive cloud-native agent assistant with persistent workspace execution",
    description: "Claude Duet is Anthropic's proactive agentic assistant running in isolated cloud virtual machines. Powered by Claude Opus 5.5, Duet autonomously manages cross-tool monitoring, daily executive briefings, and multi-hour workflow execution.",
    websiteUrl: "https://claude.ai",
    docsUrl: "https://docs.anthropic.com",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "paid",
    startingPrice: "$20/mo",
    pricingNote: "Included for Claude Pro and Max subscribers during research preview.",
    hasApi: true,
    logoEmoji: "🤝",
    logoGradient: "from-amber-700 to-stone-900",
    logoUrl: "/logos/claude-duet.svg",
    tagsPipe: "automation|agent-assistant|anthropic|proactive-ai|cloud-execution|workspace",
    makerHandle: "@anthropic",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Claude Duet marks Anthropic's transition from passive chat prompts to proactive, persistent agent collaboration. Rather than waiting for instructions, Duet operates within a secure dedicated cloud virtual machine powered by Claude Opus 5.5. It continuously monitors authorized workplace tools (including email inboxes, calendar schedules, spreadsheets, and developer repositories) to identify urgent items and synthesize daily action briefs.\n\nDuet can execute long-running asynchronous tasks independently while users are offline: compiling competitive research, prototyping web applications, or organizing messy datasets. Designed with strict safety boundaries, Duet requires explicit human-in-the-loop authorization before sending external communications or executing irreversible operations.",
      useCases: [
        {
          title: "Proactive morning briefs and daily schedule triage",
          body: "Synthesize priority threads, impending calendar meetings, and actionable items into a cohesive daily summary.",
        },
        {
          title: "Autonomous background data gathering and application prototyping",
          body: "Execute complex research workflows and code sandbox builds on cloud virtual machines without manual supervision.",
        },
        {
          title: "Human-in-the-loop workspace task delegation",
          body: "Draft communications and prepare spreadsheet updates with approval gates for high-impact actions.",
        },
      ],
      pros: [
        "Runs persistently in cloud VMs without requiring user device uptime",
        "Proactive notification model interrupts only for genuinely critical items",
        "Deep integration with Claude Marketplace apps and workspace tools",
      ],
      cons: [
        "Currently in research preview with initial waitlist access for US subscribers",
        "Requires subscription to Claude Pro or Max tiers",
      ],
    },
  },
];

async function main() {
  console.log("=== Validating Invariants for Batch 4 ===");
  checkInvariants(TOOLS_BATCH_4);
  console.log("✓ Zero em-dashes / en-dashes confirmed.");

  for (const tool of TOOLS_BATCH_4) {
    const localLogo = path.join(process.cwd(), "public", tool.logoUrl.replace(/^\//, ""));
    if (!fs.existsSync(localLogo)) {
      throw new Error(`Logo file missing: ${localLogo}`);
    }
  }
  console.log("✓ All 4 authentic logos verified in public/logos/.");

  console.log("\n=== Ingesting into Convex Production ===");
  for (const tool of TOOLS_BATCH_4) {
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

  console.log("\n=== Verifying All 4 Tools in Convex ===");
  for (const tool of TOOLS_BATCH_4) {
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

  console.log("\n🎉 All 4 tools seeded and verified successfully in Convex!");
}

if (process.argv[1] && process.argv[1].endsWith("add-daily-tools-batch-4.ts")) {
  main().catch((err) => {
    console.error("Batch 4 ingestion failed:", err);
    process.exit(1);
  });
}
