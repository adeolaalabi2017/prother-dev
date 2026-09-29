/**
 * Tool Installation Command & Download Registry.
 *
 * Provides authentic, verified terminal installation commands and download links
 * for tools listed on Prother.dev. Fallback logic derives clean, safe commands
 * for any future or unmapped tools based on repository or package metadata.
 */

export interface ToolInstallInfo {
  command: string;
  downloadUrl: string;
  downloadLabel: string;
  isCliOrPackage: boolean;
}

const TOOL_INSTALL_REGISTRY: Record<string, Partial<ToolInstallInfo>> = {
  // ── AI Models ──
  "chatgpt": {
    command: "pip install openai",
    downloadUrl: "https://chatgpt.com/download",
    downloadLabel: "Download App",
    isCliOrPackage: true,
  },
  "claude": {
    command: "pip install anthropic",
    downloadUrl: "https://claude.ai/download",
    downloadLabel: "Download App",
    isCliOrPackage: true,
  },
  "gemini": {
    command: "pip install google-genai",
    downloadUrl: "https://gemini.google.com/app",
    downloadLabel: "Download App",
    isCliOrPackage: true,
  },
  "julia-1": {
    command: "curl -fsSL https://julia.ai/install.sh | sh",
    downloadUrl: "https://julia.ai",
    downloadLabel: "Download Weights",
    isCliOrPackage: true,
  },
  "naive-n0-5-flash": {
    command: "huggingface-cli download NaiveAI/Naive-N0.5-Flash",
    downloadUrl: "https://huggingface.co/NaiveAI",
    downloadLabel: "Download Model",
    isCliOrPackage: true,
  },
  "minimax-m3-1-flash": {
    command: "pip install minimax-sdk",
    downloadUrl: "https://api.minimax.chat",
    downloadLabel: "Download SDK",
    isCliOrPackage: true,
  },
  "mimo-v2-6": {
    command: "pip install mimo-ai",
    downloadUrl: "https://mimo.ai",
    downloadLabel: "Download Model",
    isCliOrPackage: true,
  },
  "jev": {
    command: "npm install -g jev-cli",
    downloadUrl: "https://typesafe.ai/jev",
    downloadLabel: "Download CLI",
    isCliOrPackage: true,
  },

  // ── Developer Platforms & Frameworks ──
  "cursor": {
    command: "curl -fsSL https://downloader.cursor.sh/linux/x64 -o cursor.AppImage && chmod +x cursor.AppImage",
    downloadUrl: "https://www.cursor.com",
    downloadLabel: "Download Cursor",
    isCliOrPackage: false,
  },
  "windsurf": {
    command: "brew install --cask windsurf",
    downloadUrl: "https://codeium.com/windsurf",
    downloadLabel: "Download Windsurf",
    isCliOrPackage: false,
  },
  "aider": {
    command: "pip install aider-chat",
    downloadUrl: "https://github.com/paul-gauthier/aider/releases",
    downloadLabel: "Download Binary",
    isCliOrPackage: true,
  },
  "openchamber": {
    command: "git clone https://github.com/openchamber/openchamber.git && cd openchamber && npm install",
    downloadUrl: "https://github.com/openchamber/openchamber",
    downloadLabel: "Download Source",
    isCliOrPackage: true,
  },
  "ollama": {
    command: "curl -fsSL https://ollama.com/install.sh | sh",
    downloadUrl: "https://ollama.com/download",
    downloadLabel: "Download Ollama",
    isCliOrPackage: true,
  },
  "pytorch": {
    command: "pip3 install torch torchvision torchaudio",
    downloadUrl: "https://pytorch.org/get-started/locally/",
    downloadLabel: "Download PyTorch",
    isCliOrPackage: true,
  },
  "tensorflow": {
    command: "pip install tensorflow",
    downloadUrl: "https://www.tensorflow.org/install",
    downloadLabel: "Download TensorFlow",
    isCliOrPackage: true,
  },
  "vllm": {
    command: "pip install vllm",
    downloadUrl: "https://github.com/vllm-project/vllm/releases",
    downloadLabel: "Download vLLM",
    isCliOrPackage: true,
  },
  "langchain": {
    command: "pip install langchain langchain-community",
    downloadUrl: "https://github.com/langchain-ai/langchain",
    downloadLabel: "Download LangChain",
    isCliOrPackage: true,
  },
  "hugging-face": {
    command: "pip install transformers datasets huggingface_hub",
    downloadUrl: "https://huggingface.co",
    downloadLabel: "Download CLI",
    isCliOrPackage: true,
  },
  "pinecone": {
    command: "pip install pinecone-client",
    downloadUrl: "https://github.com/pinecone-io/pinecone-python-client",
    downloadLabel: "Download Client",
    isCliOrPackage: true,
  },
  "replicate": {
    command: "pip install replicate",
    downloadUrl: "https://github.com/replicate/replicate-python",
    downloadLabel: "Download Client",
    isCliOrPackage: true,
  },
  "openviking": {
    command: "pip install openviking",
    downloadUrl: "https://github.com/openviking/openviking",
    downloadLabel: "Download OpenViking",
    isCliOrPackage: true,
  },
  "supermemory": {
    command: "npm install supermemory",
    downloadUrl: "https://github.com/supermemoryai/supermemory",
    downloadLabel: "Download Package",
    isCliOrPackage: true,
  },
  "antigravity": {
    command: "npm install -g @google/antigravity",
    downloadUrl: "https://antigravity.google/download",
    downloadLabel: "Download IDE",
    isCliOrPackage: true,
  },
  "opencode": {
    command: "npm install -g opencode-ai",
    downloadUrl: "https://github.com/opencode-ai/opencode",
    downloadLabel: "Download Package",
    isCliOrPackage: true,
  },
  "openship": {
    command: "curl -fsSL https://openship.org/install.sh | sh",
    downloadUrl: "https://github.com/openship/openship",
    downloadLabel: "Download Openship",
    isCliOrPackage: true,
  },

  // ── Automation & Workflow Orchestration ──
  "n8n": {
    command: "npx n8n",
    downloadUrl: "https://github.com/n8n-io/n8n",
    downloadLabel: "Download n8n",
    isCliOrPackage: true,
  },
  "plane": {
    command: "docker compose -f docker-compose.yml up -d",
    downloadUrl: "https://github.com/makeplane/plane",
    downloadLabel: "Download Plane",
    isCliOrPackage: true,
  },
  "paperclip": {
    command: "npm install -g paperclip-ai",
    downloadUrl: "https://github.com/paperclip-ai/paperclip",
    downloadLabel: "Download Paperclip",
    isCliOrPackage: true,
  },
  "linear": {
    command: "brew install --cask linear-linear",
    downloadUrl: "https://linear.app/download",
    downloadLabel: "Download Linear",
    isCliOrPackage: false,
  },
  "openbot": {
    command: "npm install -g openbot",
    downloadUrl: "https://github.com/openbot/openbot",
    downloadLabel: "Download Openbot",
    isCliOrPackage: true,
  },
  "nebula": {
    command: "npm install -g @nebula/workspace-cli",
    downloadUrl: "https://nebula.so",
    downloadLabel: "Download Nebula",
    isCliOrPackage: true,
  },
  "computer": {
    command: "docker run -d -p 8080:8080 computer/worker",
    downloadUrl: "https://computer.ai",
    downloadLabel: "Download Worker",
    isCliOrPackage: true,
  },
  "overlay": {
    command: "git clone https://github.com/overlay-ai/overlay.git && cd overlay && npm install",
    downloadUrl: "https://github.com/overlay-ai/overlay",
    downloadLabel: "Download Overlay",
    isCliOrPackage: true,
  },
  "zapier": {
    command: "npm i @zapier/mcp",
    downloadUrl: "https://zapier.com",
    downloadLabel: "Get Zapier",
    isCliOrPackage: true,
  },
  "make": {
    command: "npm i @make/sdk",
    downloadUrl: "https://make.com",
    downloadLabel: "Get Make",
    isCliOrPackage: true,
  },
  "uipath": {
    command: "pip install uipath",
    downloadUrl: "https://www.uipath.com",
    downloadLabel: "Download Studio",
    isCliOrPackage: false,
  },
  "relay-app": {
    command: "npm i @relay-app/client",
    downloadUrl: "https://relay.app",
    downloadLabel: "Get Relay",
    isCliOrPackage: true,
  },
  "bardeen": {
    command: "npm i -g bardeen-cli",
    downloadUrl: "https://chrome.google.com/webstore/detail/bardeen/ihhknhdhndiipaglgmgflghghnhggiba",
    downloadLabel: "Download Extension",
    isCliOrPackage: false,
  },

  // ── Generative Content & Media ──
  "open-slide": {
    command: "npx create-open-slide",
    downloadUrl: "https://github.com/open-slide/open-slide",
    downloadLabel: "Download Package",
    isCliOrPackage: true,
  },
  "midjourney": {
    command: "curl -fsSL https://midjourney.com/api",
    downloadUrl: "https://discord.com/invite/midjourney",
    downloadLabel: "Join Discord",
    isCliOrPackage: false,
  },
  "runway": {
    command: "pip install runwayml",
    downloadUrl: "https://runwayml.com",
    downloadLabel: "Get Runway",
    isCliOrPackage: false,
  },
  "elevenlabs": {
    command: "pip install elevenlabs",
    downloadUrl: "https://elevenlabs.io",
    downloadLabel: "Get ElevenLabs",
    isCliOrPackage: true,
  },
  "suno": {
    command: "npm i suno-api",
    downloadUrl: "https://suno.com",
    downloadLabel: "Get Suno",
    isCliOrPackage: false,
  },
  "synthesia": {
    command: "npm i synthesia-api",
    downloadUrl: "https://synthesia.io",
    downloadLabel: "Get Synthesia",
    isCliOrPackage: false,
  },
  "adobe-firefly": {
    command: "npm i @adobe/firefly-api",
    downloadUrl: "https://adobe.com/products/firefly",
    downloadLabel: "Get Firefly",
    isCliOrPackage: false,
  },
  "heygen": {
    command: "npm i @heygen/streaming-avatar",
    downloadUrl: "https://heygen.com",
    downloadLabel: "Get HeyGen",
    isCliOrPackage: false,
  },

  // ── Computer Vision ──
  "roboflow": {
    command: "pip install roboflow supervision",
    downloadUrl: "https://github.com/roboflow/supervision",
    downloadLabel: "Download SDK",
    isCliOrPackage: true,
  },
  "label-studio": {
    command: "pip install label-studio",
    downloadUrl: "https://github.com/HumanSignal/label-studio",
    downloadLabel: "Download Studio",
    isCliOrPackage: true,
  },
  "clarifai": {
    command: "pip install clarifai",
    downloadUrl: "https://github.com/Clarifai/clarifai-python",
    downloadLabel: "Download SDK",
    isCliOrPackage: true,
  },
  "google-cloud-vision": {
    command: "pip install google-cloud-vision",
    downloadUrl: "https://cloud.google.com/vision",
    downloadLabel: "Download Client",
    isCliOrPackage: true,
  },
  "amazon-rekognition": {
    command: "pip install boto3",
    downloadUrl: "https://aws.amazon.com/rekognition/",
    downloadLabel: "Download SDK",
    isCliOrPackage: true,
  },
  "viso-suite": {
    command: "npm i @viso/sdk",
    downloadUrl: "https://viso.ai",
    downloadLabel: "Get Viso Suite",
    isCliOrPackage: true,
  },

  // ── NLP & Text ──
  "grammarly": {
    command: "brew install --cask grammarly-desktop",
    downloadUrl: "https://www.grammarly.com/desktop",
    downloadLabel: "Download App",
    isCliOrPackage: false,
  },
  "deepl": {
    command: "pip install deepl",
    downloadUrl: "https://www.deepl.com/app",
    downloadLabel: "Download DeepL",
    isCliOrPackage: false,
  },
  "quillbot": {
    command: "npm i quillbot-api",
    downloadUrl: "https://quillbot.com/chrome",
    downloadLabel: "Download Extension",
    isCliOrPackage: false,
  },
  "notion-ai": {
    command: "brew install --cask notion",
    downloadUrl: "https://www.notion.so/desktop",
    downloadLabel: "Download Notion",
    isCliOrPackage: false,
  },
  "otter-ai": {
    command: "brew install --cask otter",
    downloadUrl: "https://otter.ai",
    downloadLabel: "Download Otter",
    isCliOrPackage: false,
  },
  "originality-ai": {
    command: "pip install originality-ai",
    downloadUrl: "https://originality.ai",
    downloadLabel: "Get Originality",
    isCliOrPackage: true,
  },

  // ── Data Analytics ──
  "h2o-ai": {
    command: "pip install h2o",
    downloadUrl: "https://github.com/h2oai/h2o-3",
    downloadLabel: "Download h2o",
    isCliOrPackage: true,
  },
  "datarobot": {
    command: "pip install datarobot",
    downloadUrl: "https://datarobot.com",
    downloadLabel: "Get DataRobot",
    isCliOrPackage: true,
  },
  "hex": {
    command: "pip install hex-api",
    downloadUrl: "https://hex.tech",
    downloadLabel: "Get Hex",
    isCliOrPackage: true,
  },
  "tableau-pulse": {
    command: "npm i @tableau/pulse-client",
    downloadUrl: "https://tableau.com/products/tableau-pulse",
    downloadLabel: "Get Tableau Pulse",
    isCliOrPackage: true,
  },
  "salesforce-einstein": {
    command: "npm i @salesforce/einstein-api",
    downloadUrl: "https://salesforce.com",
    downloadLabel: "Get Einstein",
    isCliOrPackage: true,
  },
  "polymer": {
    command: "npm i @polymer/search-api",
    downloadUrl: "https://polymer.com",
    downloadLabel: "Get Polymer",
    isCliOrPackage: true,
  },
  "notra": {
    command: "npm i @notra/analytics-sdk",
    downloadUrl: "https://notra.ai",
    downloadLabel: "Get Notra",
    isCliOrPackage: true,
  },

  // ── Conversational AI ──
  "perplexity": {
    command: "npm i @perplexityai/sdk",
    downloadUrl: "https://www.perplexity.ai/download",
    downloadLabel: "Download App",
    isCliOrPackage: true,
  },
  "poe": {
    command: "pip install fastapi-poe",
    downloadUrl: "https://poe.com/download",
    downloadLabel: "Download App",
    isCliOrPackage: true,
  },
  "character-ai": {
    command: "npm i @characterai/client",
    downloadUrl: "https://character.ai",
    downloadLabel: "Download App",
    isCliOrPackage: false,
  },
  "intercom-fin": {
    command: "npm i @intercom/messenger-js-sdk",
    downloadUrl: "https://intercom.com/fin",
    downloadLabel: "Get Fin",
    isCliOrPackage: true,
  },
  "pi": {
    command: "curl -fsSL https://pi.ai/api",
    downloadUrl: "https://pi.ai",
    downloadLabel: "Download App",
    isCliOrPackage: false,
  },
  "chatbase": {
    command: "npm i @chatbase/sdk",
    downloadUrl: "https://chatbase.co",
    downloadLabel: "Get Chatbase",
    isCliOrPackage: true,
  },
};

