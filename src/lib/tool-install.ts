/**
 * Tool Installation Command, Download & Cloud Access Registry.
 *
 * Provides authentic, verified delivery classification, installation commands,
 * desktop application downloads, and cloud API links for all tools on Prother.dev.
 *
 * Distinguishes between:
 * 1. Installable local packages, CLIs, runners, and open source repositories.
 * 2. Downloadable native desktop applications (e.g. Cursor, Windsurf).
 * 3. Closed-weight foundation models and cloud APIs (access via API keys or subscriptions).
 * 4. Cloud-hosted web applications and SaaS platforms (no local installation).
 */

export type ToolDeliveryType = "installable" | "desktop_app" | "cloud_api" | "cloud_saas";
export type ActionType = "download" | "api" | "launch";

export interface ToolInstallInfo {
  deliveryType: ToolDeliveryType;
  /** True only if tool can actually be installed or run locally */
  hasInstallCommand: boolean;
  command: string | null;
  commandTitle?: string;
  /** Optional SDK client command for cloud APIs */
  hasSdkCommand: boolean;
  sdkCommand: string | null;
  sdkTitle?: string;
  actionUrl: string;
  actionLabel: string;
  actionType: ActionType;
  platformNote: string;
  isCloud: boolean;
  /** True when the action URL is identical to the primary website URL */
  isRedundantWithWebsite: boolean;
  /** Backward compatibility aliases */
  downloadUrl: string;
  downloadLabel: string;
  isCliOrPackage: boolean;
}

interface ToolInstallConfig {
  deliveryType: ToolDeliveryType;
  command?: string;
  commandTitle?: string;
  sdkCommand?: string;
  sdkTitle?: string;
  actionUrl: string;
  actionLabel: string;
  actionType: ActionType;
  platformNote: string;
}

