import type { Metadata } from "next";
import { ToolsDirectory } from "@/components/prother/tools-directory";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/tools" },
  title: "Browse thousands of AI tools — Prother",
  description:
    "The open directory of AI tools: every launch, ranked by community votes and searchable by category, pricing, and tags. No gates — browse free.",
  keywords: [
    "AI tools directory",
    "browse AI tools",
    "AI tool search",
    "AI launches",
    "AI tools ranked",
  ],
  openGraph: {
    title: "Browse thousands of AI tools — Prother",
    description:
      "The open directory of AI tools: every launch, ranked by community votes and searchable by category, pricing, and tags. No gates — browse free.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse thousands of AI tools — Prother",
    description:
      "The open directory of AI tools: every launch, ranked by community votes and searchable by category, pricing, and tags.",
    images: ["/api/og"],
  },
  alternates: {
    types: { "application/rss+xml": "/api/rss" },
  },
};

/** /tools — the discovery directory. Server shell renders SEO data
 *  (ItemList JSON-LD over live tools) and hands off to the client browser. */
export default async function ToolsPage() {
  const tools = await db.tool.findMany({
    where: { status: "live", launch: { is: { scheduled: false } } },
    orderBy: { launch: { baseUpvotes: "desc" } },
    take: 60,
    select: {
      slug: true,
      name: true,
      launch: { select: { baseUpvotes: true } },
    },
  });

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI tools on Prother",
    description:
      "Every AI tool that ever launched on Prother — ranked by community votes.",
    numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `/?tool=${encodeURIComponent(t.slug)}`,
    })),
  };

  return (
    <div className="pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <ToolsDirectory />
    </div>
  );
}
