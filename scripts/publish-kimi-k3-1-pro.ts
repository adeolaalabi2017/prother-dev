/**
 * Script to publish the Kimi K3.1 Pro blog post and add the Kimi K3.1 Pro model
 * to the Prother tools catalog in Convex.
 *
 * Adheres strictly to AGENTS.md guidelines:
 * - Authentic logo committed to public/logos/kimi-k3-1-pro.png
 * - Zero em-dashes (\u2014) or en-dashes (\u2013)
 * - All tables are rendered as visual images (no raw markdown or HTML tables)
 * - Links to related tools and models in the Prother directory
 * - Convex is the single source of truth
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://proper-kangaroo-372.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);
const NOW = Date.now();

// ── Tool Definition: Kimi K3.1 Pro ──
const KIMI_TOOL = {
  id: "cmucrh2kimik31pro00000001",
  slug: "kimi-k3-1-pro",
  name: "Kimi K3.1 Pro",
  tagline: "3T-class open-weights multimodal reasoning and autonomous terminal model",
  description:
    "Kimi K3.1 Pro is Moonshot AI's flagship 2.8T MoE reasoning model featuring a 1-million-token native context window, 104B active parameters, and #1 worldwide performance on Terminal-Bench 4.0.",
  websiteUrl: "https://www.kimi.ai",
  docsUrl: "https://platform.moonshot.cn",
  categoryLegacyId: "cmucrh2nz0007kji8aimodels0", // AI Models
  pricingModel: "paid",
  startingPrice: "$2.00 per million input tokens",
  pricingNote: "API rates: $2.00 input / $10.00 output per million tokens. Highspeed variant available for accelerated generation.",
  hasApi: true,
  logoEmoji: "🚀",
  logoGradient: "from-sky-500 to-indigo-700",
  logoUrl: "/logos/kimi-k3-1-pro.png",
  tagsPipe: "ai-models|reasoning|agentic-coding|open-weights|terminal|foundation-models",
  makerHandle: "@moonshotai",
  status: "live",
  editorsPick: true,
  curated: true,
  editorial: {
    longDescription:
      "Kimi K3.1 Pro is Moonshot AI's flagship 3T-class multimodal foundation model, engineered specifically for autonomous terminal execution, persistent software engineering, and large-scale multimodal reasoning. Built upon a 2.8-trillion parameter Sparse Mixture-of-Experts architecture with 896 micro-experts, K3.1 Pro activates 104 billion parameters per token pass to achieve frontier-level intelligence while maintaining practical inference efficiency.\n\nKey highlights include capturing the #1 worldwide ranking on Terminal-Bench 4.0 with a verified 67.2% success rate, a 51.7 score on SWE Marathon, and #4 globally on the Artificial Analysis Intelligence Index (55.1). Paired with Kimi Delta Attention (KDA) for sub-quadratic KV cache growth across its 1-million-token native context window, K3.1 Pro establishes a new benchmark for open-weights frontier capabilities.",
    useCases: [
      {
        title: "Autonomous Terminal and System Operations",
        body: "Execute complex, multi-turn bash scripts, package management, runtime debugging, and system configuration with #1 Terminal-Bench 4.0 performance.",
      },
      {
        title: "Long-Horizon Software Engineering",
        body: "Refactor multi-file repositories, resolve intricate dependency trees, and run automated unit test repairs across full codebases.",
      },
      {
        title: "Massive Context Knowledge Synthesis",
        body: "Ingest and analyze extensive document archives, full Git histories, and multimodal video inputs within its native 1M token context window.",
      },
    ],
    pros: [
      "Industry-leading 67.2% success rate on Terminal-Bench 4.0 for autonomous system control",
      "Native 1-million-token context window with sub-quadratic KDA memory scaling",
      "Sparse LatentMoE design activates only 104B out of 2.8T parameters per forward pass",
      "Full open-weights release scheduled for public download and on-premise deployment",
      "Companion Highspeed variant delivers 2x to 3x accelerated token generation speeds",
    ],
    cons: [
      "Self-hosting the full unquantized weights requires multi-node high-bandwidth accelerator clusters (1.5 TB to 5.6 TB VRAM)",
      "Niche academic prose synthesis slightly trails closed models like Claude Opus 5.5",
    ],
    alternatives: ["deepseek-v3", "claude", "chatgpt", "step-5"],
    pricingChecked: true,
  },
};

// ── Blog Post Body (Strictly no markdown tables and no em/en dashes) ──
const BLOG_POST_BODY = `Anthropic and OpenAI have long held a dominant position in the frontier LLM ecosystem: if your team required multi-step autonomous agency, multi-hour bash execution, and reliable reasoning across massive codebases, closed proprietary APIs were the only viable path.

Moonshot AI has decisively challenged that paradigm with the introduction of [Kimi K3.1 Pro](/tools/kimi-k3-1-pro).

Positioned as a 3T-class multimodal reasoning model, Kimi K3.1 Pro represents an architectural overhaul engineered specifically for long-horizon agentic execution, complex software engineering, and multi-step tool use. Debuting at **#4 globally** on the Artificial Analysis Intelligence Index with an overall score of 55.1, K3.1 Pro outperforms Western proprietary flagships like GPT-6 Astra and Google's Gemini 4 Argon. Even more striking is its showing on **Terminal-Bench 4.0**, where it captured the **#1 worldwide ranking** with an independently verified 67.2% success rate, edging out [Claude](/tools/claude) Opus 5.5.

With Moonshot AI committing to a full open-weights rollout, the frontier ecosystem faces a pivotal shift. High-end agentic reasoning is no longer the exclusive domain of closed API providers.

## Visual Executive Briefing: Architecture, Benchmarks, and Compute

The interactive carousel below compiles the complete visual briefing for Kimi K3.1 Pro, covering its granular Mixture-of-Experts architecture, its benchmark victory on Terminal-Bench 4.0, and the operational hardware spectrum required for on-premise deployment:

\`\`\`carousel
![Kimi K3.1 Pro Architectural Blueprint](/journal/kimi-k3-1-pro/architecture-stack.png)
<!-- slide -->
![Terminal-Bench 4.0 Benchmark Leaderboard](/journal/kimi-k3-1-pro/terminal-bench.png)
<!-- slide -->
![Kimi K3.1 Pro Global Standings Overview](/journal/kimi-k3-1-pro/rankings-table.png)
<!-- slide -->
![Kimi K3.1 Pro vs Leading Frontier Models](/journal/kimi-k3-1-pro/comparison-matrix.png)
<!-- slide -->
![Kimi K3.1 Pro Deployment Feasibility Matrix](/journal/kimi-k3-1-pro/deployment-matrix.png)
\`\`\`

## Global Standings and Evaluation Tiers

To understand Kimi K3.1 Pro's placement in the wider ecosystem, Artificial Analysis and independent testing labs evaluated the model across composite reasoning, terminal autonomy, and repository-scale software engineering:

![Kimi K3.1 Pro Global Standings Overview](/journal/kimi-k3-1-pro/rankings-table.png)

As reflected in the audit, Kimi K3.1 Pro's core competitive advantage lies in its practical systems execution. While previous open-weights releases like [DeepSeek-V3](/tools/deepseek-v3) established dominance in cost-effective text generation, K3.1 Pro is the first open model to take first place globally in persistent terminal control.

## Architectural Blueprint: 2.8 Trillion Parameters, Stable LatentMoE, and KDA

Building an open model capable of rivaling world-class proprietary systems requires radical innovations in parameter efficiency and context scaling. A dense 2.8-trillion parameter network would be economically unfeasible for real-time inference. Moonshot AI addressed this through three complementary architectural innovations: Stable LatentMoE, Kimi Delta Attention (KDA), and Attention Residuals (AttnRes).

![Kimi K3.1 Pro Architectural Blueprint](/journal/kimi-k3-1-pro/architecture-stack.png)

### 1. Stable LatentMoE (Sparse Routing at Scale)
Kimi K3.1 Pro incorporates approximately 2.8 trillion total parameters, yet it activates only **104 billion parameters** per forward token pass. Rather than relying on coarse 8-expert or 16-expert designs where each expert consumes hundreds of billions of weights, Moonshot AI adopted a granular architecture with **896 distinct micro-experts**.

During each forward pass, the router dynamically directs tokens to the top 16 specialized experts. This fine-grained routing improves parameter utilization, reduces expert interference during continuous training, and keeps token generation latencies manageable on modern high-bandwidth cluster topologies.

### 2. Kimi Delta Attention (KDA)
Maintaining a 1-million-token native context window creates significant computational bottlenecks, particularly in key-value (KV) cache memory. KDA applies dynamic delta-compression directly to the attention state, retaining critical historical tokens and token relationships while aggressively pruning redundant intermediate representations. As a result, the model can digest full repositories and multi-hour trace logs without suffering from context collapse or out-of-memory crashes.

### 3. Attention Residuals (AttnRes)
In ultra-deep networks, residual signals often degrade, leading to representational drift across later transformer blocks. AttnRes establishes persistent highway pathways across both feed-forward networks and multi-head attention blocks. This stabilizes training dynamics across thousands of accelerator steps and guarantees consistent attention retention across deep context sequences.

## Benchmark Deep Dive: Unpacking the Terminal-Bench Victory

Raw benchmark claims in artificial intelligence often suffer from evaluation gaming or prompt overfitting. To understand the true utility of Kimi K3.1 Pro, one must look at independent assessments focused on agentic tool execution rather than simple multiple-choice trivia.

![Terminal-Bench 4.0 Benchmark Leaderboard](/journal/kimi-k3-1-pro/terminal-bench.png)

### 1. Terminal-Bench 4.0: Autonomous Systems Mastery
Terminal-Bench 4.0 evaluates an AI system inside a headless Linux terminal environment. The model receives a high-level software goal and must independently inspect system architectures, configure packages, edit files, manage processes, diagnose compile-time failures, and write unit tests to verify the solution.

* **Independent Score**: **67.2%** (Artificial Analysis audit).
* **Significance**: Kimi K3.1 Pro captured first place globally, beating [Claude](/tools/claude) Opus 5.5 (66.4%) and GPT-6 Astra (58.2%).
* **Predecessor Comparison**: The baseline Kimi K3 model registered a score of only 12.6% on the identical benchmark. This dramatic 54.6 percentage point gain demonstrates the impact of Moonshot AI's post-training reinforcement learning focused on persistent bash execution.

### 2. SWE Marathon: Long-Horizon Software Engineering
While standard SWE-bench tests single-file patches or isolated function fixes, SWE Marathon evaluates persistent software engineering over extended sequences. Agents are tasked with complex refactoring efforts across multi-package codebases with dozens of failing dependencies.

* **Kimi K3.1 Pro**: **51.7**
* **Claude Opus 5.5**: 46.3
* **Claude Sonnet 5.5**: 48.0
* **DeepSeek-V4.1**: 41.5

K3.1 Pro's combination of a 1M context window and KDA attention enables it to hold entire directory trees and compiler stack traces in active memory without losing track of original project constraints.

### 3. Academic Reasoning and SciCode
Beyond coding tasks, K3.1 Pro delivers competitive results on difficult multi-disciplinary benchmarks:
* **Humanity's Last Exam (HLE)**: Achieved **52.5%** in baseline testing, jumping to **70.0%** when permitted to utilize integrated python verification tools.
* **SciCode (Scientific Problem Solving)**: Scored **60.8%**, indicating high mathematical synthesis and algorithmic formulation capabilities.

## The Frontier Comparison Matrix

To evaluate Kimi K3.1 Pro against current industry baselines, the visual specification matrix below contrasts its technical architecture, context capacity, benchmarks, and API economics against leading closed and open models:

![Kimi K3.1 Pro vs Leading Frontier Models](/journal/kimi-k3-1-pro/comparison-matrix.png)

### Competitive Takeaways

1. **Vs. Claude Opus 5.5**: [Claude](/tools/claude) Opus maintains a small lead in general academic intuition and nuanced prose synthesis. However, [Kimi K3.1 Pro](/tools/kimi-k3-1-pro) surpasses Opus on terminal navigation and autonomous debugging while providing a 5x larger context window at roughly 15% of the API cost.
2. **Vs. DeepSeek-V3 and DeepSeek-V4.1**: [DeepSeek](/tools/deepseek) remains the undisputed cost champion for high-throughput, low-latency commodity tasks. However, for difficult agentic tasks that require orchestrating complex developer environments, K3.1 Pro functions on a higher tier of reasoning capability.
3. **Vs. ChatGPT and GPT-6 Astra**: K3.1 Pro decisively outperforms [ChatGPT](/tools/chatgpt) and GPT-6 Astra on technical system administration and software engineering, narrowing OpenAI's traditional lead in autonomous agent execution.
4. **Vs. Step 5**: Compared to [Step 5](/tools/step-5) (StepFun's 600B MoE), K3.1 Pro offers a significantly wider context footprint (1M vs 128k) and specialized terminal execution weights.

## The Kimi Ecosystem: Highspeed Variant, Kimi Code, and API Integrations

A frontier model is only as practical as the developer ecosystem surrounding it. Moonshot AI has launched K3.1 Pro with clear production pathways.

### Kimi K3.1 Pro Highspeed
A common bottleneck in autonomous agent development is output latency. When an agent loops through fifty terminal commands sequentially, waiting ten to fifteen seconds per tool execution breaks interactive developer workflows.

Alongside the flagship model, Moonshot AI introduced **Kimi K3.1 Pro Highspeed**. This variant utilizes identical model weights and maintains matching benchmark performance while optimizing inference pipeline throughput. The result is a **2x to 3x increase in generation speed**, making interactive agent loops, automated test suites, and instant terminal refactoring substantially more responsive.

### Developer Tooling and Routing
Moonshot AI has integrated K3.1 Pro directly into its developer tooling lineup:
* **Kimi Code**: A dedicated terminal CLI tool that brings K3.1 Pro directly into the developer's shell environment. It executes diffs, manages local Git branches, and traces runtime bugs with local process isolation.
* **Kimi Work**: A cross-platform desktop workspace client designed for knowledge synthesis, large-scale PDF analysis, and multimodal document verification over the full 1M context span.
* **Global API Access**: Available directly via the Kimi platform as well as through international model routing providers such as OpenRouter. Developers can route calls easily through orchestration frameworks like [LiteLLM](/tools/litellm), [LangChain](/tools/langchain), and monitor traces using [Langfuse](/tools/langfuse).
* **Local Runner Integration**: Upon open weights distribution, developer stacks like [Ollama](/tools/ollama) and [Groq](/tools/groq) hardware setups are expected to introduce optimized quantization targets for local serving.

## Infrastructure Realities: Deploying a 2.8T MoE

While the announcement of open weights is a major milestone for open AI research, self-hosting a model of this magnitude requires serious hardware planning.

![Kimi K3.1 Pro Deployment Feasibility Matrix](/journal/kimi-k3-1-pro/deployment-matrix.png)

1. **Memory Footprint**: Even with 104B active parameters per token pass, all 2.8 trillion weights must remain resident in aggregate GPU memory to avoid severe routing latencies across layers. In FP8 quantization, serving K3.1 Pro requires roughly 2.8 Terabytes of high-bandwidth memory.
2. **Hardware Requirements**: Self-hosting K3.1 Pro demands multi-node infrastructure: typically a minimum cluster of 16 to 32 H100 or H200 accelerators connected via ultra-low-latency InfiniBand backplanes.
3. **Safety and Sanitization**: Prior to releasing the model weights publicly, Moonshot AI completed targeted safety alignment passes. These modifications focused on removing automated cyberattack and exploit generation material while preserving standard reverse engineering, code security review, and defensive debugging functionality.

For individual developers and early-stage engineering teams, consuming K3.1 Pro via API or cloud managed endpoints will remain the standard path. For large enterprises and sovereign cloud initiatives, the open weights offer an unconstrained foundation for proprietary on-premises deployments.

## Conclusion: The Closing Chasm Between Open Weights and Closed Labs

[Kimi K3.1 Pro](/tools/kimi-k3-1-pro) represents an important milestone in the evolution of open-weights models. For years, the narrative remained that open models could match proprietary systems on basic benchmarks, but lagged significantly whenever tasks required autonomous tool use, terminal control, or long context retention.

Moonshot AI has invalidated that narrative. By pairing a 2.8-trillion parameter MoE architecture with aggressive context innovations like KDA and targeted terminal reinforcement learning, K3.1 Pro claims the global #1 position in terminal autonomy while competing directly with the world's best proprietary offerings.

As the weights become publicly available, Kimi K3.1 Pro establishes a new baseline for what developers can expect from open technology: genuine frontier capability, exceptional agentic autonomy, and freedom from proprietary lock-in.`;

// ── Blog Post Definition ──
const BLOG_POST = {
  id: "cmucrh2postkimik31pro00001",
  slug: "kimi-k3-1-pro-benchmarks-and-architecture",
  title: "Kimi K3.1 Pro: Inside Moonshot AI's 3T-Class Open-Weights Powerhouse",
  excerpt:
    "Moonshot AI unveils Kimi K3.1 Pro, pairing a 2.8-trillion parameter MoE architecture with a 1-million-token context window and the #1 global ranking on Terminal-Bench 4.0. Here is our in-depth technical analysis.",
  category: "Ecosystem",
  tagsPipe: "kimi-k3-1-pro|moonshot-ai|open-weights|benchmarks|terminal-bench|ai-models|reasoning",
  coverEmoji: "🚀",
  coverGradient: "from-sky-500 to-indigo-700",
  coverUrl: "/journal/kimi-k3-1-pro/architecture-stack.png",
  author: "Prother Editorial",
  status: "published",
  readingMinutes: 7,
  seoTitle: "Kimi K3.1 Pro: Benchmarks, Architecture, and Open-Weights Analysis",
  seoDescription:
    "Comprehensive analysis of Moonshot AI's Kimi K3.1 Pro: 67.2% Terminal-Bench 4.0 score, Stable LatentMoE 2.8T architecture, 1M context window, and complete frontier comparison matrix.",
  keywords:
    "Kimi K3.1 Pro, Moonshot AI, Terminal-Bench 4.0, Artificial Analysis, LatentMoE, Kimi Delta Attention, Open Weights, Frontier AI Models, SWE Marathon, AI Benchmarks",
  publishedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  body: BLOG_POST_BODY,
};

async function main() {
  console.log("Connecting to Convex at:", CONVEX_URL);

  // ── 1. Seed or Patch Kimi K3.1 Pro Tool ──
  console.log("\n1. Syncing Kimi K3.1 Pro tool to Convex...");
  const toolsList = await convex.query(api.tools.directory, {
    page: 1,
    pageSize: 100,
    sort: "newest",
  });
  const existingTool = toolsList.rows?.find((t) => t.slug === KIMI_TOOL.slug);

  if (existingTool) {
    console.log(`Tool ${KIMI_TOOL.slug} already exists in Convex, updating...`);
    await convex.mutation(api.adminCrud.toolPatch, {
      toolLegacyId: (existingTool as any).id ?? existingTool.slug,
      data: {
        name: KIMI_TOOL.name,
        tagline: KIMI_TOOL.tagline,
        description: KIMI_TOOL.description,
        websiteUrl: KIMI_TOOL.websiteUrl,
        pricingModel: KIMI_TOOL.pricingModel,
        startingPrice: KIMI_TOOL.startingPrice,
        pricingNote: KIMI_TOOL.pricingNote,
        hasApi: KIMI_TOOL.hasApi,
        logoEmoji: KIMI_TOOL.logoEmoji,
        logoGradient: KIMI_TOOL.logoGradient,
        tagsPipe: KIMI_TOOL.tagsPipe,
        makerHandle: KIMI_TOOL.makerHandle,
        status: KIMI_TOOL.status,
        editorsPick: KIMI_TOOL.editorsPick,
        curated: KIMI_TOOL.curated,
      },
      logoUrl: KIMI_TOOL.logoUrl,
      editorial: KIMI_TOOL.editorial,
      nowMs: NOW,
    });
    console.log(`✓ Convex: Patched existing tool ${KIMI_TOOL.slug}`);
  } else {
    const res = await convex.mutation(api.adminCrud.toolCreate, {
      id: KIMI_TOOL.id,
      slug: KIMI_TOOL.slug,
      name: KIMI_TOOL.name,
      tagline: KIMI_TOOL.tagline,
      description: KIMI_TOOL.description,
      websiteUrl: KIMI_TOOL.websiteUrl,
      categoryLegacyId: KIMI_TOOL.categoryLegacyId,
      pricingModel: KIMI_TOOL.pricingModel,
      startingPrice: KIMI_TOOL.startingPrice,
      pricingNote: KIMI_TOOL.pricingNote,
      hasApi: KIMI_TOOL.hasApi,
      logoEmoji: KIMI_TOOL.logoEmoji,
      logoGradient: KIMI_TOOL.logoGradient,
      logoUrl: KIMI_TOOL.logoUrl,
      tagsPipe: KIMI_TOOL.tagsPipe,
      makerHandle: KIMI_TOOL.makerHandle,
      status: KIMI_TOOL.status,
      editorsPick: KIMI_TOOL.editorsPick,
      curated: KIMI_TOOL.curated,
      createdAt: NOW,
      editorial: KIMI_TOOL.editorial,
    });
    console.log(`✓ Convex: Created tool ${KIMI_TOOL.name} (ID: ${res.id})`);
    if (KIMI_TOOL.docsUrl) {
      await convex.mutation(api.adminCrud.toolPatch, {
        toolLegacyId: res.id,
        data: { docsUrl: KIMI_TOOL.docsUrl },
        nowMs: NOW,
      });
    }
  }

  // ── 2. Seed or Patch Blog Post ──
  console.log("\n2. Syncing Kimi K3.1 Pro blog post to Convex...");
  const postsList = await convex.query(api.posts.list, { limit: 100 });
  const existingPost = postsList.posts.find((p) => p.slug === BLOG_POST.slug);

  if (existingPost) {
    console.log(`Post ${BLOG_POST.slug} exists, updating...`);
    await convex.mutation(api.adminCrud.postPatch, {
      postLegacyId: existingPost.id ?? existingPost.slug,
      coverUrl: BLOG_POST.coverUrl,
      data: {
        title: BLOG_POST.title,
        excerpt: BLOG_POST.excerpt,
        body: BLOG_POST.body,
        category: BLOG_POST.category,
        tagsPipe: BLOG_POST.tagsPipe,
        status: BLOG_POST.status,
        author: BLOG_POST.author,
        readingMinutes: BLOG_POST.readingMinutes,
        seoTitle: BLOG_POST.seoTitle,
        seoDescription: BLOG_POST.seoDescription,
        keywords: BLOG_POST.keywords,
        coverEmoji: BLOG_POST.coverEmoji,
        coverGradient: BLOG_POST.coverGradient,
      },
    });
    console.log(`✓ Convex: Patched existing blog post ${BLOG_POST.slug}`);
  } else {
    const postRes = await convex.mutation(api.adminCrud.postCreate, {
      id: BLOG_POST.id,
      slug: BLOG_POST.slug,
      title: BLOG_POST.title,
      excerpt: BLOG_POST.excerpt,
      body: BLOG_POST.body,
      category: BLOG_POST.category,
      tagsPipe: BLOG_POST.tagsPipe,
      coverEmoji: BLOG_POST.coverEmoji,
      coverGradient: BLOG_POST.coverGradient,
      coverUrl: BLOG_POST.coverUrl,
      readingMinutes: BLOG_POST.readingMinutes,
      author: BLOG_POST.author,
      status: BLOG_POST.status,
      seoTitle: BLOG_POST.seoTitle,
      seoDescription: BLOG_POST.seoDescription,
      keywords: BLOG_POST.keywords,
      publishedAt: BLOG_POST.publishedAt,
      createdAt: BLOG_POST.createdAt,
      updatedAt: BLOG_POST.updatedAt,
    });
    console.log(`✓ Convex: Created blog post ${BLOG_POST.title} (Slug: ${postRes.slug})`);
  }

  // ── 3. Verification ──
  console.log("\n3. Verifying tool in Convex...");
  const verifiedTool = await convex.query(api.tools.pageData, { slug: KIMI_TOOL.slug });
  if ("error" in verifiedTool) {
    throw new Error(`Tool verification failed: ${verifiedTool.error}`);
  }
  console.log("✓ Tool verified successfully:");
  console.log(`  - Name: ${verifiedTool.tool.name}`);
  console.log(`  - Slug: ${verifiedTool.tool.slug}`);
  console.log(`  - Pricing: ${verifiedTool.tool.pricingModel} (${verifiedTool.tool.startingPrice})`);
  console.log(`  - Logo URL: ${verifiedTool.logoUrl}`);
  console.log(`  - Category: ${verifiedTool.tool.category.name}`);

  console.log("\n4. Verifying blog post in Convex...");
  const verifiedPost = await convex.query(api.seo.blogDetail, { slug: BLOG_POST.slug });
  if ("error" in verifiedPost) {
    throw new Error(`Post verification failed: ${verifiedPost.error}`);
  }
  console.log("✓ Blog post verified successfully:");
  console.log(`  - Title: ${verifiedPost.post.title}`);
  console.log(`  - Slug: ${verifiedPost.post.slug}`);
  console.log(`  - Category: ${verifiedPost.post.category}`);
  console.log(`  - Status: ${verifiedPost.post.status}`);
  console.log(`  - Reading time: ${verifiedPost.post.readingMinutes} min`);
  console.log(`  - Cover URL: ${verifiedPost.post.coverUrl}`);
  console.log("\nSuccess: Kimi K3.1 Pro tool and blog post have been published!");
}

main().catch((err) => {
  console.error("Publication failed:", err);
  process.exit(1);
});
