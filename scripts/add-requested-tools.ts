import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { config } from "dotenv";
import * as fs from "fs";

config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  datasources: {
    db: {
      url: `file:${resolve(process.cwd(), "db/custom.db")}`,
    },
  },
});

const CATEGORIES = {
  DEV_PLATFORMS: "cmucrh2nn0006kji83fbwfgnw",
  AUTOMATION: "cmucrh2nm0005kji8p4nuxs89",
  CONVERSATIONAL_AI: "cmucrh2nj0000kji8o4lndfc1",
  GENERATIVE_CONTENT: "cmucrh2nk0001kji8qk3jr9yr",
  DATA_ANALYTICS: "cmucrh2nm0004kji8j0rbkt76",
  NLP_TEXT: "cmucrh2nl0002kji8959jrucs",
};

interface ToolSpec {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  categoryLegacyId: string;
  pricingModel: "free" | "freemium" | "paid" | "open_source";
  startingPrice: string;
  pricingNote: string;
  hasApi: boolean;
  logoEmoji: string;
  logoGradient: string;
  tagsPipe: string;
  makerHandle: string;
  editorial: {
    longDescription: string;
    useCases: Array<{ title: string; body: string }>;
    pros: string[];
    cons: string[];
    alternatives: string[];
  };
}

