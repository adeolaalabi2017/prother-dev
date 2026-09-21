import type { Metadata } from "next";
import { JournalIndex } from "@/components/prother/journal-index";
import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Journal — Prother",
  description:
    "Launch playbooks, ranking explainers, and weekly ecosystem data from Prother — written by the people who watch every AI launch cross the feed.",
  keywords: [
    "AI launch playbook",
    "AI product launch",
    "launch journal",
    "Prother journal",
    "how to launch AI tools",
  ],
  openGraph: {
    title: "The Prother Journal — Notes from the launch layer",
    description:
      "Launch playbooks, ranking explainers, and weekly ecosystem data from Prother — written by the people who watch every AI launch cross the feed.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Prother Journal — Notes from the launch layer",
    description:
      "Launch playbooks, ranking explainers, and weekly ecosystem data from Prother.",
    images: ["/api/og"],
  },
  alternates: {
    types: { "application/rss+xml": "/api/rss?kind=journal" },
  },
};

/** /journal — the index. Real routes (not overlays) for crawlable articles. */
export default async function JournalPage() {
  const posts = await db.post.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 24,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      tags: true,
      coverEmoji: true,
      coverGradient: true,
      author: true,
      readingMinutes: true,
      publishedAt: true,
    },
  });

  const cards = posts.map((p) => ({
    ...p,
    tags: p.tags ? p.tags.split("|").filter(Boolean) : [],
    publishedAt: p.publishedAt?.toISOString() ?? null,
  }));

  // Blog JSON-LD — list of BlogPostings for crawlers.
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Prother Journal",
    description:
      "Launch playbooks, ranking explainers, and ecosystem data from Prother — where AI products get discovered.",
    blogPost: cards.slice(0, 10).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      author: { "@type": "Organization", name: p.author },
      datePublished: p.publishedAt,
      url: `/journal/${encodeURIComponent(p.slug)}`,
    })),
  };

  return (
    <div className="pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <JournalIndex initialPosts={cards} />
    </div>
  );
}
