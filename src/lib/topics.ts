/**
 * Programmatic SEO topic definitions and curated hubs.
 * High-intent developer landing surfaces for queries like "best open source ai tools"
 * or "best ai coding tools".
 *
 * Adheres strictly to AGENTS.md standards:
 * Zero em-dashes or en-dashes in any text, comments, or UI copy.
 */

export type TopicDefinition = {
  slug: string;
  name: string;
  tag: string;
  pricing?: string;
  emoji: string;
  tagline: string;
  h1: string;
  blurb: string;
  metaDescription: string;
};

export const TOPICS: TopicDefinition[] = [
  {
    slug: "open-source",
    name: "Open-Source AI Tools & Models",
    tag: "open-source",
    emoji: "🪶",
    tagline: "Permissive, auditable, and self-hostable AI tools with public source code",
    h1: "Best Open Source AI Tools & Frameworks",
    blurb:
      "A verified directory of open-source artificial intelligence tools, libraries, and model frameworks with public repositories, transparent licenses, and self-hosting options.",
    metaDescription:
      "Discover the best open-source AI tools, frameworks, and models. Filter by license, API support, and verified benchmarks on Prother.",
  },
  {
    slug: "coding",
    name: "AI Coding Assistants & IDEs",
    tag: "coding",
    emoji: "💻",
    tagline: "Autonomous coding agents, AI code completion, and developer IDEs",
    h1: "Best AI Coding Assistants & Tools",
    blurb:
      "Compare the top AI code assistants, autonomous agentic CLI tools, and next-generation IDEs built to accelerate software development.",
    metaDescription:
      "Compare the best AI coding assistants, agents, and IDEs like Cursor, Windsurf, Aider, and Cline on Prother.",
  },
  {
    slug: "agents",
    name: "Autonomous AI Agents",
    tag: "agents",
    emoji: "🤖",
    tagline: "Multi-step autonomous agents that execute tasks and workflows independently",
    h1: "Best Autonomous AI Agents & Task Runners",
    blurb:
      "Find autonomous AI agents capable of planning, executing multi-turn tool loops, and shipping finished changes without constant manual supervision.",
    metaDescription:
      "Browse and compare top autonomous AI agents and task execution engines with verified pricing and capabilities.",
  },
  {
    slug: "developer-tools",
    name: "AI Developer Tools & Infrastructure",
    tag: "developer-tools",
    emoji: "🛠️",
    tagline: "Inference gateways, observability, SDKs, and vector databases",
    h1: "Best AI Developer Tools & Infrastructure",
    blurb:
      "Production infrastructure for building generative AI applications: model proxies, LLM observability, vector search, and deployment frameworks.",
    metaDescription:
      "Explore essential AI developer tools: LLM gateways, vector databases, observability platforms, and local inference engines.",
  },
  {
    slug: "rag",
    name: "RAG & Vector Search",
    tag: "rag",
    emoji: "🎯",
    tagline: "Retrieval-augmented generation pipelines, embeddings, and vector stores",
    h1: "Best RAG & Vector Search Tools",
    blurb:
      "High-performance vector databases, similarity search engines, and document retrieval utilities for accurate LLM context generation.",
    metaDescription:
      "Top tools for Retrieval-Augmented Generation (RAG) and semantic vector search with verified specs and benchmarks.",
  },
  {
    slug: "api-available",
    name: "AI APIs & Model Endpoints",
    tag: "api-available",
    emoji: "🔌",
    tagline: "High-throughput inference endpoints and programmatic AI APIs",
    h1: "Best AI APIs & Hosted Inference Endpoints",
    blurb:
      "Programmatic API endpoints for frontier reasoning, text generation, vision, and embeddings with transparent token pricing.",
    metaDescription:
      "Compare AI APIs and hosted model endpoints by latency, token cost, and SDK support.",
  },
  {
    slug: "free-tier",
    name: "Free AI Tools & Tiers",
    tag: "free-tier",
    emoji: "🆓",
    tagline: "Genuinely usable AI tools with zero upfront cost or credit card requirements",
    h1: "Best Free AI Tools (No Credit Card Required)",
    blurb:
      "AI tools and utilities offering permanent free tiers or 100% free access without requiring payment details.",
    metaDescription:
      "Browse the best free AI tools and platforms with honest zero-cost utility and no hidden trial traps.",
  },
  {
    slug: "self-hosted",
    name: "Self-Hosted Local AI Tools",
    tag: "self-hosted",
    emoji: "🏠",
    tagline: "Private, local AI engines running on your own hardware or VPC",
    h1: "Best Self-Hosted & Local AI Tools",
    blurb:
      "Run frontier open-weight models and AI workflows on your own GPU, workstation, or private cloud without sending data off-premise.",
    metaDescription:
      "Find the best self-hosted and local AI tools like Ollama, vLLM, and Open WebUI for private enterprise deployments.",
  },
];

export function getTopicBySlug(slug: string): TopicDefinition | undefined {
  return TOPICS.find((t) => t.slug === slug);
}
