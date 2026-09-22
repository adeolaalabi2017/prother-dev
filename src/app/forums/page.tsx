import type { Metadata } from "next";
import { ForumIndex } from "@/components/prother/forum-index";
import { AdSlot } from "@/components/prother/ad-slot";
import { forumListPayload } from "@/lib/forum";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { siteUrl } from "@/lib/site-url";
import { placementEnabled } from "@/lib/ad-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forums — discuss building AI products | Prother",
  description:
    "Ask, share, and compare notes with the people building and buying AI tools: evaluating tools, pricing, vibecoding workflows, show-and-tell, and new-member intros.",
  keywords: [
    "AI product forum",
    "maker community",
    "AI tool discussion",
    "vibecoding",
    "Prother forums",
  ],
  openGraph: {
    title: "Prother Forums — compare notes with the AI builder crowd",
    description:
      "Ask, share, and compare notes with the people building and buying AI tools: workflows, pricing, and what actually happened.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prother Forums — compare notes with the AI builder crowd",
    description:
      "Ask, share, and compare notes with the people building and buying AI tools.",
    images: ["/api/og"],
  },
};

/** /forums — the index. Real route (not overlay), mirrors the /journal pattern. */
export default async function ForumsPage() {
  // SSR the default view (all topics, hot) so the first paint has content;
  // the client shell re-fetches with the viewer's voterKey after mount.
  const initial = await forumListPayload("all", "hot");

  // ItemList over the SSR'd hot threads — gives crawlers thread discovery
  // straight from the index page (thread pages carry DiscussionForumPosting).
  const base = siteUrl();
  const forumsBannerOn = await placementEnabled("directory_banner");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hot forum threads",
    itemListElement: initial.threads.slice(0, 25).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/forums/${t.slug}`,
      name: t.title,
    })),
  };

  return (
    <div className="bg-ink pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ForumIndex
        initial={initial}
        breadcrumbs={<Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Forums" }]} />}
        sponsorSlot={
          forumsBannerOn ? (
            <AdSlot placement="directory_banner" variant="bar" />
          ) : undefined
        }
      />
    </div>
  );
}