const TOOL_INSTALL_REGISTRY: Record<string, ToolInstallConfig> = {
  // ── AI Models (Foundation & Frontier Architectures) ──
  "naive-n0-5-flash": {
    deliveryType: "installable",
    command: "huggingface-cli download NaiveAI/Naive-N0.5-Flash",
    commandTitle: "Download Model Weights",
    actionUrl: "https://huggingface.co/NaiveAI",
    actionLabel: "Download Weights",
    actionType: "download",
    platformNote: "Open-weight 309B MoE model. Weights are distributed via Hugging Face for local or private cloud deployment.",
  },
  "julia-1": {
    deliveryType: "installable",
    command: "curl -fsSL https://julia.ai/install.sh | sh",
    commandTitle: "Local Inference Runner",
    actionUrl: "https://julia.ai",
    actionLabel: "Download Runner",
    actionType: "download",
    platformNote: "Fast System 1 foundation model with dedicated local inference runner for edge or workstation execution.",
  },
  "minimax-m3-1-flash": {
    deliveryType: "cloud_api",
    sdkCommand: "pip install minimax-sdk",
    sdkTitle: "MiniMax Python SDK",
    actionUrl: "https://api.minimax.chat",
    actionLabel: "API Documentation",
    actionType: "api",
    platformNote: "Closed-weight cloud frontier model. Access is provided via API keys, developer endpoints, and paid subscription tiers. No local weights are distributed.",
  },
  "mimo-v2-6": {
    deliveryType: "cloud_api",
    actionUrl: "https://mimo.ai",
    actionLabel: "API Documentation",
    actionType: "api",
    platformNote: "Closed-weight multimodal foundation model. Accessible through cloud API endpoints and developer platform tiers.",
  },
  "jev": {
    deliveryType: "cloud_api",
    actionUrl: "https://typesafe.ai/jev",
    actionLabel: "API Access",
    actionType: "api",
    platformNote: "Closed-weight machine-native intelligence infrastructure. Access is provided via cloud API and enterprise platform credentials.",
  },

  // ── Conversational AI & Chatbots ──
  "chatgpt": {
    deliveryType: "cloud_saas",
    actionUrl: "https://chatgpt.com/download",
    actionLabel: "Download App",
    actionType: "download",
    platformNote: "Cloud-hosted conversational AI assistant. Access directly in your web browser or download official native apps for macOS, Windows, iOS, and Android.",
  },
  "claude": {
    deliveryType: "cloud_saas",
    actionUrl: "https://claude.ai/download",
    actionLabel: "Download App",
    actionType: "download",
    platformNote: "Cloud-hosted conversational AI assistant powered by Anthropic foundation models. Access via web browser or official desktop application.",
  },
  "gemini": {
    deliveryType: "cloud_saas",
    actionUrl: "https://gemini.google.com/app",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud-based AI assistant powered by Google models. Access directly in your browser or integrated across Google Workspace.",
  },
  "perplexity": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.perplexity.ai/download",
    actionLabel: "Download App",
    actionType: "download",
    platformNote: "Cloud-hosted conversational search and answer engine. Access via web or official desktop and mobile applications.",
  },
  "poe": {
    deliveryType: "cloud_saas",
    actionUrl: "https://poe.com/download",
    actionLabel: "Download App",
    actionType: "download",
    platformNote: "Cloud-hosted multi-bot conversational platform. Access through web browser or official desktop and mobile apps.",
  },
  "character-ai": {
    deliveryType: "cloud_saas",
    actionUrl: "https://character.ai",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud-hosted conversational character platform. Operates entirely in the cloud with no local installation required.",
  },
  "pi": {
    deliveryType: "cloud_saas",
    actionUrl: "https://pi.ai",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud-hosted personal conversational AI. Runs entirely on cloud infrastructure.",
  },
  "chatbase": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.chatbase.co",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud-hosted SaaS platform for training and embedding custom AI chatbots.",
  },
  "intercom-fin": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.intercom.com/fin",
    actionLabel: "Intercom Platform",
    actionType: "launch",
    platformNote: "Cloud-based AI customer service agent integrated into the Intercom platform.",
  },

  // ── Developer Platforms & Frameworks ──
  "cursor": {
    deliveryType: "desktop_app",
    actionUrl: "https://www.cursor.com/download",
    actionLabel: "Download Cursor",
    actionType: "download",
    platformNote: "Native AI-first code editor available for macOS, Windows, and Linux. Download the official installer to get started.",
  },
  "windsurf": {
    deliveryType: "desktop_app",
    actionUrl: "https://codeium.com/windsurf/download",
    actionLabel: "Download Windsurf",
    actionType: "download",
    platformNote: "Agentic IDE by Codeium with native desktop installers for macOS, Windows, and Linux.",
  },
  "aider": {
    deliveryType: "installable",
    command: "pip install aider-chat",
    commandTitle: "Install via pip",
    actionUrl: "https://github.com/paul-gauthier/aider/releases",
    actionLabel: "GitHub Releases",
    actionType: "download",
    platformNote: "Terminal-based AI pair programming tool. Installs locally via Python package manager.",
  },
  "ollama": {
    deliveryType: "installable",
    command: "curl -fsSL https://ollama.com/install.sh | sh",
    commandTitle: "Terminal Install Command",
    actionUrl: "https://ollama.com/download",
    actionLabel: "Download Ollama",
    actionType: "download",
    platformNote: "Get up and running with large language models locally. Install via shell script or download native desktop binary.",
  },
  "vllm": {
    deliveryType: "installable",
    command: "pip install vllm",
    commandTitle: "Install via pip",
    actionUrl: "https://docs.vllm.ai",
    actionLabel: "vLLM Documentation",
    actionType: "api",
    platformNote: "High-throughput and memory-efficient LLM serving engine. Installs via pip for local or cluster deployment.",
  },
  "pytorch": {
    deliveryType: "installable",
    command: "pip3 install torch torchvision torchaudio",
    commandTitle: "Install via pip",
    actionUrl: "https://pytorch.org/get-started/locally/",
    actionLabel: "PyTorch Get Started",
    actionType: "download",
    platformNote: "Open source machine learning framework. Select your OS and hardware compute platform to install locally.",
  },
  "tensorflow": {
    deliveryType: "installable",
    command: "pip install tensorflow",
    commandTitle: "Install via pip",
    actionUrl: "https://www.tensorflow.org/install",
    actionLabel: "TensorFlow Install Guide",
    actionType: "download",
    platformNote: "End-to-end machine learning platform for training and deploying deep learning models.",
  },
  "langchain": {
    deliveryType: "installable",
    command: "pip install langchain langchain-community",
    commandTitle: "Install via pip",
    actionUrl: "https://github.com/langchain-ai/langchain",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source framework for building context-aware reasoning applications with language models.",
  },
  "hugging-face": {
    deliveryType: "installable",
    command: "pip install huggingface_hub",
    commandTitle: "Install Hugging Face CLI",
    actionUrl: "https://huggingface.co",
    actionLabel: "Hugging Face Hub",
    actionType: "launch",
    platformNote: "Central platform for open source machine learning models, datasets, and collaborative tools.",
  },
  "pinecone": {
    deliveryType: "cloud_api",
    sdkCommand: "pip install pinecone-client",
    sdkTitle: "Pinecone Python SDK",
    actionUrl: "https://docs.pinecone.io",
    actionLabel: "Pinecone Documentation",
    actionType: "api",
    platformNote: "Managed cloud vector database. Access is provided via API keys, cloud clusters, and developer console.",
  },
  "replicate": {
    deliveryType: "cloud_api",
    sdkCommand: "pip install replicate",
    sdkTitle: "Replicate Python SDK",
    actionUrl: "https://replicate.com/docs",
    actionLabel: "Developer Docs",
    actionType: "api",
    platformNote: "Cloud AI model execution platform. Run open-source and fine-tuned models via cloud API with per-second billing.",
  },
  "supermemory": {
    deliveryType: "installable",
    command: "npm install supermemory",
    commandTitle: "Install via npm",
    actionUrl: "https://github.com/supermemoryai/supermemory",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Persistent context and memory infrastructure for AI agents. Open source and self-hostable.",
  },
  "antigravity": {
    deliveryType: "installable",
    command: "npm install -g @google/antigravity",
    commandTitle: "Install CLI",
    actionUrl: "https://antigravity.google/download",
    actionLabel: "Download IDE",
    actionType: "download",
    platformNote: "Google autonomous agentic AI development environment and orchestration framework.",
  },
  "openchamber": {
    deliveryType: "installable",
    command: "git clone https://github.com/openchamber/openchamber.git",
    commandTitle: "Clone Repository",
    actionUrl: "https://github.com/openchamber/openchamber",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source development chamber for multi-agent simulation and AI safety testing.",
  },
  "opencode": {
    deliveryType: "installable",
    command: "npm install -g opencode-ai",
    commandTitle: "Install via npm",
    actionUrl: "https://github.com/opencode-ai/opencode",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source AI coding assistant and agent environment.",
  },
  "openship": {
    deliveryType: "installable",
    command: "curl -fsSL https://openship.org/install.sh | sh",
    commandTitle: "Install Script",
    actionUrl: "https://github.com/openship/openship",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source developer deployment and continuous shipping toolkit.",
  },
  "openviking": {
    deliveryType: "installable",
    command: "pip install openviking",
    commandTitle: "Install via pip",
    actionUrl: "https://github.com/openviking/openviking",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source Python library for automated code auditing and exploration.",
  },

  // ── Automation & Workflow Orchestration ──
  "n8n": {
    deliveryType: "installable",
    command: "npx n8n",
    commandTitle: "Run via npx / Docker",
    actionUrl: "https://github.com/n8n-io/n8n",
    actionLabel: "GitHub Releases",
    actionType: "download",
    platformNote: "Fair-code workflow automation tool. Run locally via npx, Docker, or self-hosted server.",
  },
  "plane": {
    deliveryType: "installable",
    command: "git clone https://github.com/makeplane/plane.git",
    commandTitle: "Clone Repository",
    actionUrl: "https://github.com/makeplane/plane",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source project planning and management tool. Self-host with Docker or deploy to cloud.",
  },
  "linear": {
    deliveryType: "desktop_app",
    actionUrl: "https://linear.app/download",
    actionLabel: "Download Linear",
    actionType: "download",
    platformNote: "Issue tracking and project management tool with native desktop apps for macOS and Windows.",
  },
  "bardeen": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.bardeen.ai/download",
    actionLabel: "Add Extension",
    actionType: "launch",
    platformNote: "Browser automation platform. Add the official Chrome extension to automate web workflows.",
  },
  "zapier": {
    deliveryType: "cloud_saas",
    actionUrl: "https://zapier.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud workflow automation platform. Connects web apps directly in the cloud with no local installation.",
  },
  "make": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.make.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud visual automation platform. Design and run multi-step workflows entirely in the cloud.",
  },
  "paperclip": {
    deliveryType: "installable",
    command: "npm install -g paperclip-ai",
    commandTitle: "Install via npm",
    actionUrl: "https://github.com/paperclip-ai/paperclip",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source terminal and workflow clipboard assistant.",
  },
  "openbot": {
    deliveryType: "installable",
    command: "npm install -g openbot",
    commandTitle: "Install via npm",
    actionUrl: "https://github.com/openbot/openbot",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source robot and agent automation scripting framework.",
  },
  "overlay": {
    deliveryType: "installable",
    command: "git clone https://github.com/overlay-ai/overlay.git",
    commandTitle: "Clone Repository",
    actionUrl: "https://github.com/overlay-ai/overlay",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source developer interface overlay toolkit.",
  },
  "uipath": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.uipath.com",
    actionLabel: "UiPath Platform",
    actionType: "launch",
    platformNote: "Enterprise robotic process automation and AI workflow cloud platform.",
  },
  "relay-app": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.relay.app",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud workflow automation with human-in-the-loop approvals.",
  },
  "computer": {
    deliveryType: "installable",
    command: "docker run -d -p 8080:8080 computer/worker",
    commandTitle: "Run via Docker",
    actionUrl: "https://computer.ai",
    actionLabel: "Docker Hub",
    actionType: "download",
    platformNote: "Automated desktop computer agent container for task execution.",
  },
  "nebula": {
    deliveryType: "cloud_saas",
    actionUrl: "https://symbl.ai",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud human-interaction intelligence and conversation analysis platform.",
  },

  // ── Generative Content Creation ──
  "midjourney": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.midjourney.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud-hosted generative AI image platform. Operates via web browser and Discord with no local installation.",
  },
  "runway": {
    deliveryType: "cloud_saas",
    actionUrl: "https://runwayml.com",
    actionLabel: "Open Studio",
    actionType: "launch",
    platformNote: "Cloud creative video generation platform. Gen-2 and Gen-3 models run entirely on cloud GPU infrastructure.",
  },
  "suno": {
    deliveryType: "cloud_saas",
    actionUrl: "https://suno.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud AI music generation platform. Create complete songs from prompts directly in your web browser.",
  },
  "synthesia": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.synthesia.io",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud AI avatar and video generation platform. Operates entirely in the cloud.",
  },
  "elevenlabs": {
    deliveryType: "cloud_saas",
    actionUrl: "https://elevenlabs.io",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud AI voice synthesis, voice cloning, and audio generation platform.",
  },
  "heygen": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.heygen.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud video generation platform specializing in AI spokespersons and avatar translation.",
  },
  "adobe-firefly": {
    deliveryType: "cloud_saas",
    actionUrl: "https://firefly.adobe.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Adobe generative AI creative tools running directly in web browsers and Creative Cloud.",
  },
  "open-slide": {
    deliveryType: "installable",
    command: "npx create-open-slide",
    commandTitle: "Scaffold via npx",
    actionUrl: "https://github.com/open-slide/open-slide",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source presentation generation and slide layout tool.",
  },

  // ── Computer Vision ──
  "label-studio": {
    deliveryType: "installable",
    command: "pip install label-studio",
    commandTitle: "Install via pip",
    actionUrl: "https://github.com/HumanSignal/label-studio",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source data labeling and annotation tool for computer vision, audio, text, and time series.",
  },
  "roboflow": {
    deliveryType: "cloud_saas",
    actionUrl: "https://roboflow.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "End-to-end computer vision platform for dataset curation, model training, and edge deployment.",
  },
  "clarifai": {
    deliveryType: "cloud_api",
    actionUrl: "https://www.clarifai.com",
    actionLabel: "Developer Console",
    actionType: "api",
    platformNote: "Cloud computer vision and deep learning platform accessible via API.",
  },
  "google-cloud-vision": {
    deliveryType: "cloud_api",
    actionUrl: "https://cloud.google.com/vision",
    actionLabel: "Google Cloud Console",
    actionType: "api",
    platformNote: "Pre-trained machine learning vision models accessible via Google Cloud API endpoints.",
  },
  "amazon-rekognition": {
    deliveryType: "cloud_api",
    actionUrl: "https://aws.amazon.com/rekognition/",
    actionLabel: "AWS Console",
    actionType: "api",
    platformNote: "Managed AWS computer vision service for image and video analysis via cloud API.",
  },
  "viso-suite": {
    deliveryType: "cloud_saas",
    actionUrl: "https://viso.ai",
    actionLabel: "Viso Platform",
    actionType: "launch",
    platformNote: "Enterprise end-to-end computer vision platform.",
  },

  // ── NLP & Text Utilities ──
  "deepl": {
    deliveryType: "desktop_app",
    actionUrl: "https://www.deepl.com/en/app",
    actionLabel: "Download DeepL App",
    actionType: "download",
    platformNote: "AI translation tool with native desktop applications for macOS and Windows, plus browser extensions.",
  },
  "grammarly": {
    deliveryType: "desktop_app",
    actionUrl: "https://www.grammarly.com/desktop",
    actionLabel: "Download Grammarly",
    actionType: "download",
    platformNote: "Writing assistance platform with native desktop applications and browser extensions.",
  },
  "notion-ai": {
    deliveryType: "desktop_app",
    actionUrl: "https://www.notion.so/desktop",
    actionLabel: "Download Notion",
    actionType: "download",
    platformNote: "Connected workspace with integrated AI assistant and official desktop apps for macOS and Windows.",
  },
  "quillbot": {
    deliveryType: "cloud_saas",
    actionUrl: "https://quillbot.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud writing, paraphrasing, and summarization tool.",
  },
  "otter-ai": {
    deliveryType: "cloud_saas",
    actionUrl: "https://otter.ai",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud meeting recording, real-time transcription, and automated summary tool.",
  },
  "originality-ai": {
    deliveryType: "cloud_saas",
    actionUrl: "https://originality.ai",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud AI content detection and plagiarism verification platform.",
  },

  // ── Data Analytics & Predictive Modeling ──
  "h2o-ai": {
    deliveryType: "installable",
    command: "pip install h2o",
    commandTitle: "Install via pip",
    actionUrl: "https://github.com/h2oai/h2o-3",
    actionLabel: "GitHub Repository",
    actionType: "download",
    platformNote: "Open source distributed in-memory machine learning platform.",
  },
  "datarobot": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.datarobot.com",
    actionLabel: "DataRobot Platform",
    actionType: "launch",
    platformNote: "Enterprise cloud AI and automated machine learning platform.",
  },
  "hex": {
    deliveryType: "cloud_saas",
    actionUrl: "https://hex.tech",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud collaborative analytics notebook and interactive data app builder.",
  },
  "tableau-pulse": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.tableau.com/products/pulse",
    actionLabel: "Tableau Cloud",
    actionType: "launch",
    platformNote: "Personalized metrics and automated insights powered by Tableau Cloud.",
  },
  "salesforce-einstein": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.salesforce.com/einstein/",
    actionLabel: "Salesforce Console",
    actionType: "launch",
    platformNote: "Embedded CRM intelligence and generative AI platform within Salesforce Cloud.",
  },
  "polymer": {
    deliveryType: "cloud_saas",
    actionUrl: "https://www.polymersearch.com",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "No-code business intelligence tool that turns spreadsheets into interactive data hubs.",
  },
  "notra": {
    deliveryType: "cloud_saas",
    actionUrl: "https://notra.ai",
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud predictive data analytics platform.",
  },
};

