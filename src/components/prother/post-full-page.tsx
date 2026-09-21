"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, Eye, Feather } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";
import { FullPageShell, PageError, PageSkeleton } from "./page-shell";

/**
 * Journal article FULL PAGE — the former PostReader dialog ported into
 * a FullPageShell (proper full-page reading experience, no floating panel).
 * All logic is preserved: derived loading state, /api/blog/[slug] fetch,
 * one view ping per slug, document.title + meta description sync,
 * BlogPosting JSON-LD inject/remove, copy-link share (/journal/<slug>),
 * related posts, and tag chips.
 */

type FullPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  coverEmoji: string;
  coverGradient: string;
  author: string;
  readingMinutes: number;
  views: number;
  publishedAt: string | null;
};

type RelatedPost = {
  slug: string;
  title: string;
  coverEmoji: string;
  coverGradient: string;
  readingMinutes: number;
  category: string;
};

function dateLabel(iso: string | null): string {
  if (!iso) return "Unpublished";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function PostFullPage() {
  const slug = useExplorer((s) => s.postSlug);
  const closePost = useExplorer((s) => s.closePost);
  const openPost = useExplorer((s) => s.openPost);

  const [post, setPost] = useState<FullPost | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const viewedFor = useRef<string | null>(null);

  // Derived: the fetched article doesn't match the requested slug yet → loading.
  const error = slug !== null && failedFor === slug;
  const loading = slug !== null && !error && (post === null || post.slug !== slug);

  // Legacy deep links: ?post=<slug> / #post=<slug> boot the page if the
  // DeepLinkHost didn't already replay it into the store.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const p =
      sp.get("post") ??
      (window.location.hash.startsWith("#post=")
        ? decodeURIComponent(window.location.hash.slice(6))
        : null);
    if (p && useExplorer.getState().postSlug !== p) openPost(p);
  }, [openPost]);

  // Fetch the post (state updates only in async callbacks — no sync resets;
  // stale content is masked by the derived loading flag above).
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    fetch(`/api/blog/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<{ post: FullPost; related: RelatedPost[] }>;
      })
      .then((d) => {
        if (!alive) return;
        setPost(d.post);
        setRelated(d.related);
        setFailedFor(null);
      })
      .catch(() => {
        if (alive) setFailedFor(slug);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  // View ping — once per open per slug.
  useEffect(() => {
    if (!slug || viewedFor.current === slug) return;
    viewedFor.current = slug;
    fetch(`/api/blog/${encodeURIComponent(slug)}`, { method: "POST" }).catch(
      () => {}
    );
  }, [slug]);

  // SEO: title + meta description + JSON-LD while open; restore on close.
  useEffect(() => {
    if (!slug || !post) return;
    const prevTitle = document.title;
    document.title = `${post.title} | Prother Journal`;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const prevDesc = meta?.content ?? null;
    if (meta) meta.content = post.excerpt;

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "prother-post-jsonld";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Prother" },
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      articleSection: post.category,
      keywords: post.tags.join(", "),
      url: `${window.location.origin}/journal/${encodeURIComponent(post.slug)}`,
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== null) meta.content = prevDesc;
      document.getElementById("prother-post-jsonld")?.remove();
    };
  }, [slug, post]);

  const html = useMemo(() => (post ? renderMarkdown(post.body) : ""), [post]);

  if (!slug) return null;

  const breadcrumb = [
    { label: "Home", onClick: () => closePost() },
    { label: "Journal" },
  ];

  // Failure — stays on the page as a proper error state; closePost is wired
  // to the shell's ✕ / Escape and the "back to feed" action.
  if (error) {
    return (
      <FullPageShell
        breadcrumb={breadcrumb}
        onClose={closePost}
        ariaLabel="Journal article"
        kicker="Prother Journal"
      >
        <PageError
          title="Post unavailable"
          message="This article may be unpublished or removed."
          action={
            <button
              type="button"
              onClick={() => closePost()}
              className="rounded-lg border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-ember/50 hover:text-ember"
            >
              Back to feed
            </button>
          }
        />
      </FullPageShell>
    );
  }

  return (
    <FullPageShell
      breadcrumb={breadcrumb}
      onClose={closePost}
      ariaLabel="Journal article"
      kicker={post ? `Prother Journal · ${post.category}` : "Prother Journal"}
      shareUrl={post ? `/journal/${encodeURIComponent(post.slug)}` : undefined}
    >
      {loading && <PageSkeleton />}

      {post && (
        <article className="mt-4">
          {/* big header */}
          <header>
            <div className="flex items-start gap-4">
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
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-wider text-white/45 uppercase">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3" aria-hidden />
                {dateLabel(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3" aria-hidden />
                {post.readingMinutes} min read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Feather className="size-3" aria-hidden />
                {post.author}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-3" aria-hidden />
                {post.views} views
              </span>
            </div>
          </header>

          {/* body */}
          <div
            className="post-body mt-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* tags */}
          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] tracking-wider text-white/50 uppercase"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* related */}
          {related.length > 0 && (
            <section aria-label="Keep reading" className="mt-10 border-t border-white/10 pt-6">
              <p className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase">
                Keep reading
              </p>
              <ul role="list" className="mt-4 grid gap-3 sm:grid-cols-3">
                {related.map((r) => (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onClick={() => openPost(r.slug)}
                      aria-label={`Read ${r.title}`}
                      className="group h-full w-full rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-left transition-colors hover:border-ember/40"
                    >
                      <span aria-hidden className="text-lg">
                        {r.coverEmoji}
                      </span>
                      <p className="mt-2 line-clamp-2 text-xs leading-snug font-semibold text-white/85 group-hover:text-ember">
                        {r.title}
                      </p>
                      <p className="mt-1.5 font-mono text-[9px] tracking-wider text-white/35 uppercase">
                        {r.readingMinutes} min · {r.category}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* permalink footer */}
          <footer className="mt-10 border-t border-white/10 pt-6">
            <p className="font-mono text-[10px] leading-relaxed tracking-wider text-white/25 uppercase">
              Published {dateLabel(post.publishedAt)} · {post.views} views ·
              Permalink: /journal/{post.slug}
            </p>
          </footer>
        </article>
      )}
    </FullPageShell>
  );
}
