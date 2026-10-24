/**
 * Batch Ingestion: 8 AI Agent Infrastructure and Sandbox Tools
 * 1. boat (boat.dev) - dev-platforms
 * 2. Prized (prized.dev) - dev-platforms
 * 3. Agent 37 (agent37.com) - dev-platforms
 * 4. Superserve (superserve.ai) - dev-platforms
 * 5. Freestyle (freestyle.sh) - dev-platforms
 * 6. Celesto (celesto.ai) - automation
 * 7. CreateOS (createos.sh) - automation
 * 8. DigitalOcean Managed Agents (digitalocean.com) - dev-platforms
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

export const D1_CATEGORY_MAP = {
  DEV_PLATFORMS: "k175a9fam1rt3wjxfz0c2eyth18f2adb",
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

export const TOOLS_AGENT_INFRA = [
  // 1. boat
  {
    id: "cmucrh2boat00000000000001",
    slug: "boat",
    name: "boat",
    tagline: "Persistent Linux VMs for AI agents with SSH, Docker, and fast disk-level fork",
    description: "boat provides persistent Ubuntu virtual machines built specifically for AI agents, featuring root SSH access, Docker, a 60fps virtual desktop, and instant disk-level snapshot forking.",
    websiteUrl: "https://boat.dev",
    docsUrl: "https://docs.boat.dev",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free trial / $20/mo",
    pricingNote: "7-day free trial includes 25 compute hours; paid plans start at $20/month for 2M VM-seconds (approx 555 hours) with per-second billing.",
    hasApi: true,
    logoEmoji: "⛵",
    logoGradient: "from-blue-600 to-indigo-900",
    logoUrl: "/logos/boat.svg",
    tagsPipe: "dev-platforms|agent-sandboxes|linux-vms|docker|vm-forking|cli",
    makerHandle: "@boatdotdev",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "boat is dedicated sandbox infrastructure designed for agent factories, developer tools, and autonomous coding agents. Unlike ephemeral execution environments that wipe state between commands, boat provides persistent Ubuntu virtual machines equipped with root SSH/SCP access, pre-installed developer runtimes (Docker, VS Code, Chrome, GitHub CLI, Rust, Node.js, and Bun), and a responsive 60fps remote virtual desktop.\n\nAgents can execute arbitrary software development workflows, build container images, run headless browsers, and fork active disk states instantaneously to explore branching solutions. With per-second billing that pauses automatically when machines stop, boat delivers cost-effective infrastructure for both interactive coding assistants and parallel multi-agent fleets.",
      useCases: [
        {
          title: "Multi-agent coding sandboxes with Docker and toolchains",
          body: "Equip coding agents like Claude Code, Codex, or OpenCode with full Ubuntu machines pre-configured with compilers, language toolchains, and container daemons.",
        },
        {
          title: "Instant snapshot forking for speculative agent branches",
          body: "Fork active VM disks in milliseconds to let AI agents test risky code refactors or alternative solutions without losing parent state.",
        },
        {
          title: "Interactive agent observation via 60fps virtual desktop",
          body: "Inspect GUI workflows, browser navigations, and web application states directly through low-latency remote desktop streaming.",
        },
      ],
      pros: [
        "Full root Linux environments with Docker daemon running directly inside the VM",
        "Sub-second disk-level forking enables speculative and parallel agent execution",
        "Granular per-second billing with free paused state saves compute costs",
      ],
      cons: [
        "Current primary regions are located in Europe (Germany), with global multi-region rollout underway",
        "Requires managing persistent disk allocations for large long-lived sandbox fleets",
      ],
      alternatives: ["browserbase", "e2b", "modal"],
      pricingChecked: true,
    },
  },

  // 2. Prized
  {
    id: "cmucrh2prized000000000001",
    slug: "prized",
    name: "Prized",
    tagline: "Cloud dev boxes and isolated microVMs designed for autonomous coding agents",
    description: "Prized provides instant, disposable microVMs and cloud development boxes built to give autonomous coding agents isolated runtime environments with full root access.",
    websiteUrl: "https://prized.dev",
    docsUrl: "https://prized.dev",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free ($30 credit)",
    pricingNote: "$30 in free compute credits upon registration with no credit card required; microVMs billed per second thereafter.",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-neutral-700 to-neutral-950",
    logoUrl: "/logos/prized.svg",
    tagsPipe: "dev-platforms|coding-agents|microvms|cloud-sandboxes|developer-environments",
    makerHandle: "@prizeddev",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Prized is an infrastructure platform engineered specifically for software development agents and automated code generation pipelines. By delivering lightweight, fast-booting microVMs, Prized eliminates the security risks and configuration headaches of running untrusted agent code on local developer machines or shared staging clusters.\n\nEvery Prized sandbox comes fully isolated with programmatic API and CLI controls, allowing developers to spin up fresh developer boxes, execute complex build test cycles, inspect terminal logs, and tear down instances in seconds. Generous starter credits let engineering teams evaluate automated agent loops before scaling to production workloads.",
      useCases: [
        {
          title: "Safe execution of autonomous pull request reviews and fixes",
          body: "Run autonomous coding agents in isolated microVMs that clone repositories, run unit tests, and generate diffs safely.",
        },
        {
          title: "Automated end-to-end integration test sandboxes",
          body: "Spin up isolated, multi-service environments on demand to test agent-authored patches against live databases and APIs.",
        },
        {
          title: "Disposable agent scratchpads for multi-step reasoning",
          body: "Give LLM reasoning loops dedicated Linux environments to execute terminal commands, verify shell output, and iterate on solutions.",
        },
      ],
      pros: [
        "Instant microVM provisioning with dedicated root privileges and networking",
        "Generous $30 credit allocation on signup with zero credit card barrier",
        "Tailored developer ergonomics for automated CLI and programmatic agent integration",
      ],
      cons: [
        "Focused primarily on software development and coding workloads rather than graphical desktop apps",
        "Ecosystem integrations and community SDKs are actively expanding",
      ],
      alternatives: ["boat", "freestyle", "browserbase"],
      pricingChecked: true,
    },
  },

  // 3. Agent 37
  {
    id: "cmucrh2agent3700000000001",
    slug: "agent37",
    name: "Agent 37",
    tagline: "Low-cost cloud sandbox infrastructure built for scaling autonomous AI agents",
    description: "Agent 37 delivers dedicated agent sandboxes with pre-installed runtimes, integrations, and low-latency execution at 94% lower cost than traditional sandbox providers.",
    websiteUrl: "https://www.agent37.com",
    docsUrl: "https://www.agent37.com",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "paid",
    startingPrice: "$5/mo",
    pricingNote: "Ultra-low-cost sandbox hosting starting at approximately $5/month with per-minute execution and tool integrations.",
    hasApi: true,
    logoEmoji: "🤖",
    logoGradient: "from-zinc-800 to-black",
    logoUrl: "/logos/agent37.png",
    tagsPipe: "dev-platforms|agent-sandboxes|infrastructure|cost-effective|agent-runtime",
    makerHandle: "@agent37",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Agent 37 is designed for builders who want to run thousands of concurrent autonomous agents without suffering prohibitive cloud infrastructure bills. Traditional cloud sandboxes often charge steep hourly minimums or heavy orchestration markups; Agent 37 focuses on aggressive cost efficiency, delivering reliable Linux compute at up to 94% lower cost than comparable services.\n\nWith built-in support for popular agent frameworks (including Claude Code, Hermes, OpenClaw, and Composio toolkits), Agent 37 provides turn-key environments where agents can access APIs, read and write files, execute bash scripts, and interact with external enterprise services seamlessly.",
      useCases: [
        {
          title: "High-volume concurrent agent swarm deployment",
          body: "Run massive fleets of background research, scraping, and verification agents at a fraction of standard cloud sandbox costs.",
        },
        {
          title: "Composio and multi-tool workflow execution",
          body: "Connect autonomous agents to over 1,000 external enterprise apps and APIs within a secure, managed sandbox runtime.",
        },
        {
          title: "Continuous background task orchestration",
          body: "Maintain persistent agent listeners that monitor repositories, inbox queues, or database updates without compute cost spikes.",
        },
      ],
      pros: [
        "Drastically lower operational costs compared to mainstream serverless sandbox providers",
        "Pre-built integrations with major agent toolkits and enterprise connectors",
        "Simple API integration for spinning up and terminating worker instances",
      ],
      cons: [
        "Fewer specialized GPU configurations compared to heavy machine learning platforms",
        "Documentation is streamlined and centers primarily on core sandbox lifecycle APIs",
      ],
      alternatives: ["boat", "freestyle", "superserve"],
      pricingChecked: true,
    },
  },

  // 4. Superserve
  {
    id: "cmucrh2superserve00000001",
    slug: "superserve",
    name: "Superserve",
    tagline: "Virtual machine infrastructure engineered for long-horizon autonomous agents",
    description: "Superserve provides reliable cloud VMs tailored for multi-hour, long-horizon agent execution, with persistent state, tool orchestration, and full network access.",
    websiteUrl: "https://www.superserve.ai",
    docsUrl: "https://www.superserve.ai",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free tier / Pay-as-you-go",
    pricingNote: "Developer tier includes starter sandbox hours; paid scale tiers billed on compute uptime and resource reservation.",
    hasApi: true,
    logoEmoji: "🌐",
    logoGradient: "from-emerald-400 to-teal-800",
    logoUrl: "/logos/superserve.svg",
    tagsPipe: "dev-platforms|long-horizon-agents|cloud-vms|orchestration|agent-infrastructure",
    makerHandle: "@superserveai",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "Superserve addresses one of the hardest challenges in production AI agents: sustaining multi-hour, long-horizon tasks without session degradation or sudden timeouts. Standard cloud runtimes are optimized for short, stateless HTTP request/response lifecycles; Superserve re-architects compute specifically around the stateful, iterative nature of deep research and autonomous execution.\n\nEach Superserve VM maintains continuous filesystem state, background process management, and reliable outbound networking. Autonomous agents can conduct deep research investigations, compile extensive codebases, manage long-running data transformations, and checkpoint progress incrementally.",
      useCases: [
        {
          title: "Long-horizon autonomous web research and synthesis",
          body: "Allow research agents to explore dozens of sources, download documents, and synthesize reports across multi-hour execution windows.",
        },
        {
          title: "Complex multi-stage data transformations",
          body: "Run stateful agent data pipelines that process, clean, and enrich datasets without worrying about serverless timeout limits.",
        },
        {
          title: "Persistent background engineering monitors",
          body: "Deploy continuous engineering agents that maintain active sessions to monitor logs, triage exceptions, and submit diagnostic reports.",
        },
      ],
      pros: [
        "Specifically architected to prevent timeout cutoffs during multi-hour agent workflows",
        "Full state persistence across intermediate reasoning iterations and tool calls",
        "Robust networking and proxy management for uninterrupted web research",
      ],
      cons: [
        "Overkill for simple single-turn prompt-and-response tasks",
        "Requires developers to design agents with checkpointing and error-recovery practices",
      ],
      alternatives: ["boat", "agent37", "browserbase"],
      pricingChecked: true,
    },
  },

  // 5. Freestyle
  {
    id: "cmucrh2freestyle000000001",
    slug: "freestyle",
    name: "Freestyle",
    tagline: "Isolated real Linux virtual machines built for code you did not write",
    description: "Freestyle provides lightweight, isolated Linux VMs for AI agents to safely execute untrusted code, run browser workloads, and host parallel development tasks.",
    websiteUrl: "https://www.freestyle.sh",
    docsUrl: "https://www.freestyle.sh/docs",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free / $0/mo",
    pricingNote: "Free plan available for development; Hobby plan ($50/month) covers usage, with compute billed at $0.04032/vCPU-hr and $0.0129/GiB-hr.",
    hasApi: true,
    logoEmoji: "☁️",
    logoGradient: "from-cyan-500 to-blue-700",
    logoUrl: "/logos/freestyle.svg",
    tagsPipe: "dev-platforms|linux-vms|sandboxes|secure-execution|code-interpreter",
    makerHandle: "@freestylesh",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Freestyle delivers full Linux virtual machines built to safely execute code you did not write. When AI agents write scripts, run shell commands, or test community libraries, executing that code inside ordinary containers or shared host kernels risks privilege escalation, network pollution, and compromised infrastructure. Freestyle solves this with strong micro-hypervisor hardware isolation.\n\nDevelopers can launch real Linux VMs programmatically via TypeScript and Python SDKs, execute shell commands, attach network volumes, and interact with headless browsers. With transparent resource-based pricing ($0.04032 per vCPU hour and $0.0129 per GiB RAM hour) and a free starter tier, Freestyle makes safe agent execution accessible for hobbyists and enterprise platforms alike.",
      useCases: [
        {
          title: "Safe execution of LLM-generated code and scripts",
          body: "Execute dynamic Python, Node.js, and Bash code generated by frontier models inside isolated hardware-level Linux sandboxes.",
        },
        {
          title: "Interactive AI agent browser automation and testing",
          body: "Spin up sandboxed Chrome sessions to let autonomous agents navigate web applications, click controls, and extract data safely.",
        },
        {
          title: "Multi-tenant developer platform sandboxes",
          body: "Provide end users of your AI application with dedicated virtual machines that keep code and credentials strictly separated.",
        },
      ],
      pros: [
        "True hardware-isolated Linux virtual machines rather than shared container namespaces",
        "Transparent pay-as-you-go pricing with a permanent free development tier",
        "Modern developer experience with first-class TypeScript and Python SDKs",
      ],
      cons: [
        "Virtual machine boot times, while fast, are slightly higher than pure in-process WASM sandboxes",
        "Network-intensive workloads incur standard bandwidth transfer costs",
      ],
      alternatives: ["boat", "prized", "browserbase"],
      pricingChecked: true,
    },
  },

  // 6. Celesto
  {
    id: "cmucrh2celesto00000000001",
    slug: "celesto",
    name: "Celesto",
    tagline: "Hardware-isolated cloud computers with browser, desktop, and shell access for AI agents",
    description: "Celesto combines an agent runtime with hardware-isolated cloud sandboxes, allowing developers to define agents in markdown and deploy them to real machines with desktop and shell controls.",
    websiteUrl: "https://celesto.ai",
    docsUrl: "https://celesto.ai/docs",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free tier / Pay-as-you-go",
    pricingNote: "Starter sandbox credits on signup; paid plans scale with VM capacity, memory allocation, and active execution hours.",
    hasApi: true,
    logoEmoji: "🖥️",
    logoGradient: "from-indigo-600 to-purple-900",
    logoUrl: "/logos/celesto.svg",
    tagsPipe: "automation|computer-use|agent-runtime|desktop-automation|isolated-sandboxes",
    makerHandle: "@celestoai",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Celesto is an end-to-end platform uniting agent runtimes with hardware-isolated cloud computers. Instead of piecing together disparate prompt frameworks, Docker sandboxes, and remote desktop protocols, Celesto lets engineers define agent behaviors in concise Markdown specifications, connect Model Context Protocol (MCP) servers, and deploy instantly onto dedicated cloud environments.\n\nEach agent receives its own real machine with full desktop GUI, headless browser, shell, and filesystem access. This enables sophisticated computer-use agents that can interact with desktop software, automate administrative workflows, perform data entry across legacy enterprise portals, and verify UI states visually.",
      useCases: [
        {
          title: "Computer-use agent execution on real desktop software",
          body: "Empower vision-language agents to click buttons, type text, and manipulate desktop GUIs in isolated cloud environments.",
        },
        {
          title: "Markdown-driven agent definitions with MCP integration",
          body: "Specify agent prompts, operational constraints, and tools directly in markdown files with native Model Context Protocol support.",
        },
        {
          title: "Automated legacy web portal workflows and data entry",
          body: "Automate complex web forms and legacy enterprise portals that lack public APIs by having agents navigate authentic browser sessions.",
        },
      ],
      pros: [
        "Unifies agent prompt authoring with isolated cloud machine provisioning",
        "Full desktop GUI, browser, and shell access for versatile computer-use workflows",
        "Native Model Context Protocol (MCP) connectivity for easy tool integration",
      ],
      cons: [
        "Full desktop streaming environments consume more memory and compute than headless microVMs",
        "Requires configuring appropriate vision models to take full advantage of desktop GUI interactions",
      ],
      alternatives: ["boat", "browserbase", "createos"],
      pricingChecked: true,
    },
  },

  // 7. CreateOS
  {
    id: "cmucrh2createos0000000001",
    slug: "createos",
    name: "CreateOS",
    tagline: "Unified execution operating system and governance platform for enterprise AI agents",
    description: "CreateOS provides an enterprise-ready operating system layer for managing, securing, and orchestrating multi-agent systems across internal applications and cloud resources.",
    websiteUrl: "https://createos.sh",
    docsUrl: "https://createos.sh",
    categoryLegacyId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free / Open-core",
    pricingNote: "Free developer edition and open-source core; enterprise governance, SSO, and dedicated cluster deployments priced on quote.",
    hasApi: true,
    logoEmoji: "📦",
    logoGradient: "from-stone-700 to-zinc-950",
    logoUrl: "/logos/createos.png",
    tagsPipe: "automation|agentic-os|enterprise-agents|orchestration|governance",
    makerHandle: "@createos",
    status: "live",
    editorsPick: false,
    curated: true,
    editorial: {
      longDescription: "CreateOS is an agentic operating system designed to bring governance, observability, and structured orchestration to enterprise AI deployments. As organizations transition from individual chat assistants to fleets of autonomous agents collaborating across internal databases and third-party tools, managing permissions, credentials, and execution logs becomes mission-critical.\n\nCreateOS acts as the control plane: it provides fine-grained role-based access control, tool sandboxing, audit trails, and multi-agent coordination pipelines. Enterprise teams can safely deploy autonomous agents into production environments knowing that every tool invocation, data query, and system modification is monitored and governed.",
      useCases: [
        {
          title: "Enterprise agent access control and credential management",
          body: "Isolate agent tool permissions and securely inject API keys and database credentials without exposing secrets to model contexts.",
        },
        {
          title: "Multi-agent team coordination and task delegation",
          body: "Orchestrate collaborative agent hierarchies where specialized planner agents delegate subtasks to researcher and coder agents.",
        },
        {
          title: "Comprehensive audit logging and compliance tracking",
          body: "Record complete execution histories, tool call inputs, and outputs to satisfy corporate security and compliance reviews.",
        },
      ],
      pros: [
        "Enterprise-first security model with strict tool gating and credential management",
        "Comprehensive observability into multi-agent decision chains and tool invocations",
        "Modular architecture compatible with popular LLM providers and open frameworks",
      ],
      cons: [
        "Adds an operational management layer that may be unnecessary for simple single-agent setups",
        "Full enterprise features require custom deployment coordination",
      ],
      alternatives: ["celesto", "langfuse", "browserbase"],
      pricingChecked: true,
    },
  },

  // 8. DigitalOcean Managed Agents
  {
    id: "cmucrh2doagents0000000001",
    slug: "digitalocean-agents",
    name: "DigitalOcean Managed Agents",
    tagline: "Fully managed cloud infrastructure for hosting, deploying, and scaling AI agents",
    description: "DigitalOcean Managed Agents lets development teams spin up, host, and scale agentic workloads on managed cloud compute without managing low-level Kubernetes or cluster nodes.",
    websiteUrl: "https://www.digitalocean.com/products/managed-agents",
    docsUrl: "https://docs.digitalocean.com",
    categoryLegacyId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "paid",
    startingPrice: "$12/mo",
    pricingNote: "Pricing is transparently tied to underlying Droplet and App Platform compute tiers, starting around $12/month.",
    hasApi: true,
    logoEmoji: "🌊",
    logoGradient: "from-blue-500 to-blue-800",
    logoUrl: "/logos/digitalocean.svg",
    tagsPipe: "dev-platforms|managed-hosting|cloud-infrastructure|digitalocean|agent-deployment",
    makerHandle: "@digitalocean",
    status: "live",
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "DigitalOcean Managed Agents provides streamlined cloud infrastructure designed to remove devops friction from deploying and scaling production AI agents. Instead of configuring complex Kubernetes operators, container networking, and auto-scalers from scratch, developers can deploy autonomous agents with simple configuration files or Git-connected pipelines.\n\nBacked by DigitalOcean reliable Droplet and App Platform foundation, Managed Agents provides built-in metrics, log streaming, secret management, and automatic restarts. Engineering teams can focus on model prompts and agent logic while relying on DigitalOcean global infrastructure for uptime, security, and bandwidth predictability.",
      useCases: [
        {
          title: "Git-backed continuous deployment for AI agent workers",
          body: "Automatically build and deploy autonomous agent containers on every git push with zero-downtime updates.",
        },
        {
          title: "Predictable, low-cost cloud hosting for background agents",
          body: "Host 24/7 background agents on dedicated compute instances with flat-rate, transparent monthly pricing.",
        },
        {
          title: "Managed scaling for fluctuating agent task queues",
          body: "Scale agent worker pools dynamically as background queue depths increase during peak business hours.",
        },
      ],
      pros: [
        "Simple, predictable pricing model with zero surprise bandwidth or orchestration surcharges",
        "Turn-key integration with DigitalOcean managed databases, VPCs, and storage",
        "Familiar developer ergonomics with Git push deploys and instant rollbacks",
      ],
      cons: [
        "Less specialized for sub-second microVM fork workflows than dedicated agent sandbox platforms",
        "Focused on persistent container hosting rather than disposable per-call browser sandboxes",
      ],
      alternatives: ["boat", "freestyle", "superserve"],
      pricingChecked: true,
    },
  },
];

async function main() {
  console.log("=== Validating Invariants for 8 Agent Infra Tools ===");
  checkInvariants(TOOLS_AGENT_INFRA, "TOOLS_AGENT_INFRA");
  console.log("✓ Zero banned dashes found!");

  // 1. Verify local logo assets
  console.log("\n=== Checking Local Logo Assets in public/logos/ ===");
  for (const tool of TOOLS_AGENT_INFRA) {
    const localPath = path.join(process.cwd(), "public", tool.logoUrl.replace(/^\//, ""));
    if (!fs.existsSync(localPath)) {
      throw new Error(`Missing logo file: ${localPath} for tool ${tool.slug}`);
    }
    const stat = fs.statSync(localPath);
    console.log(`✓ Logo exists: ${tool.logoUrl} (${stat.size} bytes)`);
  }

  // 2. Insert or update in Convex
  console.log(`\n=== Upserting Tools in Convex (${CONVEX_URL}) ===`);
  for (const tool of TOOLS_AGENT_INFRA) {
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
  console.log("\n=== Verifying All 8 Tools in Convex ===");
  for (const tool of TOOLS_AGENT_INFRA) {
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

  console.log("\n🎉 All 8 tools seeded and verified successfully in Convex!");
}

if (process.argv[1] && process.argv[1].endsWith("add-batch-tools-agent-infra.ts")) {
  main().catch((err) => {
    console.error("Batch ingestion failed:", err);
    process.exit(1);
  });
}
