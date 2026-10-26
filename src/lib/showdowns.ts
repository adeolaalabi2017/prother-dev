/**
 * Shared registry of high-intent pairwise "VS" showdowns.
 * Used across the sitemap, command palette, comparison pages, and category links.
 * Strictly adheres to AGENTS.md typography: zero em-dashes or en-dashes.
 */

export type ShowdownItem = {
  slug: string;
  toolA: string;
  toolB: string;
  title: string;
  categorySlug: string;
  categoryName: string;
};

export const POPULAR_SHOWDOWNS: ShowdownItem[] = [
  {
    slug: "cursor-vs-windsurf",
    toolA: "cursor",
    toolB: "windsurf",
    title: "Cursor vs Windsurf",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "chatgpt-vs-claude",
    toolA: "chatgpt",
    toolB: "claude",
    title: "ChatGPT vs Claude",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "chatgpt-vs-deepseek",
    toolA: "chatgpt",
    toolB: "deepseek",
    title: "ChatGPT vs DeepSeek",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "claude-vs-deepseek",
    toolA: "claude",
    toolB: "deepseek",
    title: "Claude vs DeepSeek",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "chatgpt-vs-perplexity",
    toolA: "chatgpt",
    toolB: "perplexity",
    title: "ChatGPT vs Perplexity",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "groq-vs-vllm",
    toolA: "groq",
    toolB: "vllm",
    title: "Groq vs vLLM",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "litellm-vs-openrouter",
    toolA: "litellm",
    toolB: "openrouter",
    title: "LiteLLM vs OpenRouter",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "aider-vs-cline",
    toolA: "aider",
    toolB: "cline",
    title: "Aider vs Cline",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "ollama-vs-vllm",
    toolA: "ollama",
    toolB: "vllm",
    title: "Ollama vs vLLM",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "aider-vs-cursor",
    toolA: "aider",
    toolB: "cursor",
    title: "Aider vs Cursor",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "cline-vs-cursor",
    toolA: "cline",
    toolB: "cursor",
    title: "Cline vs Cursor",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "claude-vs-gemini",
    toolA: "claude",
    toolB: "gemini",
    title: "Claude vs Gemini",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "chatgpt-vs-gemini",
    toolA: "chatgpt",
    toolB: "gemini",
    title: "ChatGPT vs Gemini",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "cursor-vs-zed",
    toolA: "cursor",
    toolB: "zed",
    title: "Cursor vs Zed",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "aider-vs-windsurf",
    toolA: "aider",
    toolB: "windsurf",
    title: "Aider vs Windsurf",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "lm-studio-vs-ollama",
    toolA: "lm-studio",
    toolB: "ollama",
    title: "LM Studio vs Ollama",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "groq-vs-openrouter",
    toolA: "groq",
    toolB: "openrouter",
    title: "Groq vs OpenRouter",
    categorySlug: "dev-platforms",
    categoryName: "Developer Frameworks & Infrastructure",
  },
  {
    slug: "n8n-vs-zapier",
    toolA: "n8n",
    toolB: "zapier",
    title: "n8n vs Zapier",
    categorySlug: "automation",
    categoryName: "Automation & Workflow Orchestration",
  },
  {
    slug: "make-vs-zapier",
    toolA: "make",
    toolB: "zapier",
    title: "Make vs Zapier",
    categorySlug: "automation",
    categoryName: "Automation & Workflow Orchestration",
  },
  {
    slug: "make-vs-n8n",
    toolA: "make",
    toolB: "n8n",
    title: "Make vs n8n",
    categorySlug: "automation",
    categoryName: "Automation & Workflow Orchestration",
  },
  {
    slug: "deepl-vs-grammarly",
    toolA: "deepl",
    toolB: "grammarly",
    title: "DeepL vs Grammarly",
    categorySlug: "nlp-text",
    categoryName: "NLP & Text Utilities",
  },
  {
    slug: "elevenlabs-vs-suno",
    toolA: "elevenlabs",
    toolB: "suno",
    title: "ElevenLabs vs Suno",
    categorySlug: "generative-content",
    categoryName: "Generative Content Creation",
  },
];
