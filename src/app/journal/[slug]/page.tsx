import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Feather } from "lucide-react";
import { db } from "@/lib/prother";
import { clamp } from "@/lib/og";
import { postCoversByIds } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { PostViewPing } from "@/components/prother/post-view-ping";
import { AdSlot } from "@/components/prother/ad-slot";
import { placementEnabled } from "@/lib/ad-config";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function getPublishedPost(slug: string) {
  const post = await db.post.findUnique({ where: { slug } });
  if (!post || post.status !== "published") return null;
  return post;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const title = post.seoTitle || `${post.title} | Prother Journal`;
  const description = clamp(post.seoDescription || post.excerpt, 200);
  return {
    title,
    description,
    alternates: { canonical: `/journal/${post.slug}` },
    keywords: post.keywords
      ? post.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author],
      images: [
        { url: `/api/og?post=${encodeURIComponent(post.slug)}`, width: 1200, height: 630 },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?post=${encodeURIComponent(post.slug)}`],
    },
  };
}

function dateLabel(iso: Date | null): string {
  if (!iso) return "Unpublished";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** /journal/[slug] — the real, crawlable article page. */
export default async function JournalArticlePage({ params }: Params) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const html = renderMarkdown(post.body);
  const tags = post.tags ? post.tags.split("|").filter(Boolean) : [];
  const journalBarOn = await placementEnabled("journal_bar");
  // POST-boot cover column → raw SQL merge (lib/media.ts; never in a select).
  const coverUrl = (await postCoversByIds([post.id])).get(post.id) ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "Prother" },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    articleSection: post.category,
    keywords: post.keywords ?? tags.join(", "),
    image: `/api/og?post=${encodeURIComponent(post.slug)}`,
    mainEntityOfPage: `/journal/${encodeURIComponent(post.slug)}`,
  };

  return (
    <div className="bg-ink pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostViewPing slug={post.slug} />

      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
        {/* breadcrumbs — visible nav + BreadcrumbList JSON-LD, above the H1 */}
        <div className="mb-6">
          <Breadcrumbs
            trail={[
              { name: "Home", href: "/" },
              { name: "Journal", href: "/journal" },
              { name: post.title },
            ]}
          />
        </div>

        {/* back */}
        <Link
          href="/journal"
          className="inline-flex items-center gap-1.5 font-mono text-sm tracking-[0.2em] text-white/60 uppercase transition-colors hover:text-ember"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to Journal
        </Link>

        {/* header */}
        <header className="mt-8">
          <p className="font-mono text-xs tracking-[0.3em] text-ember uppercase">
            Prother Journal
            <span className="text-white/55"> · {post.category}</span>
          </p>

          <div className="mt-4 flex items-start gap-4">
            <div
              aria-hidden
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-inner",
                post.coverGradient
              )}
            >
              {post.coverEmoji}
            </div>
            <h1 className="min-w-0 text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl">
              {post.title}
            </h1>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wider text-white/60 uppercase">
            <span className="inline-flex items-center gap-1.5">
              <Feather className="size-3" aria-hidden />
              {post.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3" aria-hidden />
              {dateLabel(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3" aria-hidden />
              {post.readingMinutes} min read
            </span>
          </div>

          {/* Uploaded cover art (Task 34) — hero banner; the emoji tile above
              stays as the fallback when the post has no image. */}
          {coverUrl && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <img
                src={coverUrl}
                alt={`${post.title} cover`}
                className="aspect-video w-full object-cover"
              />
            </div>
          )}
        </header>

        {/* Journal sponsorship — named at the top of the issue (one sponsor
            per slot; house creative fills it when unsold). */}
        {journalBarOn && (
          <AdSlot placement="journal_bar" variant="bar" className="mt-10" />
        )}

        {/* body */}
        <div
          className="post-body mt-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* tags */}
        {tags.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-white/10 pt-6">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs tracking-wider text-white/50 uppercase"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* footer */}
        <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-xs tracking-wider text-white/55 uppercase">
            Published {dateLabel(post.publishedAt)} · {post.views} views
          </p>
          <Link
            href="/journal"
            className="inline-flex items-center gap-1.5 font-mono text-sm tracking-[0.2em] text-white/60 uppercase transition-colors hover:text-ember"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            More from the Journal
          </Link>
        </footer>
      </article>
    </div>
  );
}