/**
 * Resolves verified delivery info, commands, and access links for any tool.
 */
export function getToolInstallInfo({
  slug,
  name,
  websiteUrl,
  githubUrl,
}: {
  slug: string;
  name: string;
  websiteUrl?: string;
  githubUrl?: string | null;
}): ToolInstallInfo {
  const configured = TOOL_INSTALL_REGISTRY[slug];
  const primaryUrl = websiteUrl || (githubUrl ?? "https://prother.dev");

  if (configured) {
    const actionUrl = configured.actionUrl || primaryUrl;
    const isRedundant =
      configured.actionType === "launch" &&
      Boolean(websiteUrl) &&
      actionUrl.replace(/\/$/, "") === websiteUrl?.replace(/\/$/, "");

    return {
      deliveryType: configured.deliveryType,
      hasInstallCommand: Boolean(configured.command),
      command: configured.command ?? null,
      commandTitle: configured.commandTitle ?? "Terminal Installation",
      hasSdkCommand: Boolean(configured.sdkCommand),
      sdkCommand: configured.sdkCommand ?? null,
      sdkTitle: configured.sdkTitle ?? "SDK Client",
      actionUrl,
      actionLabel: configured.actionLabel,
      actionType: configured.actionType,
      platformNote: configured.platformNote,
      isCloud: configured.deliveryType === "cloud_api" || configured.deliveryType === "cloud_saas",
      isRedundantWithWebsite: isRedundant,
      downloadUrl: actionUrl,
      downloadLabel: configured.actionLabel,
      isCliOrPackage: configured.deliveryType === "installable",
    };
  }

  // Dynamic fallback for any unmapped tool
  if (githubUrl) {
    return {
      deliveryType: "installable",
      hasInstallCommand: true,
      command: `git clone ${githubUrl}.git`,
      commandTitle: "Clone Repository",
      hasSdkCommand: false,
      sdkCommand: null,
      actionUrl: githubUrl,
      actionLabel: "GitHub Repository",
      actionType: "download",
      platformNote: "Open source tool available on GitHub.",
      isCloud: false,
      isRedundantWithWebsite: false,
      downloadUrl: githubUrl,
      downloadLabel: "GitHub Repository",
      isCliOrPackage: true,
    };
  }

  // Fallback for cloud web tools
  return {
    deliveryType: "cloud_saas",
    hasInstallCommand: false,
    command: null,
    hasSdkCommand: false,
    sdkCommand: null,
    actionUrl: primaryUrl,
    actionLabel: "Open Web App",
    actionType: "launch",
    platformNote: "Cloud-hosted web platform. Runs entirely in the cloud with no local installation required.",
    isCloud: true,
    isRedundantWithWebsite: true,
    downloadUrl: primaryUrl,
    downloadLabel: "Open Web App",
    isCliOrPackage: false,
  };
}
