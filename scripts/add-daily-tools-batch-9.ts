/**
 * Batch 9 Ingestion: 10 Major High-Impact AI Tools
 * 1. Kling AI (kling-ai) - generative-content
 * 2. Fireworks AI (fireworks-ai) - dev-platforms
 * 3. Udio (udio) - generative-content
 * 4. Pika (pika) - generative-content
 * 5. SambaNova (sambanova) - dev-platforms
 * 6. Tripo 3D (tripo3d) - generative-content
 * 7. Meshy (meshy) - generative-content
 * 8. Hedra (hedra) - generative-content
 * 9. FastGPT (fastgpt) - dev-platforms
 * 10. MetaGPT (metagpt) - dev-platforms
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

export const TOOLS_BATCH_9 = [
  // 1. Kling AI
  {
    id: "cmucrh2batch9klingai000001",
    slug: "kling-ai",
    name: "Kling AI",
    tagline: "Next-generation high-definition video generation model with physical simulation",
    description: "Kling AI is an advanced generative video platform capable of creating cinematic 1080p video clips with accurate real-world physics simulation, complex motion trajectories, and camera trajectory controls.",
    websiteUrl: "https://klingai.com",
    logoEmoji: "🎬",
    logoGradient: "from-blue-600 via-indigo-600 to-violet-700",
    logoUrl: "/logos/kling-ai.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$10/month",
    pricingNote: "Free daily credits provided upon login; Standard tier starts at $10/month for priority generation queues.",
    hasApi: true,
    docsUrl: "https://klingai.com/api",
    tagsPipe: "video-generation|diffusion-model|generative-ai|creative-tools|cinematic-ai",
    editorsPick: true,
    curated: true,
    makerHandle: "klingai",
    status: "live",
    editorial: {
      longDescription: "Kling AI represents a breakthrough in diffusion transformer video generation. Developed to simulate complex real-world physical dynamics like fluid movement, light refraction, and gravity, Kling AI produces up to 2-minute cinematic video sequences at 1080p resolution and 30 frames per second. Its suite of camera controls and motion brush tools empowers creators to dictate dynamic camera paths, character consistency, and regional scene transformations with precision.",
      useCases: [
        "Cinematic concept video prototyping for film and game directors",
        "High-engagement social media video ads and motion graphics",
        "Dynamic background and visual asset generation for digital creators"
      ],
      pros: [
        "Exceptional adherence to complex natural physical motion and fluid dynamics",
        "Supports detailed prompt controls and multi-camera perspectives",
        "Fast cloud processing pipeline with flexible aspect ratio exports"
      ],
      cons: [
        "Heavy server demand can result in queue wait times on free tier",
        "Advanced motion brush tools require a learning curve for beginners"
      ]
    }
  },

  // 2. Fireworks AI
  {
    id: "cmucrh2batch9fireworks00002",
    slug: "fireworks-ai",
    name: "Fireworks AI",
    tagline: "Production-grade inference engine and fine-tuning platform for open-source AI models",
    description: "Fireworks AI provides an ultra-fast, cost-effective inference engine and serverless platform for deploying, fine-tuning, and scaling open-source generative AI and multimodal models.",
    websiteUrl: "https://fireworks.ai",
    logoEmoji: "🎆",
    logoGradient: "from-purple-600 via-indigo-700 to-pink-600",
    logoUrl: "/logos/fireworks-ai.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "$0.20/1M tokens",
    pricingNote: "Free starting developer credit; pay-as-you-go serverless token pricing starting around $0.20 per million tokens.",
    hasApi: true,
    docsUrl: "https://docs.fireworks.ai",
    tagsPipe: "inference-engine|developer-tools|open-source-models|fine-tuning|llm-infrastructure",
    editorsPick: true,
    curated: true,
    makerHandle: "fireworksai",
    status: "live",
    editorial: {
      longDescription: "Fireworks AI delivers developer infrastructure engineered for low-latency generative AI model serving. Leveraging custom GPU kernel optimizations and specialized model parallelism, Fireworks provides sub-second time-to-first-token inference across major open-source weights including Llama 3, Qwen, DeepSeek, and Mixtral. The platform supports serverless API queries, on-demand LoRA fine-tuning, structured JSON schema outputs, and dedicated enterprise deployments with drop-in OpenAI SDK compatibility.",
      useCases: [
        "High-throughput enterprise customer support and conversational agents",
        "Real-time code completion and developer copilots requiring minimal latency",
        "Fine-tuned domain-specific agent deployments on open weights"
      ],
      pros: [
        "One of the fastest production serving engines available in the market",
        "Drop-in OpenAI SDK API compatibility simplifies codebase integration",
        "Significantly lower inference cost compared to proprietary closed models"
      ],
      cons: [
        "Enterprise custom VPC options require direct enterprise coordination",
        "Model catalog updates require checking benchmark compatibility"
      ]
    }
  },

  // 3. Udio
  {
    id: "cmucrh2batch9udio000000003",
    slug: "udio",
    name: "Udio",
    tagline: "AI music generation platform creating full-fidelity vocal and instrumental songs",
    description: "Udio is an AI music creation platform that transforms text prompts into full-fidelity songs with professional vocals, rich instrumentals, and complete genre flexibility.",
    websiteUrl: "https://www.udio.com",
    logoEmoji: "🎵",
    logoGradient: "from-pink-500 via-rose-600 to-amber-600",
    logoUrl: "/logos/udio.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$10/month",
    pricingNote: "Free tier offers monthly creation credits; Standard plan at $10/month unlocks stem separation and commercial usage.",
    hasApi: false,
    docsUrl: "https://www.udio.com/faq",
    tagsPipe: "music-generation|audio-ai|creative-tools|voice-synthesis|generative-music",
    editorsPick: true,
    curated: true,
    makerHandle: "udio",
    status: "live",
    editorial: {
      longDescription: "Udio redefines algorithmic music production by synthesizing professional-quality audio across every imaginable genre. By training deep generative audio models on comprehensive musical traditions, Udio interprets complex stylistic, lyrical, and emotional prompts to produce complete songs with expressive singing, layered instrumentation, and cohesive structural progression. Musicians and creators can steer song arrangements through iterative extensions, stem separation, and precision inpainting.",
      useCases: [
        "Background soundtrack and theme music production for video creators",
        "Rapid musical songwriting inspiration and melody prototyping",
        "Custom jingle and commercial audio creation for marketing campaigns"
      ],
      pros: [
        "Studio-quality audio output with emotional resonance in vocal tracks",
        "Granular control over musical structure through extend and inpaint features",
        "Active community showcase and collaborative playlist features"
      ],
      cons: [
        "Complex musical arrangements can take several generation attempts to dial in",
        "Free tier outputs have limited monthly generation credits"
      ]
    }
  },

  // 4. Pika
  {
    id: "cmucrh2batch9pika0000000004",
    slug: "pika",
    name: "Pika",
    tagline: "Idea-to-video platform with real-time motion control and cinematic effects",
    description: "Pika is an intuitive generative video platform that transforms text descriptions and still images into dynamic, expressive video animations with fine-grained region editing.",
    websiteUrl: "https://pika.art",
    logoEmoji: "⚡",
    logoGradient: "from-amber-500 via-orange-600 to-red-600",
    logoUrl: "/logos/pika.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$10/month",
    pricingNote: "Free tier includes initial credits with watermark; Standard subscription starts at $10/month for watermark removal.",
    hasApi: true,
    docsUrl: "https://pika.art/about",
    tagsPipe: "video-generation|vfx|creative-suite|animation|generative-video",
    editorsPick: true,
    curated: true,
    makerHandle: "pika",
    status: "live",
    editorial: {
      longDescription: "Pika democratizes cinematic video creation with an intuitive web platform optimized for speed and creative visual effects. Its core engine takes text, images, or existing video footage and applies realistic physics, stylized character movement, and customizable camera pans. With specialized features like Pikaffects (enabling surreal physical transformations like squish, melt, and crush), inpainting for selective element swaps, and integrated sound effects, Pika serves as an all-in-one motion studio.",
      useCases: [
        "Creative viral video production and surrealist visual effects",
        "E-commerce product animation and dynamic advertisement staging",
        "Visual storytelling and storyboarding for animation studios"
      ],
      pros: [
        "Playful, creative effects that are difficult to reproduce in traditional VFX",
        "Extremely fast web interface with immediate generation feedback",
        "Intuitive canvas editing tools suited for both creators and beginners"
      ],
      cons: [
        "Free exports include a subtle watermark",
        "Video clips are short by default, requiring sequential extensions"
      ]
    }
  },

  // 5. SambaNova
  {
    id: "cmucrh2batch9sambanova0005",
    slug: "sambanova",
    name: "SambaNova",
    tagline: "Ultra-fast AI platform powered by Reconfigurable Dataflow Units for enterprise inference",
    description: "SambaNova Systems provides high-performance AI infrastructure and cloud API services powered by its custom SN40L Reconfigurable Dataflow Units (RDU), achieving unmatched token-generation speeds.",
    websiteUrl: "https://sambanova.ai",
    logoEmoji: "🚀",
    logoGradient: "from-orange-600 via-amber-600 to-yellow-600",
    logoUrl: "/logos/sambanova.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "freemium",
    startingPrice: "Free Tier",
    pricingNote: "Free developer cloud tier with generous rate limits; enterprise consumption plans for high-throughput production.",
    hasApi: true,
    docsUrl: "https://docs.sambanova.ai",
    tagsPipe: "hardware-ai|rdu|ultra-fast-inference|enterprise-ai|developer-platform",
    editorsPick: true,
    curated: true,
    makerHandle: "sambanova",
    status: "live",
    editorial: {
      longDescription: "SambaNova Systems is a pioneer in specialized silicon and software systems built exclusively for generative AI workloads. Its SN40L Reconfigurable Dataflow Unit (RDU) bypasses traditional GPU memory bandwidth bottlenecks by configuring custom dataflow graphs on chip, unlocking record-breaking inference speeds of hundreds of tokens per second on frontier models like Llama 3 70B and 405B. Through SambaNova Cloud, developers access these speeds via simple OpenAI-compatible API calls.",
      useCases: [
        "Real-time voice agents where ultra-low latency inference is mandatory",
        "High-throughput enterprise document processing across long context windows",
        "Mission-critical agentic orchestration loops requiring instant responses"
      ],
      pros: [
        "Industry-leading generation speed for demanding real-time voice and agent loops",
        "High hardware efficiency for large-scale enterprise deployments",
        "OpenAI compatible API makes switching from existing providers seamless"
      ],
      cons: [
        "On-premises hardware appliances represent significant enterprise capital expense",
        "Community model options focus primarily on mainstream open-weight architectures"
      ]
    }
  },

  // 6. Tripo 3D
  {
    id: "cmucrh2batch9tripo3d000006",
    slug: "tripo3d",
    name: "Tripo 3D",
    tagline: "AI-powered 3D modeling platform generating textured meshes in seconds",
    description: "Tripo 3D is a generative AI platform that turns text descriptions or single 2D images into complete, textured 3D models and character rigs ready for game development and 3D printing.",
    websiteUrl: "https://www.tripo3d.ai",
    logoEmoji: "🧊",
    logoGradient: "from-cyan-500 via-teal-600 to-emerald-600",
    logoUrl: "/logos/tripo3d.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$9.90/month",
    pricingNote: "Free daily generation allowance; Pro plans start at $9.90/month for high-resolution mesh downloads and commercial licensing.",
    hasApi: true,
    docsUrl: "https://platform.tripo3d.ai/docs",
    tagsPipe: "3d-generation|mesh-modeling|game-dev|3d-printing|generative-3d",
    editorsPick: true,
    curated: true,
    makerHandle: "tripo3d",
    status: "live",
    editorial: {
      longDescription: "Tripo 3D accelerates 3D content creation by reducing modeling and texturing times from hours to seconds. Built upon large-scale spatial geometric diffusion models, Tripo reconstructs accurate 3D geometry from single-view photographs or natural language prompts. It automatically generates clean quad-dominant retopology, bakes full PBR material maps, and provides one-click character skeletal rigging, producing assets directly exportable to Blender, Unity, and Unreal Engine.",
      useCases: [
        "Rapid 3D asset prototyping for indie game developers and studios",
        "AR visualization and 3D product showcase generation for retail",
        "3D printing hobbyist model generation from 2D character artwork"
      ],
      pros: [
        "Unprecedented generation speed compared to traditional 3D modeling workflows",
        "Automated rigging makes models immediately ready for game engines like Unity and Unreal",
        "Supports detailed image reference input for exact shape fidelity"
      ],
      cons: [
        "Complex mechanical assemblies may require manual topology cleanup",
        "High-resolution texture baking requires premium tier credits"
      ]
    }
  },

  // 7. Meshy
  {
    id: "cmucrh2batch9meshy00000007",
    slug: "meshy",
    name: "Meshy",
    tagline: "3D generative AI tool for text-to-3D and image-to-3D mesh generation",
    description: "Meshy is an AI-powered 3D asset creation suite that enables game artists and designers to generate textured 3D models, stylize existing meshes, and produce complete material maps in minutes.",
    websiteUrl: "https://www.meshy.ai",
    logoEmoji: "🗿",
    logoGradient: "from-indigo-600 via-blue-600 to-cyan-600",
    logoUrl: "/logos/meshy.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$16/month",
    pricingNote: "Free plan includes 200 monthly credits; Pro tier starts at $16/month for high-priority queues and unlimited downloads.",
    hasApi: true,
    docsUrl: "https://docs.meshy.ai",
    tagsPipe: "3d-assets|pbr-textures|game-art|creative-suite|text-to-3d",
    editorsPick: true,
    curated: true,
    makerHandle: "meshy",
    status: "live",
    editorial: {
      longDescription: "Meshy empowers 3D artists, game developers, and creative studios with specialized tools for fast generative geometry and surface texturing. Its pipeline supports text-to-3D, image-to-3D, and AI-assisted re-texturing, allowing artists to upload untextured 3D meshes and generate multi-layered PBR texture sets (diffuse, roughness, metallic, normal) from descriptive style prompts. Meshy outputs clean meshes in GLB, FBX, OBJ, and USDZ formats.",
      useCases: [
        "Environmental asset and prop production for game developers",
        "Virtual reality worldbuilding and architectural concept art",
        "Rapid re-texturing of legacy 3D game models"
      ],
      pros: [
        "High-quality texturing engine that breathes life into untextured meshes",
        "Clean UI with dedicated sliders for polycount and artistic styles",
        "Strong integration with popular 3D formats like FBX, OBJ, and USDZ"
      ],
      cons: [
        "Detailed organic anatomy like faces may need sculpting touch-ups",
        "Higher polygon detail levels consume more generation credits"
      ]
    }
  },

  // 8. Hedra
  {
    id: "cmucrh2batch9hedra00000008",
    slug: "hedra",
    name: "Hedra",
    tagline: "Expressive AI video creation platform for character generation and storytelling",
    description: "Hedra is an expressive AI video creation tool that produces realistic talking avatars, musical performances, and narrative characters with perfectly synchronized facial expressions and audio.",
    websiteUrl: "https://www.hedra.com",
    logoEmoji: "🎭",
    logoGradient: "from-fuchsia-600 via-pink-600 to-rose-600",
    logoUrl: "/logos/hedra.svg",
    categoryId: CATEGORY_MAP.GENERATIVE_CONTENT,
    d1CategoryId: D1_CATEGORY_MAP.GENERATIVE_CONTENT,
    pricingModel: "freemium",
    startingPrice: "$10/month",
    pricingNote: "Free daily creation limits; paid subscription plans starting at $10/month for HD resolution and extended duration.",
    hasApi: true,
    docsUrl: "https://www.hedra.com/faq",
    tagsPipe: "talking-avatars|lip-sync|video-creation|character-animation|generative-video",
    editorsPick: true,
    curated: true,
    makerHandle: "hedra",
    status: "live",
    editorial: {
      longDescription: "Hedra is built to bridge the gap between static generative images and full-motion narrative character performances. Its foundation model, Character-1, delivers nuanced emotional expressions, head movements, and syllable-accurate lip synchronization directly from audio tracks or synthesized speech. Whether generating realistic human avatars, animated creatures, or stylized illustrations, Hedra produces expressive video sequences suited for digital storytelling.",
      useCases: [
        "Virtual influencers and social media narrative storytelling",
        "Educational training videos and character-led marketing explanations",
        "Music video creation featuring animated artist performances"
      ],
      pros: [
        "Industry-leading natural facial dynamics and micro-expressions",
        "Simple three-step creation flow: character, voice, and generate",
        "Supports diverse art styles ranging from photorealism to cartoon illustration"
      ],
      cons: [
        "Background scene movement is subtle compared to full camera motion engines",
        "Rendering times scale with audio file duration"
      ]
    }
  },

  // 9. FastGPT
  {
    id: "cmucrh2batch9fastgpt000009",
    slug: "fastgpt",
    name: "FastGPT",
    tagline: "Enterprise knowledge base platform and visual AI workflow builder",
    description: "FastGPT is an open-source knowledge base platform built on large language models, offering data preprocessing, hybrid vector search, and a visual node-based workflow orchestration canvas.",
    websiteUrl: "https://fastgpt.in",
    logoEmoji: "📚",
    logoGradient: "from-blue-600 via-cyan-600 to-teal-600",
    logoUrl: "/logos/fastgpt.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source community edition free for self-hosting; hosted enterprise SaaS plans available with managed support.",
    hasApi: true,
    docsUrl: "https://doc.fastgpt.in",
    tagsPipe: "knowledge-base|rag-platform|open-source|workflow-automation|llm-orchestration",
    editorsPick: true,
    curated: true,
    makerHandle: "fastgpt",
    status: "live",
    editorial: {
      longDescription: "FastGPT provides an enterprise-ready retrieval-augmented generation (RAG) platform that combines document preprocessing, hybrid vector search, and visual flow design. Teams can ingest unstructured documents in Word, PDF, and Markdown formats, apply automated question-answer extraction, and assemble complex business logic pipelines through an intuitive node-based canvas. The platform includes full REST APIs, web embed widgets, and integrations with enterprise communication channels.",
      useCases: [
        "Internal enterprise company documentation search and employee onboarding copilots",
        "Customer support chatbots integrated with proprietary technical documentation",
        "Visual prototyping of multi-turn conversational retrieval applications"
      ],
      pros: [
        "Fully open-source codebase permitting complete data privacy and local hosting",
        "Visual orchestration canvas lowers the barrier to entry for enterprise teams",
        "Robust data chunking and automated QA pair extraction capabilities"
      ],
      cons: [
        "Self-hosting requires managing MongoDB, PostgreSQL, and vector database dependencies",
        "Complex custom code nodes require familiarity with JavaScript runtimes"
      ]
    }
  },

  // 10. MetaGPT
  {
    id: "cmucrh2batch9metagpt000010",
    slug: "metagpt",
    name: "MetaGPT",
    tagline: "Multi-agent framework assigning human workflow roles to software development agents",
    description: "MetaGPT is a multi-agent collaboration framework that takes a single-line requirement and outputs user stories, competitive analysis, requirements documents, data structures, and complete codebase implementations.",
    websiteUrl: "https://github.com/geekan/MetaGPT",
    logoEmoji: "🤖",
    logoGradient: "from-blue-700 via-indigo-700 to-violet-800",
    logoUrl: "/logos/metagpt.svg",
    categoryId: CATEGORY_MAP.DEV_PLATFORMS,
    d1CategoryId: D1_CATEGORY_MAP.DEV_PLATFORMS,
    pricingModel: "open_source",
    startingPrice: "Free",
    pricingNote: "Open-source MIT licensed software, completely free to use with your own LLM API keys.",
    hasApi: true,
    docsUrl: "https://docs.deepwisdom.ai/main/en",
    tagsPipe: "multi-agent|agent-framework|software-engineering|open-source|autonomous-agents",
    editorsPick: true,
    curated: true,
    makerHandle: "geekan",
    status: "live",
    editorial: {
      longDescription: "MetaGPT structures autonomous AI agent collaboration by encoding real-world human organizational Standard Operating Procedures (SOPs). By assigning specialized personas (Product Manager, Architect, Project Manager, Engineer, QA), MetaGPT breaks down ambitious software ideas into structured deliverables: PRD specifications, system design architectures, sequence diagrams, API interface declarations, and tested codebase modules.",
      useCases: [
        "Autonomous software project scaffolding and requirement document drafting",
        "Rapid MVP exploration and competitive analysis for technical founders",
        "Academic research into multi-agent coordination and organizational workflows"
      ],
      pros: [
        "Transforms high-level project concepts into concrete technical documentation and code",
        "Proven architecture tested across complex multi-role software engineering tasks",
        "Extensive open-source community support and modular role extensions"
      ],
      cons: [
        "Consumes significant LLM tokens due to multi-role internal debate and drafting",
        "Complex full-stack applications may require human architectural oversight"
      ]
    }
  }
];

// Run invariant check
checkInvariants(TOOLS_BATCH_9);
console.log("All 10 tools passed the invariant checks (0 banned dashes).");
