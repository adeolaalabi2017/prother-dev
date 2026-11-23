import type { Metadata } from "next";

/** Metadata for the unfiltered /tools directory (shared by the live and ISR routes). */
export const DEFAULT_TOOLS_METADATA: Metadata = {
  alternates: {
    canonical: "/tools",
    types: { "application/rss+xml": "/api/rss" },
  },
  title: "AI tools · search & compare | Prother",
  description:
    "The curated directory for AI tools: search, compare, and save your stack. Filter by category, pricing, and tags. No gates. Browse free.",
  keywords: [
    "AI tools directory",
    "browse AI tools",
    "AI tool search",
    "search AI tools",
    "compare AI tools",
  ],
  openGraph: {
    title: "AI tools · search & compare | Prother",
    description:
      "The curated directory for AI tools: search, compare, and save your stack. Filter by category, pricing, and tags. No gates. Browse free.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI tools · search & compare | Prother",
    description:
      "The curated directory for AI tools: search, compare, and save your stack.",
    images: ["/api/og"],
  },
};
