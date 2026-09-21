import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin, ShieldX } from "lucide-react";
import { getForumThreadDetail, isForumThreadHidden } from "@/lib/forum";
import { clamp } from "@/lib/og";
import { FORUM_TOPIC_LABELS } from "@/lib/forum-topics";
import {
  ForumThreadActions,
  ForumTime,
} from "@/components/prother/forum-thread-actions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getForumThreadDetail(slug);
  if (!detail) {
    // Hidden threads keep the URL alive (200 + noindex) with a generic title.
    if (await isForumThreadHidden(slug)) {
      return {
        title: "Thread removed | Prother Forums",
        robots: { index: false, follow: false },
      };
    }
    return {};
  }

  const title = `${detail.thread.title} | Prother Forums`;
  const description = clamp(detail.thread.body, 200);
  return {
    title,
    description,
    alternates: { canonical: `/forums/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: detail.thread.createdAt,
      authors: [detail.thread.author],
      siteName: "Prother",
      images: [{ url: "/api/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/api/og"],
    },
  };
}

/** /forums/[slug] — the real, crawlable thread page (server-fetched via db). */
export default async function ForumThreadPage({ params }: Params) {
  const { slug } = await params;
  const detail = await getForumThreadDetail(slug);
  if (!detail) {
    // Moderated thread: stay 200 + noindex (metadata above), show a notice
    // instead of the body/replies. Never leak the removed content.
    if (await isForumThreadHidden(slug)) {
      return (
        <div className="bg-ink pb-16 md:pb-0">
          <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
            <Link
              href="/forums"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-ember"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back to Forums
            </Link>
            <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <span
                aria-hidden
                className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-white/[0.03]"
              >
                <ShieldX className="size-5 text-white/45" />
              </span>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Moderation
              </p>
              <p className="text-sm text-white/70">
                This thread was removed by moderators.
              </p>
            </div>
          </article>
        </div>
      );
    }
    notFound();
  }

  const { thread, replies } = detail;
  const topicLabel = FORUM_TOPIC_LABELS[thread.topic];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread.title,
    articleSection: topicLabel,
    author: { "@type": "Person", name: thread.author },
    publisher: { "@type": "Organization", name: "Prother" },
    datePublished: thread.createdAt,
    dateModified: thread.updatedAt,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: thread.votes,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: replies.length,
      },
    ],
    mainEntityOfPage: `/forums/${encodeURIComponent(thread.slug)}`,
  };

  return (
    <div className="bg-ink pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
        {/* back */}
        <Link
          href="/forums"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] text-white/45 uppercase transition-colors hover:text-ember"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to Forums
        </Link>

        {/* header */}
        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-ember uppercase">
              {topicLabel}
            </span>
            {thread.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/55 uppercase">
                <Pin className="size-3" aria-hidden />
                Pinned
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl">
            {thread.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wider text-white/45 uppercase">
            <span className="text-ember">{thread.author}</span>
            <span aria-hidden className="text-white/25">
              ·
            </span>
            <ForumTime iso={thread.createdAt} />
          </div>
        </header>

        {/* body — server-rendered, author text preserved verbatim */}
        <div className="mt-8 text-[15px] leading-relaxed whitespace-pre-line text-white/80 sm:text-base">
          {thread.body}
        </div>

        {/* votes + replies + composer (client) */}
        <ForumThreadActions
          slug={thread.slug}
          threadId={thread.id}
          threadTitle={thread.title}
          initialVotes={thread.votes}
          replies={replies}
        />
      </article>
    </div>
  );
}
