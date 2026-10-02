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
    slug: "deepseek-vs-chatgpt",
    toolA: "deepseek",
    toolB: "chatgpt",
    title: "DeepSeek vs ChatGPT",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "deepseek-vs-claude",
    toolA: "deepseek",
    toolB: "claude",
    title: "DeepSeek vs Claude",
    categorySlug: "conversational-ai",
    categoryName: "Conversational AI & Chatbots",
  },
  {
    slug: "perplexity-vs-chatgpt",
    toolA: "perplexity",
    toolB: "chatgpt",
    title: "Perplexity vs ChatGPT",
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
    slug: "vllm-vs-ollama",
    toolA: "vllm",
    toolB: "ollama",
    title: "vLLM vs Ollama",
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
];