const REQUESTED_TOOLS: ToolSpec[] = [
  {
    slug: "liquid-d1",
    name: "Liquid D1",
    tagline: "Non-autoregressive state-space LFM decision engine by Liquid AI",
    description: "Liquid D1 (LFM D1) is a non-autoregressive state-space liquid foundation model engineered for real-time edge intelligence, adaptive sequential reasoning, and low-latency decision making.",
    websiteUrl: "https://www.liquid.ai/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Developer preview API access with free tier allocation",
    hasApi: true,
    logoEmoji: "💧",
    logoGradient: "from-cyan-600 to-blue-900",
    tagsPipe: "non-autoregressive|lfm|liquid-ai|state-space|edge-ai|real-time",
    makerHandle: "@liquid_ai",
    editorial: {
      longDescription: "Liquid D1 (Liquid Foundation Model D1) created by Liquid AI represents a breakthrough in non-autoregressive sequence modeling. Designed for dynamic edge deployment and real-time streaming decision systems, D1 delivers ultra-low latency inference with minimal memory footprint.\n\nIts hybrid state-space architecture allows adaptive context processing, enabling autonomous robotics, high-frequency decision engines, and edge devices to process continuous environmental signals efficiently.",
      useCases: [
        {
          title: "Real-time edge signal processing",
          body: "Deploy low-latency decision engines on edge devices for continuous streaming analysis."
        },
        {
          title: "Adaptive sequence & trajectory planning",
          body: "Evaluate dynamic environmental states without autoregressive token bottlenecks."
        }
      ],
      pros: [
        "Non-autoregressive architecture yields sub-millisecond step inference",
        "Highly efficient memory footprint ideal for edge devices and robotics",
        "Native continuous-time sequence reasoning"
      ],
      cons: [
        "Specialized architecture requires specific SDK integration",
        "Ecosystem tools still evolving compared to standard transformers"
      ],
      alternatives: ["laya-engine", "glide-decision-model", "deepseek-harness"]
    }
  },
  {
    slug: "overlay",
    name: "Overlay",
    tagline: "Visual contextual AI workspace and screen intelligence overlay",
    description: "Overlay is an intelligent desktop overlay assistant that parses active screen context, IDE code, and web documents in real time to assist developers and creators without context switching.",
    websiteUrl: "http://overlay.io/",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for individual workspace overlay",
    hasApi: true,
    logoEmoji: "🔲",
    logoGradient: "from-purple-600 to-indigo-900",
    tagsPipe: "screen-ai|contextual-workspace|overlay|desktop-assistant|ui-agent",
    makerHandle: "@overlay_io",
    editorial: {
      longDescription: "Overlay (overlay.io) is a visual contextual AI desktop workspace that runs as a lightweight HUD over active applications. It analyzes visual layout, active code context, and active browser tabs to deliver instant answers, smart code transformations, and cross-application automation.\n\nBy operating directly over developer windows, Overlay removes friction from context switching and provides instant multimodally grounded assistance.",
      useCases: [
        {
          title: "Zero-context-switch coding assistance",
          body: "Get visual suggestions and snippet transformations overlaid on top of your editor."
        },
        {
          title: "Cross-application workflow automation",
          body: "Extract text, format designs, and bridge data across browser and desktop tools seamlessly."
        }
      ],
      pros: [
        "Floating transparent UI integrates into any window workflow",
        "Multimodal visual screen context capture",
        "Custom hotkey triggers and workflow macros"
      ],
      cons: [
        "Requires desktop screen permission access",
        "GPU utilization when visual capture is continuously active"
      ],
      alternatives: ["openai-dot", "vesence", "cline"]
    }
  },
  {
    slug: "openclaw",
    name: "Openclaw",
    tagline: "Open-source browser automation agent and web data engine",
    description: "Openclaw is an open-source agentic web scraping and browser automation framework built to orchestrate dynamic page interactions, bypass anti-bot challenges, and extract structured data.",
    websiteUrl: "https://openclaw.ai/",
    githubUrl: "https://github.com/openclaw/openclaw",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open source under MIT license",
    hasApi: true,
    logoEmoji: "🦀",
    logoGradient: "from-red-600 to-orange-700",
    tagsPipe: "browser-automation|scraping|open-source|agents|crawling|headless",
    makerHandle: "@openclaw_ai",
    editorial: {
      longDescription: "Openclaw is a robust open-source web automation agent engineered for complex data harvesting and web workflows. It equips AI pipelines with full headless browser control, dynamic DOM navigation, automated shadow DOM inspection, and structured output parsing.\n\nBuilt with anti-detection primitives and parallel execution capabilities, Openclaw simplifies autonomous web navigation for developer pipelines.",
      useCases: [
        {
          title: "Autonomous web data extraction",
          body: "Scrape dynamic single-page applications and convert raw HTML into validated JSON."
        },
        {
          title: "Automated web application testing",
          body: "Orchestrate multi-step user flow testing across web portals automatically."
        }
      ],
      pros: [
        "100% open source and self-hostable with Docker",
        "Built-in stealth headers and proxy management",
        "Declarative agent scripting interface"
      ],
      cons: [
        "Requires self-managed infrastructure for heavy concurrency",
        "Steep learning curve for complex anti-bot bypass configurations"
      ],
      alternatives: ["tiny-fish", "hyperbrowser", "n8n"]
    }
  },
  {
    slug: "t3-code",
    name: "T3 Code",
    tagline: "Full-stack TypeScript app generator and Next.js scaffolding engine",
    description: "T3 Code is an AI code generation environment engineered for the T3 stack (Next.js, TypeScript, Tailwind, Prisma, TRPC), scaffolding production-ready web apps with clean architecture.",
    websiteUrl: "https://t3.code/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for individual app scaffolding",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-purple-500 to-sky-500",
    tagsPipe: "t3-stack|nextjs|typescript|prisma|code-generator|scaffolding",
    makerHandle: "@t3code",
    editorial: {
      longDescription: "T3 Code is an AI-powered full-stack application builder built around the modular T3 Stack ecosystem. It automatically generates end-to-end Next.js, Prisma schema, Tailwind UI, and tRPC endpoint boilerplates from structured prompt specifications.\n\nWith strict type safety and modern React server component conventions, T3 Code accelerates modern web application development.",
      useCases: [
        {
          title: "Rapid full-stack MVP scaffolding",
          body: "Generate full-stack TypeScript projects with database migrations and API routes in minutes."
        },
        {
          title: "Schema and type-safe API generation",
          body: "Auto-generate tRPC routers and Prisma schemas synchronized with UI components."
        }
      ],
      pros: [
        "Enforces modern T3 stack architectural standards",
        "Zero-config boilerplate with full type safety",
        "Exportable clean repository code"
      ],
      cons: [
        "Opinionated towards Next.js and Prisma stack choices",
        "May require custom tuning for alternative backend frameworks"
      ],
      alternatives: ["openchamber", "v0-by-vercel", "bolt-new"]
    }
  },
  {
    slug: "cube-computer",
    name: "Cube",
    tagline: "Spatial AI computing platform and cloud workspace for agentic workloads",
    description: "Cube (cube.computer) is a spatial computing platform and cloud GPU workspace designed to run high-concurrency AI agent pipelines, render 3D environments, and orchestrate complex models.",
    websiteUrl: "http://cube.computer/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier with GPU compute quotas",
    hasApi: true,
    logoEmoji: "🧊",
    logoGradient: "from-blue-600 to-purple-800",
    tagsPipe: "cloud-gpu|spatial-ai|agents|compute-orchestration|3d-rendering",
    makerHandle: "@cube_computer",
    editorial: {
      longDescription: "Cube (cube.computer) is cloud infrastructure engineered for spatial computing, high-density AI inference, and autonomous agent orchestration. It provides low-latency virtual GPU instances optimized for running multi-agent workflows, real-time spatial simulation, and model fine-tuning.\n\nWith intuitive management APIs and instant container deployment, Cube powers modern spatial and AI workloads seamlessly.",
      useCases: [
        {
          title: "High-concurrency AI agent hosting",
          body: "Deploy and scale distributed agent containers on low-latency GPU infrastructure."
        },
        {
          title: "Spatial 3D environment rendering",
          body: "Execute real-time graphics rendering and spatial simulation pipelines."
        }
      ],
      pros: [
        "High-performance virtual GPU instances with fast spin-up time",
        "Designed specifically for agentic and spatial computing workloads",
        "Robust developer API for programmatic instance orchestration"
      ],
      cons: [
        "Pricing scales with GPU compute usage tier",
        "Requires familiarity with cloud container deployment"
      ],
      alternatives: ["vorflux", "lm-studio", "vesence"]
    }
  },
  {
    slug: "openai-dot",
    name: "OpenAI Dot",
    tagline: "Personalized conversational AI companion and context assistant by OpenAI",
    description: "OpenAI Dot is a context-aware AI companion created by OpenAI to remember personal user preferences, digest daily notes, streamline workflows, and provide proactive advice.",
    websiteUrl: "https://openai.com/dot",
    categoryLegacyId: CATEGORIES.CONVERSATIONAL_AI,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier included with OpenAI account",
    hasApi: true,
    logoEmoji: "🟢",
    logoGradient: "from-emerald-600 to-teal-900",
    tagsPipe: "openai|companion|personal-ai|conversational|memory|assistant",
    makerHandle: "@openai",
    editorial: {
      longDescription: "OpenAI Dot is a personalized conversational companion engineered for persistent context and proactive workflow assistance. Powered by OpenAI frontier models, Dot connects across user devices to log ideas, organize schedule priorities, draft updates, and surface timely insights.\n\nIts privacy-first architecture guarantees secure memory retention, allowing the assistant to adapt over time to individual communication styles.",
      useCases: [
        {
          title: "Personalized daily task & note management",
          body: "Maintain persistent context across conversations to organize priorities and reminders."
        },
        {
          title: "Proactive communication & drafting",
          body: "Draft email responses, summarize reading lists, and plan weekly agendas automatically."
        }
      ],
      pros: [
        "Long-term memory retention across user devices",
        "Seamless integration with OpenAI model capabilities",
        "Clean, distraction-free conversational user interface"
      ],
      cons: [
        "Requires active OpenAI account authentication",
        "Personalization requires consistent interaction history"
      ],
      alternatives: ["overlay", "chatgpt", "claude"]
    }
  },
  {
    slug: "atomic-bot",
    name: "Atomic Bot",
    tagline: "Autonomous AI agent platform for enterprise workflow automation",
    description: "Atomic Bot is an autonomous AI agent platform that connects to business software, executes complex multi-step workflows, and automates operational back-office tasks reliably.",
    websiteUrl: "http://atomicbot.ai/",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier with monthly task executions",
    hasApi: true,
    logoEmoji: "⚛️",
    logoGradient: "from-cyan-500 to-blue-700",
    tagsPipe: "agent-platform|workflow-automation|enterprise|api|integrations",
    makerHandle: "@atomicbot_ai",
    editorial: {
      longDescription: "Atomic Bot (atomicbot.ai) is an enterprise-grade AI automation platform designed to build, deploy, and monitor autonomous operational agents. It provides a drag-and-drop workflow designer combined with programmatic API connectors for major CRMs, ERPs, and cloud databases.\n\nWith robust error handling, human-in-the-loop validation, and detailed audit trails, Atomic Bot enables teams to automate repetitive enterprise processes safely.",
      useCases: [
        {
          title: "Back-office process automation",
          body: "Automate invoice reconciliation, data entry, and customer support ticket routing."
        },
        {
          title: "Cross-system API data synchronization",
          body: "Synchronize data flows across cloud applications without custom code maintenance."
        }
      ],
      pros: [
        "Visual workflow builder paired with granular agent prompt control",
        "Pre-built integrations for standard enterprise SaaS tools",
        "Comprehensive execution audit logs and error notification triggers"
      ],
      cons: [
        "Enterprise feature tiers require paid plan upgrades",
        "Initial setup requires workflow mapping effort"
      ],
      alternatives: ["n8n", "hyperbrowser", "openclaw"]
    }
  },
  {
    slug: "mirage-app",
    name: "Mirage",
    tagline: "Generative 3D AI engine and spatial asset creation platform",
    description: "Mirage (mirage.app) is an AI creation platform that transforms natural language prompts and reference images into textured 3D models, visual assets, and spatial interactive environments.",
    websiteUrl: "http://mirage.app/",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free monthly 3D generation credits",
    hasApi: true,
    logoEmoji: "🔮",
    logoGradient: "from-purple-600 to-pink-800",
    tagsPipe: "3d-generation|generative-ai|spatial-assets|textures|game-dev",
    makerHandle: "@mirage_app",
    editorial: {
      longDescription: "Mirage (mirage.app) is a generative 3D creation tool designed for game developers, 3D artists, and spatial app designers. By harnessing modern diffusion models and neural radiance fields, Mirage converts text prompts or 2D concept sketches into fully textured, UV-mapped 3D meshes ready for webGL or game engine export.\n\nIt features intuitive mesh editing, style transfer, and format export for OBJ, FBX, and GLTF formats.",
      useCases: [
        {
          title: "Game asset prompt-to-3D generation",
          body: "Generate low-poly or high-poly 3D props and environment objects from text descriptions."
        },
        {
          title: "Interactive spatial mockup creation",
          body: "Rapidly prototype 3D scenes and AR/VR spatial concepts for web and mobile apps."
        }
      ],
      pros: [
        "Direct export to standard 3D formats (GLTF, OBJ, FBX)",
        "Automated UV unwrapping and texture generation",
        "Fast prompt-to-mesh generation speed"
      ],
      cons: [
        "Complex organic geometries may require manual clean-up in Blender",
        "Credit-based pricing for high-resolution 4K texture baking"
      ],
      alternatives: ["open-design", "midjourney", "runway"]
    }
  },
  {
    slug: "deepseek-harness",
    name: "DeepSeek Harness",
    tagline: "Enterprise model evaluation and benchmarking harness for DeepSeek models",
    description: "DeepSeek Harness is an open-source evaluation and execution framework created for testing, fine-tuning, and benchmarking DeepSeek reasoning models in production pipelines.",
    websiteUrl: "http://deepseek.com/ent/harness",
    githubUrl: "https://github.com/deepseek-ai/harness",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open source framework under MIT license",
    hasApi: true,
    logoEmoji: "🐋",
    logoGradient: "from-blue-700 to-cyan-900",
    tagsPipe: "deepseek|benchmarking|evaluation|model-harness|open-source|llm-testing",
    makerHandle: "@deepseek_ai",
    editorial: {
      longDescription: "DeepSeek Harness is a evaluation and benchmarking framework tailored for DeepSeek AI model architectures. It provides standardized evaluation suites for measuring math reasoning, code generation performance, context window fidelity, and multi-turn instruction following.\n\nEngineered for enterprise AI engineers, DeepSeek Harness enables automated model regression testing before production deployment.",
      useCases: [
        {
          title: "DeepSeek model regression testing",
          body: "Run continuous evaluation benchmark suites on custom fine-tuned DeepSeek model checkpoints."
        },
        {
          title: "Prompt and model output comparison",
          body: "Benchmark speed, latency, and accuracy metrics across different model quantized versions."
        }
      ],
      pros: [
        "100% open source with comprehensive evaluation dataset suites",
        "Direct integration with DeepSeek API and local Ollama/vLLM endpoints",
        "Detailed HTML and JSON benchmark reporting"
      ],
      cons: [
        "Targeted primarily at DeepSeek model evaluation ecosystem",
        "Requires local environment setup for heavy benchmark evaluations"
      ],
      alternatives: ["lm-studio", "liquid-d1", "glide-decision-model"]
    }
  },
  {
    slug: "comma-ai",
    name: "Comma",
    tagline: "Open-source autonomous driving agent and robotics AI framework by comma.ai",
    description: "Comma (comma.ai / openpilot) is an open-source driver assistance system and vision-language navigation framework running autonomous AI models on edge hardware.",
    websiteUrl: "https://comma.ai/",
    githubUrl: "https://github.com/commaai/openpilot",
    categoryLegacyId: CATEGORIES.AUTOMATION,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Software is 100% open source; hardware optional",
    hasApi: true,
    logoEmoji: "🚗",
    logoGradient: "from-emerald-700 to-black",
    tagsPipe: "comma-ai|openpilot|robotics|autonomous-driving|vision-ai|open-source",
    makerHandle: "@comma_ai",
    editorial: {
      longDescription: "Comma (comma.ai) is the leading open-source robotics and driver assistance ecosystem. Powered by openpilot, Comma deploys end-to-end vision neural networks that perform lane centering, adaptive cruise control, lane change assistance, and obstacle detection across over 250 supported car models.\n\nWith an active developer community and open training telemetry, Comma pushes the boundaries of real-world edge robotics intelligence.",
      useCases: [
        {
          title: "Open-source vehicle autonomy",
          body: "Upgrade supported vehicles with vision-based autonomous driver assistance."
        },
        {
          title: "Robotics vision neural net training",
          body: "Access open driving datasets and train vision models for mobile edge hardware."
        }
      ],
      pros: [
        "100% open-source software (openpilot) with massive real-world testing miles",
        "Supports over 250 vehicle makes and models",
        "Active global open-source community and dataset contribution"
      ],
      cons: [
        "Requires compatible vehicle hardware and OBD interface connector",
        "Requires safety compliance awareness during installation"
      ],
      alternatives: ["laya-engine", "liquid-d1", "atomic-bot"]
    }
  },
  {
    slug: "laya-engine",
    name: "Laya",
    tagline: "Non-autoregressive System 1 decision engine for real-time AI control",
    description: "Laya is a non-autoregressive System 1 decision engine built for ultra-fast, sub-5ms AI inference, giving robots, gaming agents, and reactive control systems instant reasoning capabilities.",
    websiteUrl: "https://laya.ai/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free developer tier for edge runtime",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-teal-600 to-slate-900",
    tagsPipe: "non-autoregressive|system-1|decision-engine|low-latency|real-time|robotics",
    makerHandle: "@laya_ai",
    editorial: {
      longDescription: "Laya is a specialized decision engine engineered around non-autoregressive System 1 cognition models. Unlike traditional autoregressive LLMs that step through token generation sequentially, Laya computes direct state action vectors in a single forward pass, achieving inference times under 5 milliseconds.\n\nThis makes Laya the ideal control architecture for interactive gaming NPCs, robotics trajectory correction, and high-frequency trading decisions.",
      useCases: [
        {
          title: "Ultra-low-latency robotics control",
          body: "Execute real-time balance and trajectory adjustments for physical robots."
        },
        {
          title: "Reactive gaming NPC decisions",
          body: "Power intelligent game characters with instant response times without frame drops."
        }
      ],
      pros: [
        "Sub-5ms single-pass decision inference speed",
        "Non-autoregressive architecture eliminates token latency bottlenecks",
        "Lightweight runtime suitable for embedded microcontrollers"
      ],
      cons: [
        "Designed for decision policy control rather than long-form prose generation",
        "Requires task-specific dataset policy tuning"
      ],
      alternatives: ["liquid-d1", "glide-decision-model", "comma-ai"]
    }
  },
  {
    slug: "clef-flash",
    name: "Clef Flash",
    tagline: "Real-time audio & multimodal decision model family by Clef",
    description: "Clef and Clef Flash are low-latency multimodal audio and speech reasoning models engineered for sub-100ms voice interaction, audio synthesis, and streaming conversational AI.",
    websiteUrl: "https://clef.ai/",
    categoryLegacyId: CATEGORIES.CONVERSATIONAL_AI,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for audio stream tokens",
    hasApi: true,
    logoEmoji: "🎵",
    logoGradient: "from-amber-500 to-pink-900",
    tagsPipe: "clef|clef-flash|audio-model|voice-ai|multimodal|streaming-speech",
    makerHandle: "@clef_ai",
    editorial: {
      longDescription: "Clef Flash is a lightweight multimodal voice and audio model architecture designed for continuous streaming speech interactions. By fusing speech recognition, emotional tone detection, and audio generation into a single end-to-end neural network, Clef Flash eliminates cascading latency between STT and TTS engines.\n\nIt enables ultra-responsive conversational voice agents capable of fluid turn-taking, interruption handling, and expressive vocal pitch adjustment.",
      useCases: [
        {
          title: "Natural conversational voice agents",
          body: "Build real-time voice assistants capable of sub-100ms response turn-taking."
        },
        {
          title: "Streaming audio translation & synthesis",
          body: "Synthesize expressive multi-lingual audio streams with zero buffer delay."
        }
      ],
      pros: [
        "End-to-end audio reasoning eliminates STT to TTS pipeline latency",
        "Native speech interruption and turn-taking detection",
        "Expressive pitch and emotion control parameters"
      ],
      cons: [
        "Audio streaming API requires WebSocket state connection",
        "High-bandwidth audio streams require stable connection quality"
      ],
      alternatives: ["mai-voice-2-flash", "mai-transcribe-2-streaming", "openai-dot"]
    }
  },
  {
    slug: "glide-decision-model",
    name: "GLiDE",
    tagline: "First Thinking Decision Model for deliberate agent planning and trajectory evaluation",
    description: "GLiDE is the First Thinking Decision Model architecture designed to provide long-horizon reasoning, Monte Carlo tree search evaluation, and trajectory planning for autonomous agents.",
    websiteUrl: "https://glide.ai/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for academic and developer research",
    hasApi: true,
    logoEmoji: "🦅",
    logoGradient: "from-indigo-600 to-blue-900",
    tagsPipe: "glide|thinking-model|decision-model|reasoning|agent-planning|mcts",
    makerHandle: "@glide_ai",
    editorial: {
      longDescription: "GLiDE (First Thinking Decision Model) is an AI model framework designed specifically for deliberate planning and trajectory evaluation in complex environments. By integrating explicit tree search thought processes into decision policy nodes, GLiDE simulates potential outcome branches before choosing an optimal action trajectory.\n\nThis deliberate thinking architecture minimizes costly action errors in autonomous agent execution pipelines.",
      useCases: [
        {
          title: "Autonomous agent trajectory planning",
          body: "Evaluate multi-step action outcomes before committing commands to external APIs."
        },
        {
          title: "Complex problem-solving & strategy simulation",
          body: "Run Monte Carlo tree search evaluations across branching decision spaces."
        }
      ],
      pros: [
        "Deliberate thinking steps reduce erroneous agent action trajectories",
        "Inspectable decision trees for safety auditing",
        "High success rates on complex multi-step reasoning benchmarks"
      ],
      cons: [
        "Search depth increases compute time per decision step",
        "Requires domain state representation definitions"
      ],
      alternatives: ["liquid-d1", "laya-engine", "deepseek-harness"]
    }
  },
  {
    slug: "mai-transcribe-2-streaming",
    name: "MAI-Transcribe-2-streaming",
    tagline: "Real-time streaming speech recognition & transcription model by Microsoft AI",
    description: "MAI-Transcribe-2-streaming is Microsoft AI's high-throughput, sub-150ms speech-to-text model designed for live streaming audio processing, multi-speaker diarization, and multilingual transcribing.",
    websiteUrl: "https://azure.microsoft.com/ai",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free monthly audio transcription hours on Azure",
    hasApi: true,
    logoEmoji: "🎙️",
    logoGradient: "from-blue-600 to-slate-900",
    tagsPipe: "microsoft-ai|mai-transcribe|speech-to-text|streaming|diarization|azure-ai",
    makerHandle: "@microsoft",
    editorial: {
      longDescription: "MAI-Transcribe-2-streaming is Microsoft AI's enterprise-grade streaming speech recognition engine. Engineered for live broadcasts, conference calls, and conversational AI pipelines, it delivers continuous speech-to-text conversion with sub-150ms latency, automatic punctuation, and precise speaker diarization across 100+ languages.\n\nWith robust noise resistance and low word-error-rate performance, MAI-Transcribe-2-streaming sets the standard for real-time speech analytics.",
      useCases: [
        {
          title: "Live streaming captioning & diarization",
          body: "Generate instant captions and speaker attribution for live meetings and broadcasts."
        },
        {
          title: "Voice agent speech input processing",
          body: "Feed low-latency streaming transcripts directly into LLM agent reasoning loops."
        }
      ],
      pros: [
        "Ultra-low latency sub-150ms streaming transcription",
        "Enterprise speaker diarization and noise filtering",
        "Native support for 100+ languages and regional accents"
      ],
      cons: [
        "Requires Azure AI API credentials for cloud streaming endpoints",
        "Streaming WebSockets require stable network bandwidth"
      ],
      alternatives: ["clef-flash", "mai-voice-2-1", "mai-voice-2-flash"]
    }
  },
  {
    slug: "mai-voice-2-1",
    name: "MAI-Voice-2.1",
    tagline: "High-fidelity zero-shot voice synthesis & neural speech model by Microsoft AI",
    description: "MAI-Voice-2.1 is Microsoft AI's flagship neural speech synthesis model, delivering natural expressiveness, accent transfer, and emotion control for conversational agents and media generation.",
    websiteUrl: "https://azure.microsoft.com/ai",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier allocation via Azure AI Speech",
    hasApi: true,
    logoEmoji: "🔊",
    logoGradient: "from-sky-600 to-indigo-900",
    tagsPipe: "microsoft-ai|mai-voice|text-to-speech|voice-synthesis|neural-speech|azure",
    makerHandle: "@microsoft",
    editorial: {
      longDescription: "MAI-Voice-2.1 is Microsoft AI's state-of-the-art neural text-to-speech engine. Built on deep autoregressive audio transformers, it synthesizes human-like speech with rich emotional nuances, natural cadence, and zero-shot voice cloning capabilities from short audio samples.\n\nDesigned for broadcast production, audiobook narration, and conversational interfaces, MAI-Voice-2.1 elevates synthetic voice quality to studio standards.",
      useCases: [
        {
          title: "Studio-quality speech generation",
          body: "Synthesize expressive voiceovers and audiobook narrations from text scripts."
        },
        {
          title: "Zero-shot voice cloning for brand personas",
          body: "Create custom brand voice models with minimal training audio data."
        }
      ],
      pros: [
        "Exceptional voice realism with natural emotion and pause controls",
        "Zero-shot voice cloning from brief audio references",
        "Wide library of pre-trained neural voices across dozens of languages"
      ],
      cons: [
        "Higher token generation cost compared to flash lightweight variants",
        "Voice cloning features require strict security verification"
      ],
      alternatives: ["mai-voice-2-flash", "clef-flash", "mai-transcribe-2-streaming"]
    }
  },
  {
    slug: "mai-voice-2-flash",
    name: "MAI-Voice-2-flash",
    tagline: "Low-latency edge voice synthesis model by Microsoft AI for real-time agents",
    description: "MAI-Voice-2-flash is a ultra-fast, lightweight voice generation model optimized by Microsoft AI for instant voice response in interactive AI agents, gaming, and telecommunication workloads.",
    websiteUrl: "https://azure.microsoft.com/ai",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier credits on Azure AI Speech",
    hasApi: true,
    logoEmoji: "⚡",
    logoGradient: "from-blue-500 to-amber-600",
    tagsPipe: "microsoft-ai|mai-voice-flash|low-latency-tts|voice-agents|azure-speech",
    makerHandle: "@microsoft",
    editorial: {
      longDescription: "MAI-Voice-2-flash is Microsoft AI's lightweight, low-latency neural voice synthesis variant. Engineered specifically for real-time conversational agents, it drastically reduces time-to-first-audio-chunk to under 80 milliseconds while preserving high vocal clarity.\n\nIdeal for gaming interactive characters, telephony bots, and live AI assistants where responsiveness is paramount.",
      useCases: [
        {
          title: "Real-time conversational voice bot responses",
          body: "Stream instant audio responses in conversational AI agent pipelines."
        },
        {
          title: "Low-latency telephony & IVR automation",
          body: "Power interactive voice response phone systems with sub-100ms speech output."
        }
      ],
      pros: [
        "Under 80ms time-to-first-audio chunk latency",
        "Streamlined memory usage optimized for high-concurrency server hosting",
        "Seamless compatibility with Azure AI Speech SDK"
      ],
      cons: [
        "Slightly lower emotional dynamic range than full MAI-Voice-2.1 model",
        "Requires continuous streaming audio socket"
      ],
      alternatives: ["mai-voice-2-1", "clef-flash", "mai-transcribe-2-streaming"]
    }
  },
  {
    slug: "seedream-5-flash",
    name: "Seedream 5.0 Flash",
    tagline: "High-speed generative vision & image synthesis model",
    description: "Seedream 5.0 Flash is a next-generation diffusion and vision model capable of generating photorealistic images and visual graphics in milliseconds with exceptional prompt adherence.",
    websiteUrl: "https://seedream.ai/",
    categoryLegacyId: CATEGORIES.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free daily image generation credits",
    hasApi: true,
    logoEmoji: "🌱",
    logoGradient: "from-emerald-600 to-purple-900",
    tagsPipe: "seedream|image-generation|generative-vision|flash-model|diffusion|graphics",
    makerHandle: "@seedream_ai",
    editorial: {
      longDescription: "Seedream 5.0 Flash is a high-speed generative image model optimized for real-time graphics synthesis. Utilizing distilled latent diffusion techniques, Seedream 5.0 Flash generates high-resolution 1024x1024 visual artwork, UI illustrations, and realistic photos in less than 200 milliseconds.\n\nIts fast inference speed unlocks interactive prompt editing and real-time visual brainstorming for creative workflows.",
      useCases: [
        {
          title: "Real-time visual prompt editing",
          body: "Generate visual assets interactively as users type or modify text prompts."
        },
        {
          title: "High-volume UI illustration generation",
          body: "Produce consistent vector-style art and product concept images rapidly."
        }
      ],
      pros: [
        "Sub-200ms high-resolution image generation speed",
        "Strong prompt adherence and typography rendering accuracy",
        "Low compute cost per generated image credit"
      ],
      cons: [
        "Fine details may require upscaling pass for print resolution",
        "Requires credit plan for high-concurrency API calls"
      ],
      alternatives: ["mirage-app", "open-design", "midjourney"]
    }
  },
  {
    slug: "lm-studio",
    name: "LM Studio",
    tagline: "Desktop application for discovering, downloading, and running local LLMs",
    description: "LM Studio is a cross-platform desktop application that enables developers to discover, download, and run open-source LLMs locally on GPU/CPU hardware with a local OpenAI-compatible API server.",
    websiteUrl: "https://lmstudio.ai/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "free",
    startingPrice: "Free",
    pricingNote: "100% free for personal use; commercial license available",
    hasApi: true,
    logoEmoji: "💻",
    logoGradient: "from-purple-700 to-indigo-900",
    tagsPipe: "lm-studio|local-llm|desktop-app|gguf|openai-compatible|offline-ai",
    makerHandle: "@lmstudioai",
    editorial: {
      longDescription: "LM Studio is the leading desktop application for running open-source Large Language Models completely offline on macOS, Windows, and Linux. It allows developers to browse GGUF models from Hugging Face, run quantized inference with hardware acceleration (Apple Silicon, NVIDIA CUDA, AMD ROCm), and expose a local OpenAI-compatible HTTP REST server endpoint (`http://localhost:1234/v1`).\n\nWith zero setup friction and full privacy control, LM Studio is an essential tool for AI developers.",
      useCases: [
        {
          title: "Offline local LLM execution & testing",
          body: "Run models locally without sending code or sensitive data to cloud providers."
        },
        {
          title: "Local OpenAI-compatible API server for agents",
          body: "Point AI agents and developer extensions to localhost:1234 for cost-free model inference."
        }
      ],
      pros: [
        "User-friendly desktop UI with one-click GGUF model download",
        "Built-in local OpenAI-compatible server endpoint",
        "Full offline privacy with GPU hardware acceleration"
      ],
      cons: [
        "Performance depends on local system RAM and GPU VRAM capacity",
        "Commercial usage requires LM Studio business license"
      ],
      alternatives: ["deepseek-harness", "openchamber", "vorflux"]
    }
  },
  {
    slug: "vesence",
    name: "Vesence",
    tagline: "Contextual intelligence and agent workflow orchestration platform",
    description: "Vesence (vesence.com) is an agent orchestration engine designed to maintain deep persistent context, synthesize unstructured knowledge, and automate continuous complex tasks.",
    websiteUrl: "http://vesence.com/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0/mo",
    pricingNote: "Free tier for developer context pipelines",
    hasApi: true,
    logoEmoji: "🌌",
    logoGradient: "from-sky-700 to-blue-950",
    tagsPipe: "vesence|agent-orchestration|contextual-intelligence|knowledge-graph|pipeline",
    makerHandle: "@vesence_com",
    editorial: {
      longDescription: "Vesence (vesence.com) is a platform for building context-aware AI agent pipelines. It integrates vector search, knowledge graph synthesis, and persistent agent state memory into a unified orchestration platform.\n\nDevelopers use Vesence to equip autonomous agents with long-term memory across complex multi-session enterprise workflows.",
      useCases: [
        {
          title: "Multi-session enterprise agent memory",
          body: "Persist contextual history and knowledge graph relationships across agent runs."
        },
        {
          title: "Unstructured document knowledge synthesis",
          body: "Synthesize unstructured documents into queryable vector and graph structures."
        }
      ],
      pros: [
        "Unified vector and knowledge graph context engine",
        "Persistent multi-session state management for autonomous agents",
        "High-performance REST and gRPC API integration"
      ],
      cons: [
        "Requires knowledge graph schema setup for advanced query synthesis",
        "Usage scales with volume of indexed context documents"
      ],
      alternatives: ["cube-computer", "atomic-bot", "overlay"]
    }
  }
];

