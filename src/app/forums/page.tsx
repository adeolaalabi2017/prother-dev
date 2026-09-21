import type { Metadata } from "next";
import { ForumIndex } from "@/components/prother/forum-index";
import { forumListPayload } from "@/lib/forum";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forums — discuss building AI products | Prother",
  description:
    "Ask, share, and compare notes with the makers behind the launches: launch timing, pricing, vibecoding workflows, show-and-tell, and new-member intros.",
  keywords: [
    "AI product forum",
    "maker community",
    "AI launch discussion",
    "vibecoding",
    "Prother forums",
  ],
  openGraph: {
    title: "Prother Forums — compare notes with the launch crowd",
    description:
      "Ask, share, and compare notes with the makers behind the launches: timing, workflows, and what actually happened.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prother Forums — compare notes with the launch crowd",
    description:
      "Ask, share, and compare notes with the makers behind the launches.",
    images: ["/api/og"],
  },
};

/** /forums — the index. Real route (not overlay), mirrors the /journal pattern. */
export default async function ForumsPage() {
  // SSR the default view (all topics, hot) so the first paint has content;
  // the client shell re-fetches with the viewer's voterKey after mount.
  const initial = await forumListPayload("all", "hot");

  return (
    <div className="bg-ink pb-16 md:pb-0">
      <ForumIndex initial={initial} />
    </div>
  );
}
