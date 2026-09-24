import type { Metadata } from "next";
import { JournalIndex } from "@/components/prother/journal-index";
import { AdSlot } from "@/components/prother/ad-slot";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { placementEnabled } from "@/lib/ad-config";
import { createServerConvexClient } from "@/lib/convex";
import { shadowJournalList } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // One merged `alternates` — a second literal key would silently drop the
  // first (and the canonical with it).
  alternates: {
    canonical: "/journal",
    // Journal RSS autodiscovery — /api/rss serves the journal feed for both
    // /api/rss and /api/rss?kind=journal (see src/app/api/rss/route.ts).
    types: { "application/rss+xml": "/api/rss?kind=journal" },
  },
  title: "The Journal · Prother",
  description:
    "Guides, evaluation playbooks, taxonomy notes, and ecosystem trends from Prother. Notes from the directory.",
  keywords: [
    "AI tool guides",
    "AI tool evaluation",
    "AI tools directory",
    "Prother journal",
    "how to evaluate AI tools",
  ],
  openGraph: {
    title: "The Prother Journal · Notes from the directory",
    description:
      "Guides, evaluation playbooks, taxonomy notes, and ecosystem trends from Prother. Notes from the directory.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Prother Journal · Notes from the directory",
    description:
      "Guides, evaluation playbooks, taxonomy notes, and ecosystem trends from Prother.",
    images: ["/api/og"],
  },
};

/** /journal — the index. Real routes (not overlays) for crawlable articles. */
export default async function JournalPage() {
  // Convex-only (journal cutover): published-desc order + cover merge.
  const res = await shadowJournalList(createServerConvexClient()!, 24);
  const cards = res.posts.map((p) => ({
    ...p,
    id: p.id ?? p.slug,
    tags: p.tags,
    publishedAt: p.publishedAt,
  }));

  // Blog JSON-LD — list of BlogPostings for crawlers.
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Prother Journal",
    description:
      "Guides, evaluation playbooks, and ecosystem trends from Prother. Find the right AI tool.",
    blogPost: cards.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      author: { "@type": "Organization", name: p.author },
      datePublished: p.publishedAt,
      url: `/journal/${encodeURIComponent(p.slug)}`,
    })),
  };

  const journalBarOn = await placementEnabled("journal_bar");

  return (
    <div className="pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <JournalIndex
        initialPosts={cards}
        breadcrumbs={
          <>
            <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Journal" }]} />
            {journalBarOn && (
              <AdSlot placement="journal_bar" variant="bar" className="mt-6" />
            )}
          </>
        }
      />
    </div>
  );
}