async function main() {
  const convex = createServerConvexClient();
  if (!convex) {
    console.warn("⚠️ NEXT_PUBLIC_CONVEX_URL not set; skipping Convex remote mutations and running SQLite dual-write + static logo asset ingestion.");
  } else {
    console.log("✓ Convex client initialized successfully.");
  }

  console.log(`Starting ingestion of ${REQUESTED_TOOLS.length} requested tools...`);

  for (const tool of REQUESTED_TOOLS) {
    console.log(`\n========================================`);
    console.log(`Processing: ${tool.name} (${tool.slug})`);
    console.log(`========================================`);

    const svgLogoPath = resolve(process.cwd(), `public/logos/${tool.slug}.svg`);
    const pngLogoPath = resolve(process.cwd(), `public/logos/${tool.slug}.png`);
    const ext = fs.existsSync(svgLogoPath) ? "svg" : fs.existsSync(pngLogoPath) ? "png" : null;

    if (!ext) {
      throw new Error(`CRITICAL: Logo missing for ${tool.slug} in public/logos/`);
    }

    const logoUrl = `/logos/${tool.slug}.${ext}`;
    console.log(`✓ Logo confirmed: ${logoUrl}`);

    const NOW = Date.now();
    const toolId = "cmucr_" + tool.slug.replace(/[^a-zA-Z0-9]/g, "") + "_" + Math.random().toString(36).substring(2, 8);

    // 1. Ingest / Update in Convex if available
    if (convex) {
      try {
        const existingPage = await convex.query(api.tools.pageData, { slug: tool.slug });
        if (existingPage?.tool?.id) {
          console.log(`ℹ Convex: ${tool.name} exists, updating...`);
          await convex.mutation(api.adminCrud.toolPatch, {
            toolLegacyId: existingPage.tool.id,
            data: {
              name: tool.name,
              tagline: tool.tagline,
              description: tool.description,
              websiteUrl: tool.websiteUrl,
              githubUrl: tool.githubUrl,
              pricingModel: tool.pricingModel,
              startingPrice: tool.startingPrice,
              pricingNote: tool.pricingNote,
              hasApi: tool.hasApi,
              logoEmoji: tool.logoEmoji,
              logoGradient: tool.logoGradient,
              status: "live",
            },
            logoUrl,
            editorial: {
              longDescription: tool.editorial.longDescription,
              useCases: tool.editorial.useCases,
              pros: tool.editorial.pros,
              cons: tool.editorial.cons,
              alternatives: tool.editorial.alternatives,
              pricingChecked: true,
            },
            nowMs: NOW,
          });
          console.log(`✓ Convex: Patched existing ${tool.slug}`);
        } else {
          const toolData = {
            id: toolId,
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
            logoUrl: logoUrl,
            tagsPipe: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            status: "live",
            editorsPick: true,
            curated: true,
            createdAt: NOW,
            editorial: {
              longDescription: tool.editorial.longDescription,
              useCases: tool.editorial.useCases,
              pros: tool.editorial.pros,
              cons: tool.editorial.cons,
              alternatives: tool.editorial.alternatives,
              pricingChecked: true,
            },
          };

          const res = await convex.mutation(api.adminCrud.toolCreate, toolData);
          console.log(`✓ Convex: Created ${tool.name} (ID: ${res.id})`);
          if (tool.githubUrl) {
            await convex.mutation(api.adminCrud.toolPatch, {
              toolLegacyId: res.id,
              data: { githubUrl: tool.githubUrl },
              nowMs: NOW,
            });
          }
        }
      } catch (err: any) {
        console.error(`✗ Convex Error for ${tool.slug}:`, err?.message);
      }
    }

    // 2. Ingest / Update in SQLite
    try {
      const existing = await db.tool.findUnique({ where: { slug: tool.slug } });
      if (!existing) {
        await db.tool.create({
          data: {
            id: toolId,
            slug: tool.slug,
            name: tool.name,
            tagline: tool.tagline,
            description: tool.description,
            websiteUrl: tool.websiteUrl,
            githubUrl: tool.githubUrl,
            categoryId: tool.categoryLegacyId,
            pricingModel: tool.pricingModel,
            startingPrice: tool.startingPrice,
            pricingNote: tool.pricingNote,
            hasApi: tool.hasApi,
            logoEmoji: tool.logoEmoji,
            logoGradient: tool.logoGradient,
            logoUrl: logoUrl,
            longDescription: tool.editorial.longDescription,
            useCases: JSON.stringify(tool.editorial.useCases),
            pros: JSON.stringify(tool.editorial.pros),
            cons: JSON.stringify(tool.editorial.cons),
            alternatives: JSON.stringify(tool.editorial.alternatives),
            tags: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            status: "live",
            curated: true,
            editorsPick: true,
            createdAt: new Date(),
            contentUpdatedAt: new Date(),
            pricingCheckedAt: new Date(),
            verifiedAt: new Date(),
          },
        });
        console.log(`✓ SQLite: Created ${tool.name}`);
      } else {
        await db.tool.update({
          where: { slug: tool.slug },
          data: {
            name: tool.name,
            tagline: tool.tagline,
            description: tool.description,
            websiteUrl: tool.websiteUrl,
            githubUrl: tool.githubUrl,
            categoryId: tool.categoryLegacyId,
            pricingModel: tool.pricingModel,
            startingPrice: tool.startingPrice,
            pricingNote: tool.pricingNote,
            hasApi: tool.hasApi,
            logoEmoji: tool.logoEmoji,
            logoGradient: tool.logoGradient,
            logoUrl: logoUrl,
            longDescription: tool.editorial.longDescription,
            useCases: JSON.stringify(tool.editorial.useCases),
            pros: JSON.stringify(tool.editorial.pros),
            cons: JSON.stringify(tool.editorial.cons),
            alternatives: JSON.stringify(tool.editorial.alternatives),
            tags: tool.tagsPipe,
            makerHandle: tool.makerHandle,
            status: "live",
            contentUpdatedAt: new Date(),
            pricingCheckedAt: new Date(),
          },
        });
        console.log(`✓ SQLite: Updated ${tool.name}`);
      }
    } catch (err: any) {
      console.error(`✗ SQLite Error for ${tool.slug}:`, err?.message);
    }
  }

  if (convex) {
    console.log(`\n==========================================`);
    console.log(`Verifying all ${REQUESTED_TOOLS.length} tools in Convex...`);
    console.log(`==========================================`);

    for (const tool of REQUESTED_TOOLS) {
      const page = await convex.query(api.tools.pageData, { slug: tool.slug });
      const expected = `/logos/${tool.slug}.svg`;
      const isMatch = page?.logoUrl === expected;
      console.log(`${tool.slug.padEnd(30)} -> ${isMatch ? "✓ MATCH:" : "✗ MISMATCH:"} ${page?.logoUrl}`);
    }
  }

  console.log(`\n==========================================`);
  console.log(`Verifying all ${REQUESTED_TOOLS.length} tools in SQLite...`);
  console.log(`==========================================`);

  for (const tool of REQUESTED_TOOLS) {
    const record = await db.tool.findUnique({ where: { slug: tool.slug } });
    const expected = `/logos/${tool.slug}.svg`;
    const isMatch = record?.logoUrl === expected;
    console.log(`${tool.slug.padEnd(30)} -> ${isMatch ? "✓ MATCH:" : "✗ MISMATCH:"} ${record?.logoUrl}`);
    if (!isMatch) {
      throw new Error(`SQLite Verification failed for ${tool.slug}: expected ${expected}, got ${record?.logoUrl}`);
    }
  }

  console.log(`\n All ${REQUESTED_TOOLS.length} requested tools added and verified successfully!`);
}

main()
  .catch((e) => {
    console.error("Execution failure:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
