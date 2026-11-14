/**
 * Batch 8 Ingestion: 10 Major High-Impact AI Tools
 * 1. LangGraph (langgraph) - dev-platforms
 * 2. Luma AI (luma-ai) - generative-content
 * 3. Ideogram (ideogram) - generative-content
 * 4. CopilotKit (copilotkit) - dev-platforms
 * 5. Recraft (recraft) - generative-content
 * 6. Replit (replit) - dev-platforms
 * 7. Baseten (baseten) - dev-platforms
 * 8. Coze (coze) - automation
 * 9. Fish Audio (fish-audio) - generative-content
 * 10. Anyscale (anyscale) - dev-platforms
 */

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

export const TOOLS_BATCH_8 = [
  // 1. LangGraph
  {
    id: "cmucrh2batch8langgraph0001",
    slug: "langgraph",
    name: "LangGraph",
    tagline: "Cyclical graph framework for stateful multi-agent AI systems",
    description: "LangGraph is a library for building stateful, multi-actor applications with LLMs, enabling loops, branching, human in the loop workflows, and persistent memory.",
    websiteUrl: "https://langchain-ai.github.io/langgraph",
    logoEmoji: "🕸️",
    logoGradient: "from-emerald-500 via-teal-600 to-cyan-600",
    logoUrl: "/logos/langgraph.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Completely open source under MIT license; commercial LangGraph Cloud deployment available through LangSmith.",
    hasApi: true,
    docsUrl: "https://langchain-ai.github.io/langgraph/reference",
    tagsPipe: "multi-agent|langchain|state-machine|agent-framework|python",
    editorsPick: true,
    curated: true,
    makerHandle: "langchain",
    status: "live",
    editorial: {
      longDescription: "LangGraph extends LangChain by introducing a first-class graph execution model where nodes represent functions and edges represent state transitions. Unlike basic DAG architectures that run strictly sequentially, LangGraph natively supports cyclical graphs, allowing autonomous agents to loop over reflection, tool execution, and user feedback until complex objectives are completed.",
      useCases: [
        "Orchestrating multi-agent systems with specialized specialist roles and group debates",
        "Adding human in the loop confirmation checkpoints for sensitive API tool executions",
        "Implementing iterative code review and test-fix loops that continue until tests pass"
      ],
      pros: [
        "Built-in persistent state persistence across multiple conversation turns",
        "Native support for cyclic loops, error retries, and conditional branching",
        "Deep interoperability with the entire LangChain ecosystem of tools and integrations"
      ],
      cons: [
        "Graph architectural paradigm requires a steeper learning curve than simple linear chains",
        "Managing large state objects in complex graphs can introduce debugging overhead"
      ]
    }
  },

  // 2. Luma AI
  {
    id: "cmucrh2batch8luma000000002",
    slug: "luma-ai",
    name: "Luma AI",
    tagline: "High-definition video generation and 3D neural rendering",
    description: "Luma AI builds generative media models including Dream Machine, an ultra-realistic video synthesis engine that simulates physical motion, lighting, and camera dynamics.",
    websiteUrl: "https://lumalabs.ai",
    logoEmoji: "🎥",
    logoGradient: "from-violet-600 via-indigo-600 to-blue-600",
    logoUrl: "/logos/luma-ai.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$9.99/month",
    pricingNote: "Free tier offers 30 video generations per month; Standard plan starts at $9.99/month.",
    hasApi: true,
    docsUrl: "https://lumalabs.ai/dream-machine/api",
    tagsPipe: "ai-video|generative-media|dream-machine|3d-capture|vfx",
    editorsPick: true,
    curated: true,
    makerHandle: "luma",
    status: "live",
    editorial: {
      longDescription: "Luma AI pioneers photorealistic generative video and interactive 3D reconstruction. Its flagship Dream Machine model produces high-frame-rate video sequences from text descriptions and reference images with coherent spatial tracking, fluid character movements, and natural lighting interactions, serving creative studios, filmmakers, and digital artists.",
      useCases: [
        "Generating cinematic video b-roll and motion concepts from text prompts",
        "Animating static product photographs into dynamic promotional videos",
        "Creating interactive 3D NeRF captures for virtual tours and e-commerce displays"
      ],
      pros: [
        "Remarkable physical world consistency and dynamic camera motion handling",
        "Fast generation turnaround compared to traditional 3D rendering pipelines",
        "Robust developer API for programmatic bulk video generation"
      ],
      cons: [
        "Complex multi-character interactions can occasionally show minor temporal artifacts",
        "High-volume commercial rendering requires higher tier subscriptions"
      ]
    }
  },

  // 3. Ideogram
  {
    id: "cmucrh2batch8ideogram0003",
    slug: "ideogram",
    name: "Ideogram",
    tagline: "Generative image creation with accurate typography and design",
    description: "Ideogram is an advanced generative image platform famous for reliable text rendering, graphic design composition, and artistic typography inside visual illustrations.",
    websiteUrl: "https://ideogram.ai",
    logoEmoji: "🎨",
    logoGradient: "from-rose-500 via-orange-500 to-amber-500",
    logoUrl: "/logos/ideogram.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$8/month",
    pricingNote: "Free tier with daily slow generation credits; Basic plan starts at $8/month.",
    hasApi: true,
    docsUrl: "https://docs.ideogram.ai",
    tagsPipe: "image-gen|typography|graphic-design|branding|logos",
    editorsPick: false,
    curated: true,
    makerHandle: "ideogram",
    status: "live",
    editorial: {
      longDescription: "Ideogram solved one of generative AI's most stubborn challenges: rendering crisp, legible, and accurately spelled text inside synthetic images. Built by deep learning researchers from Google Brain, Ideogram excels at creating posters, logos, merchandise graphics, and editorial covers where typography and visual art must harmonize perfectly.",
      useCases: [
        "Designing typographic logos, t-shirt prints, and branded promotional graphics",
        "Generating event posters and social media banners with exact textual titles",
        "Creating stylized editorial illustrations featuring narrative headline elements"
      ],
      pros: [
        "Unrivaled text and lettering spelling accuracy inside synthetic imagery",
        "Integrated Magic Prompt feature that enriches short prompts into detailed visual briefs",
        "Clean, user-friendly gallery interface with community inspiration and style filters"
      ],
      cons: [
        "Free tier generations are publicly visible in the community feed",
        "Photorealistic human portraits occasionally lag specialized portrait models"
      ]
    }
  },

  // 4. CopilotKit
  {
    id: "cmucrh2batch8copilotkit04",
    slug: "copilotkit",
    name: "CopilotKit",
    tagline: "Open source framework to embed AI copilots into React applications",
    description: "CopilotKit provides open-source React components and hooks to integrate contextual AI assistants, generative UI components, and autonomous in-app workflows.",
    websiteUrl: "https://copilotkit.ai",
    logoEmoji: "🤖",
    logoGradient: "from-blue-600 via-indigo-600 to-purple-600",
    logoUrl: "/logos/copilotkit.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Free and open source under MIT; enterprise cloud support and infrastructure available.",
    hasApi: true,
    docsUrl: "https://docs.copilotkit.ai",
    tagsPipe: "react|copilot|in-app-agent|generative-ui|open-source",
    editorsPick: false,
    curated: true,
    makerHandle: "copilotkit",
    status: "live",
    editorial: {
      longDescription: "CopilotKit makes it straightforward for frontend developers to embed custom AI copilots into existing web products. With hooks like useCopilotReadable and useCopilotAction, developers can give the AI contextual awareness of whatever the user is viewing and let the assistant trigger actions directly in the application interface, including rendering rich interactive generative UI widgets.",
      useCases: [
        "Embedding an intelligent sidebar assistant that can read and edit canvas states",
        "Building autonomous forms that auto-complete data based on user documents",
        "Rendering generative interactive cards inside chat streams using standard React components"
      ],
      pros: [
        "Plugs directly into standard React and Next.js applications with minimal boilerplate",
        "Bidirectional context sharing between application frontend state and the LLM",
        "Model-agnostic design supporting OpenAI, Anthropic, Groq, and local models"
      ],
      cons: [
        "Requires React frontend expertise to configure fine-grained application actions",
        "Complex state-syncing across deeply nested component trees requires careful prop structuring"
      ]
    }
  },

  // 5. Recraft
  {
    id: "cmucrh2batch8recraft00005",
    slug: "recraft",
    name: "Recraft",
    tagline: "Professional AI generation for editable vector art and 3D icons",
    description: "Recraft is a generative design platform tailored for digital artists and product designers, producing clean vector SVG graphics, icon sets, and illustrations with style consistency.",
    websiteUrl: "https://recraft.ai",
    logoEmoji: "📐",
    logoGradient: "from-blue-600 via-indigo-500 to-sky-400",
    logoUrl: "/logos/recraft.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$20/month",
    pricingNote: "Free daily credits for personal use; paid plans start at $20/month with commercial rights.",
    hasApi: true,
    docsUrl: "https://www.recraft.ai/docs",
    tagsPipe: "vector-svg|design-system|3d-icons|illustration|graphic-design",
    editorsPick: true,
    curated: true,
    makerHandle: "recraft",
    status: "live",
    editorial: {
      longDescription: "Recraft is designed specifically for UI/UX professionals, brand designers, and illustrators who need exportable, vector-clean assets. Unlike typical raster image generators, Recraft generates native vector paths in SVG format with grouped layers, allowing designers to tweak anchor points in Figma or Illustrator and maintain identical brand palettes across hundreds of generated assets.",
      useCases: [
        "Generating cohesive icon sets and 3D illustrations for product design systems",
        "Creating exportable vector SVG branding graphics ready for web implementation",
        "Enforcing strict brand color hex codes across all marketing illustrations"
      ],
      pros: [
        "Outputs true vector SVGs with clean nodes rather than pixelated raster bitmaps",
        "Palette locking guarantees generated graphics match strict brand guidelines",
        "Infinite canvas workspace enables side by side visual iteration and batch exporting"
      ],
      cons: [
        "Geared toward graphic and vector art rather than photorealistic human portraits",
        "Commercial usage rights require an active paid subscription"
      ]
    }
  },

  // 6. Replit
  {
    id: "cmucrh2batch8replit000006",
    slug: "replit",
    name: "Replit",
    tagline: "Collaborative software development platform with autonomous Replit Agent",
    description: "Replit is a cloud development environment featuring Replit Agent, an autonomous software engineer that writes code, manages environments, and deploys full stack applications.",
    websiteUrl: "https://replit.com",
    logoEmoji: "💻",
    logoGradient: "from-orange-500 via-red-500 to-amber-600",
    logoUrl: "/logos/replit.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$20/month",
    pricingNote: "Free starter workspace; Core subscription starts at $20/month for access to Replit Agent.",
    hasApi: false,
    docsUrl: "https://docs.replit.com",
    tagsPipe: "cloud-ide|coding-agent|deployment|full-stack|collaboration",
    editorsPick: true,
    curated: true,
    makerHandle: "replit",
    status: "live",
    editorial: {
      longDescription: "Replit combines a zero-setup browser IDE with autonomous AI coding agents. Replit Agent can take a natural language concept and iteratively build out the database schema, backend endpoints, and frontend user interface, executing terminal commands, fixing errors, and provisioning cloud hosting all within an integrated cloud container.",
      useCases: [
        "Scaffolding and deploying functional full-stack web applications from idea prompts",
        "Pair programming with real-time multiplayer code collaboration in the browser",
        "Rapidly testing and hosting Python, Node.js, and database projects without local setup"
      ],
      pros: [
        "End-to-end execution covers code creation, terminal installation, and one-click deployment",
        "Zero local environment installation required, accessible from any browser or iPad",
        "Integrated PostgreSQL databases and authentication modules out of the box"
      ],
      cons: [
        "Advanced agent autonomous runs consume subscription credits quickly",
        "Heavy applications may face memory limits on entry-tier cloud containers"
      ]
    }
  },

  // 7. Baseten
  {
    id: "cmucrh2batch8baseten00007",
    slug: "baseten",
    name: "Baseten",
    tagline: "Serverless machine learning infrastructure for high-speed model inference",
    description: "Baseten provides low-latency serverless model serving, rapid cold starts, and autoscaling GPU infrastructure for deploying open-weight AI models into production.",
    websiteUrl: "https://baseten.co",
    logoEmoji: "⚡",
    logoGradient: "from-emerald-500 via-teal-500 to-cyan-500",
    logoUrl: "/logos/baseten.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Pay as you go",
    pricingNote: "Free starting credits; usage-based billing based on exact GPU runtime seconds.",
    hasApi: true,
    docsUrl: "https://docs.baseten.co",
    tagsPipe: "gpu-cloud|model-serving|inference|truss|serverless",
    editorsPick: false,
    curated: true,
    makerHandle: "baseten",
    status: "live",
    editorial: {
      longDescription: "Baseten enables engineering teams to deploy large language models and diffusion pipelines with zero DevOps friction. Powered by Truss, their open-source model packaging framework, Baseten delivers sub-second cold starts, dynamic GPU autoscaling, and private model endpoints that handle fluctuating production traffic while keeping compute costs minimal.",
      useCases: [
        "Deploying custom fine-tuned Llama and Mistral models behind secure production APIs",
        "Serving Whisper and diffusion models with fast autoscaling during traffic spikes",
        "Packaging complex PyTorch pipelines with custom C++ extensions via Truss"
      ],
      pros: [
        "Industry-leading cold start latency with optimized container image caching",
        "Pay strictly for active GPU seconds without paying for idle server time",
        "Open-source Truss framework ensures deployments are portable and testable locally"
      ],
      cons: [
        "Focused primarily on backend model serving rather than managed foundational APIs",
        "Requires familiarity with containerization and Python model packaging"
      ]
    }
  },

  // 8. Coze
  {
    id: "cmucrh2batch8coze00000008",
    slug: "coze",
    name: "Coze",
    tagline: "Visual conversational agent and bot development platform",
    description: "Coze is an all-in-one visual platform for building next-generation AI chatbots and automated agents with rich plugin ecosystems, database memory, and multi-agent workflows.",
    websiteUrl: "https://coze.com",
    logoEmoji: "🧩",
    logoGradient: "from-indigo-600 via-purple-600 to-pink-500",
    logoUrl: "/logos/coze.svg",
    categoryId: CATEGORY_MAP.AUTOMATION,
    d1CategoryId: D1_CATEGORY_MAP.AUTOMATION,
    pricingModel: "freemium",
    startingPrice: "Free",
    pricingNote: "Free tier covers basic bot creation and plugin runs; Premium plans unlock higher concurrency and API access.",
    hasApi: true,
    docsUrl: "https://www.coze.com/docs",
    tagsPipe: "chatbot|workflow-builder|multi-agent|no-code|automation",
    editorsPick: false,
    curated: true,
    makerHandle: "coze",
    status: "live",
    editorial: {
      longDescription: "Coze, developed by ByteDance, democratizes conversational AI creation by pairing visual workflow builders with extensive pre-built plugin marketplaces. Creators can connect foundation models to live web search, social platforms, news feeds, and private knowledge bases, crafting sophisticated multi-turn bots and publishing them to Discord, Telegram, or web embeds without writing code.",
      useCases: [
        "Building interactive customer support bots integrated with external CRM databases",
        "Automating daily news and market analysis reports sent to Discord or Telegram channels",
        "Creating multi-agent research assistants where bots collaborate to draft reports"
      ],
      pros: [
        "Intuitive visual canvas makes building complex agent workflows accessible to non-developers",
        "Extensive native plugin catalog connecting to Google, YouTube, GitHub, and Twitter",
        "One-click multi-platform deployment to popular messaging apps and web chat widgets"
      ],
      cons: [
        "Advanced custom logic can become unwieldy inside purely visual node editors",
        "Enterprise self-hosting options are more limited compared to pure open-source alternatives"
      ]
    }
  },

  // 9. Fish Audio
  {
    id: "cmucrh2batch8fishaudio009",
    slug: "fish-audio",
    name: "Fish Audio",
    tagline: "High-speed zero-shot text-to-speech and voice cloning platform",
    description: "Fish Audio offers ultra-low-latency voice intelligence, state of the art zero-shot voice cloning, and multilingual expressive speech synthesis foundation models.",
    websiteUrl: "https://fish.audio",
    logoEmoji: "🐟",
    logoGradient: "from-cyan-500 via-sky-500 to-blue-600",
    logoUrl: "/logos/fish-audio.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$5/credit pack",
    pricingNote: "Free monthly allocation of generation credits; top-up packages starting at $5.",
    hasApi: true,
    docsUrl: "https://docs.fish.audio",
    tagsPipe: "text-to-speech|voice-cloning|audio-ai|voice-generation|api",
    editorsPick: false,
    curated: true,
    makerHandle: "fishaudio",
    status: "live",
    editorial: {
      longDescription: "Fish Audio builds cutting-edge neural audio foundation models (Fish Speech) designed for real-time expressive speech generation. With as little as 10 to 15 seconds of clean audio reference, its zero-shot voice cloning accurately replicates timber, pacing, emotion, and accent nuances across multiple languages, delivering streaming audio with sub-second latency.",
      useCases: [
        "Cloning brand voices for conversational AI voice bots and virtual receptionists",
        "Generating emotional character voiceovers for video games and animated storytelling",
        "Localizing video podcasts and educational courses across international languages"
      ],
      pros: [
        "Zero-shot voice cloning requires only seconds of reference audio sample",
        "Expressive prosody captures natural human speech rhythm and emotional inflection",
        "High-performance streaming API suitable for real-time conversational voice agents"
      ],
      cons: [
        "Noisy reference audio can degrade the clarity of cloned vocal output",
        "Community voice library requires careful curation to verify voice license permissions"
      ]
    }
  },

  // 10. Anyscale
  {
    id: "cmucrh2batch8anyscale0010",
    slug: "anyscale",
    name: "Anyscale",
    tagline: "Enterprise distributed AI compute platform built by the creators of Ray",
    description: "Anyscale provides scalable distributed computing infrastructure to train, fine-tune, and serve machine learning workloads and generative AI models at enterprise scale.",
    websiteUrl: "https://anyscale.com",
    logoEmoji: "⚡",
    logoGradient: "from-blue-600 via-sky-500 to-indigo-600",
    logoUrl: "/logos/anyscale.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Pay as you go",
    pricingNote: "Free initial credits on registration; consumption-based compute billing across cloud providers.",
    hasApi: true,
    docsUrl: "https://docs.anyscale.com",
    tagsPipe: "ray|distributed-computing|fine-tuning|mlops|enterprise-ai",
    editorsPick: false,
    curated: true,
    makerHandle: "anyscale",
    status: "live",
    editorial: {
      longDescription: "Anyscale is the commercial enterprise platform built by the original creators of Ray, the open-source distributed compute standard powering OpenAI, Uber, and Netflix. Anyscale lets AI teams scale machine learning workloads from a single laptop to thousands of GPUs seamlessly, optimizing distributed model training, batch embeddings, and LLM serving.",
      useCases: [
        "Scaling distributed LLM fine-tuning across hundreds of cloud GPUs with Ray Train",
        "Running high-throughput offline batch embedding extraction over terabytes of data",
        "Serving multi-model generative AI architectures with dynamic resource allocation"
      ],
      pros: [
        "Eliminates distributed systems complexity by building directly on battle-tested Ray",
        "Cloud-agnostic platform runs across AWS, Google Cloud, and private enterprise clusters",
        "Significant cost efficiency improvements through intelligent GPU scheduling and spot instances"
      ],
      cons: [
        "Designed for engineering teams with established distributed machine learning pipelines",
        "Setup and cloud VPC peering requires cloud infrastructure architecture knowledge"
      ]
    }
  }
];

// Verify invariants immediately upon import
checkInvariants(TOOLS_BATCH_8);