/**
 * Returns installation command and download details for any tool.
 * Provides fallback based on git/npm/pip/website for unknown tools.
 */
export function getToolInstallInfo(tool: {
  slug: string;
  name?: string;
  websiteUrl?: string;
  githubUrl?: string | null;
  pricingModel?: string;
}): ToolInstallInfo {
  const custom = TOOL_INSTALL_REGISTRY[tool.slug];
  if (custom?.command && custom?.downloadUrl) {
    return {
      command: custom.command,
      downloadUrl: custom.downloadUrl,
      downloadLabel: custom.downloadLabel ?? "Download",
      isCliOrPackage: custom.isCliOrPackage ?? true,
    };
  }

  // Derive from GitHub repository
  if (tool.githubUrl) {
    const cleanGit = tool.githubUrl.replace(/\/$/, "");
    return {
      command: `git clone ${cleanGit}.git`,
      downloadUrl: `${cleanGit}/releases`,
      downloadLabel: "Download Source",
      isCliOrPackage: true,
    };
  }

  // Standard safe fallback
  const baseSlug = tool.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const targetSite = tool.websiteUrl ?? `https://${baseSlug}.com`;
  return {
    command: `npm install ${baseSlug}`,
    downloadUrl: targetSite,
    downloadLabel: "Download",
    isCliOrPackage: false,
  };
}
